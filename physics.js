/** Small, deterministic circle solver used by the orchard game. */
export class FruitWorld {
  constructor({ width = 600, height = 720, fruits, onMerge, onDanger, onGameOver, random = Math.random, mode = 'classic' } = {}) {
    if (!fruits?.length) throw new TypeError('FruitWorld needs fruit definitions.');
    this.width = width;
    this.height = height;
    this.maxLine = 90;
    this.fruits = fruits;
    this.mode = ['classic', 'apple', 'free', 'water', 'space', 'watermelon', 'timed', 'challenge'].includes(mode) ? mode : 'classic';
    this.random = typeof random === 'function' ? random : Math.random;
    this.onMerge = onMerge || (() => {});
    this.onDanger = onDanger || (() => {});
    this.onGameOver = onGameOver || (() => {});
    this.reset();
  }

  reset() {
    this.bodies = [];
    this.score = 0;
    this.state = 'playing';
    this.time = 0;
    this.danger = 0;
    this.combo = 0;
    this.lastMerge = -Infinity;
    this.lastDrop = -Infinity;
    this.nextId = 1;
    this.tick = 0;
    this.shakeRemaining = 0;
    this.shakeElapsed = 0;
    this.shakeContainUntil = 0;
    this.protectedUntil = 0;
    this.protectionKind = null;
    this.onDanger(0);
  }

  /** JSON-safe simulation state; visual assets, callbacks, and random sources stay local. */
  serialize() {
    return {
      version: 2,
      width: this.width,
      height: this.height,
      time: this.time,
      score: this.score,
      state: this.state,
      mode: this.mode,
      combo: this.combo,
      lastMerge: Number.isFinite(this.lastMerge) ? this.lastMerge : null,
      lastDrop: Number.isFinite(this.lastDrop) ? this.lastDrop : null,
      tick: this.tick,
      nextId: this.nextId,
      shakeRemaining: this.shakeRemaining,
      shakeElapsed: this.shakeElapsed,
      shakeContainUntil: this.shakeContainUntil,
      protectedUntil: this.protectedUntil,
      protectionKind: this.protectionKind,
      danger: this.danger,
      bodies: this.bodies.map(body => ({
        id: body.id, level: body.level, x: body.x, y: body.y,
        vx: body.vx, vy: body.vy, angle: body.angle, spin: body.spin, squash: body.squash,
        age: body.age, incoming: body.incoming, entered: body.entered, landed:body.landed,
        overflowTime: 0,
        mergedTick: body.mergedTick, special: body.special,
      })),
    };
  }

  /** Validate the entire snapshot before changing this world or notifying the UI. */
  restore(snapshot) {
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
    const counter = (value, min = 0) => Number.isSafeInteger(value) && value >= min && value < Number.MAX_SAFE_INTEGER;
    let restored;
    try {
      if (!record(snapshot) || ![1, 2].includes(snapshot.version)) return false;
      const legacy = snapshot.version === 1;
      if (legacy ? snapshot.width !== 520 || snapshot.height !== 650 : snapshot.width !== this.width || snapshot.height !== this.height) return false;
      const mode = legacy ? 'classic' : snapshot.mode;
      if (!['classic', 'apple', 'free', 'water', 'space', 'watermelon', 'timed', 'challenge'].includes(mode) ||
          !finite(snapshot.time, 0, 1e9) || !counter(snapshot.score) || !counter(snapshot.combo) || !counter(snapshot.tick) || !counter(snapshot.nextId, 1) ||
          !['playing', 'paused', 'over'].includes(snapshot.state) || !Array.isArray(snapshot.bodies) || snapshot.bodies.length > 300 ||
          !finite(snapshot.shakeRemaining, 0, (legacy ? .75 : 1) + 1e-9) || !finite(snapshot.shakeElapsed, 0, 1.1) ||
          !finite(snapshot.shakeContainUntil, 0, snapshot.time + (legacy ? 1.25 : 1.5) + 1e-9) ||
          !finite(snapshot.protectedUntil, 0, snapshot.time + (legacy ? 3.75 : 8) + 1e-9) || !finite(snapshot.danger, 0, legacy ? 3 : 2)) return false;
      const timestamp = value => value === null || finite(value, 0, snapshot.time + 1e-9);
      if (!timestamp(snapshot.lastMerge) || !timestamp(snapshot.lastDrop)) return false;
      const ids = new Set();
      const maxRadius = Math.max(...this.fruits.map(fruit => fruit.radius));
      const bodies = [];
      let maxId = 0;
      for (const body of snapshot.bodies) {
        if (!record(body) || !counter(body.id, 1) || ids.has(body.id) || !Number.isInteger(body.level) || body.level < 0 || body.level >= this.fruits.length || !this.fruits[body.level] ||
            typeof body.incoming !== 'boolean' || typeof body.entered !== 'boolean' || (body.incoming && body.entered) ||
            (body.landed!==undefined&&typeof body.landed!=='boolean') ||
            typeof body.special !== 'boolean' || (body.special && !this.isApple(body.level)) ||
            !finite(body.age, 0, 1e9) || !finite(body.overflowTime, 0, legacy ? 3 : 2) ||
            (!legacy && !finite(body.squash, 0, 1)) ||
            !finite(body.vx, -700, 700) || !finite(body.vy, -700, 1100) ||
            !finite(body.spin, -.8 - 1e-9, .8 + 1e-9) || !finite(body.angle, -1e6, 1e6) ||
            !Number.isSafeInteger(body.mergedTick) || body.mergedTick < -1 || body.mergedTick > snapshot.tick) return false;
        const r = this.fruits[body.level].radius;
        // An overfull pile may extend above the basket. The bound still excludes
        // absurd coordinates while allowing every circle in a 300-body stack.
        if (!finite(body.x, 8 + r - 1e-7, snapshot.width - 8 - r + 1e-7) ||
            !finite(body.y, -snapshot.height - maxRadius * 2 * 300, snapshot.height - 8 - r + 1e-7)) return false;
        const x = legacy ? Math.max(8 + r, Math.min(this.width - 8 - r, body.x * this.width / 520)) : body.x;
        const y = legacy ? Math.min(this.height - 8 - r, body.y * this.height / 650) : body.y;
        ids.add(body.id);
        maxId = Math.max(maxId, body.id);
        // Never spread an untrusted body, use its supplied radius, or retain extras.
        bodies.push({
          id: body.id, level: body.level, r, x, y,
          vx: body.vx, vy: body.vy, angle: body.angle, spin: body.spin, squash: legacy ? 0 : body.squash,
          age: body.age, incoming: body.incoming, entered: body.entered,landed:body.landed===undefined?!body.incoming:body.landed,
          overflowTime: 0, mergedTick: body.mergedTick, special: body.special,
        });
      }
      if (snapshot.nextId <= maxId) return false;
      const hasSafetyKind = Object.hasOwn(snapshot, 'protectionKind');
      let protectionKind = hasSafetyKind ? snapshot.protectionKind : null;
      if (![null, 'shake', 'revive'].includes(protectionKind)) return false;
      let protectedUntil = snapshot.protectedUntil;
      if (hasSafetyKind) {
        const maximum = protectionKind === 'shake' ? 4 : protectionKind === 'revive' ? 3 : 0;
        if (protectedUntil > snapshot.time + maximum + 1e-9) return false;
      } else {
        // Old saves also used this deadline for removed powers. Keep only the
        // demonstrable four-second shake window, never an obsolete item effect.
        protectedUntil = Math.min(protectedUntil, snapshot.shakeContainUntil > 0 ? snapshot.shakeContainUntil + 2.5 : 0);
        protectionKind = protectedUntil > snapshot.time ? 'shake' : null;
      }
      restored = {
        bodies, time: snapshot.time, score: snapshot.score, state: snapshot.state, mode,
        combo: snapshot.combo, lastMerge: snapshot.lastMerge === null ? -Infinity : snapshot.lastMerge,
        lastDrop: snapshot.lastDrop === null ? -Infinity : snapshot.lastDrop,
        tick: snapshot.tick, nextId: snapshot.nextId, shakeRemaining: snapshot.shakeRemaining,
        shakeElapsed: snapshot.shakeElapsed, shakeContainUntil: snapshot.shakeContainUntil,
        protectedUntil, protectionKind, danger: snapshot.state === 'over' ? 1 : 0,
      };
    } catch {
      return false;
    }
    Object.assign(this, restored);
    this.onDanger(this.danger);
    return true;
  }

  get shakeProtected() {
    return this.time < this.protectedUntil;
  }

  get waterSurface() {
    return this.height * .42;
  }

  get spaceCrowded() {
    return this.mode === 'space' && this.bodies.length >= 100;
  }

  get overflowProtected() {
    return this.shakeProtected;
  }

  setMode(id) {
    if (!['classic', 'apple', 'free', 'water', 'space', 'watermelon', 'timed', 'challenge'].includes(id)) return false;
    this.mode = id;
    this.resetOverflow();
    return true;
  }

  get isOverflowing() {
    return !this.overflowProtected && this.bodies.some(body => body.overflowTime >= 1.35);
  }

  crossesMax(body) {
    return body.landed && body.age > .7 && Math.hypot(body.vx,body.vy) < 85 && this.time-this.lastMerge > .45 && body.y - body.r < this.maxLine - 5;
  }

  finishIfOverflowing() {
    if (this.state !== 'playing' || !this.isOverflowing) return false;
    this.state = 'over';
    this.danger = 1;
    this.onDanger(1);
    this.onGameOver();
    return true;
  }

  resetOverflow() {
    for (const body of this.bodies) body.overflowTime = 0;
    this.danger = 0;
    this.onDanger(0);
  }

  protect(seconds = 3, kind = 'revive') {
    if (!['playing', 'paused'].includes(this.state) || typeof seconds !== 'number' || !Number.isFinite(seconds)) return false;
    if (!['shake', 'revive'].includes(kind)) return false;
    const duration = Math.max(.1, Math.min(kind === 'shake' ? 4 : 3, seconds));
    if (this.time + duration >= this.protectedUntil) {
      this.protectedUntil = this.time + duration;
      this.protectionKind = kind;
    }
    this.resetOverflow();
    return true;
  }

  markEntered(body) {
    if (body.incoming && body.y - body.r >= this.maxLine) {
      body.entered = true;
      body.incoming = false;
    }
  }

  isApple(level) {
    const fruit = this.fruits[level];
    return fruit?.id === 'apple' || /사과|apple/i.test(fruit?.name || '');
  }

  makeBody(level, x, y, options = {}) {
    const r = this.fruits[level].radius;
    return {
      id: this.nextId++, level, r,
      x: Math.max(8 + r, Math.min(this.width - 8 - r, x)),
      y, vx: 0, vy: 0, angle: 0, spin: 0, age: 0, squash: 0,
      // A falling fruit becomes eligible for overflow only after real contact.
      incoming: false, entered: y - r >= this.maxLine, overflowTime: 0,
      mergedTick: -1, ...options,
      landed:typeof options.landed==='boolean'?options.landed:options.incoming!==true,
      special: this.isApple(level) && options.special === true,
    };
  }

  drop(level, x, { special = false } = {}) {
    if (this.state !== 'playing' || this.time - this.lastDrop < 0.35) return false;
    if (this.bodies.length >= (this.mode === 'space' ? 110 : 300)) return false;
    if (!Number.isInteger(level) || !this.fruits[level] || !Number.isFinite(x)) return false;
    if (this.finishIfOverflowing()) return false;
    this.bodies.push(this.makeBody(level, x, 45, {
      vy: this.mode === 'space' ? 120 : 25,
      vx: this.mode === 'space' ? Math.sin(this.nextId * 2.1) * 14 : 0,
      incoming: true, entered: false, special,
    }));
    this.lastDrop = this.time;
    return true;
  }

  shake() {
    if (this.state !== 'playing' || !this.bodies.length) return false;
    this.shakeRemaining = 1;
    this.shakeElapsed = 0;
    this.shakeContainUntil = this.time + 1.5;
    // The one-second shake and the following three seconds are fully protected.
    this.protect(4, 'shake');
    this.bodies.forEach((body, index) => {
      // Strong opposing impulses plus sustained oscillation visibly rearrange a pile.
      const direction = index % 2 === 0 ? 1 : -1;
      body.vx = direction * (450 + (index * 53) % 201);
      body.vy = -(520 + (index * 29) % 131);
      body.spin = direction * (0.4 + index % 5 * 0.1);
      this.bound(body, 0, false);
    });
    return true;
  }

  removeFruit(id) {
    if (this.state !== 'playing') return null;
    const index = this.bodies.findIndex(body => body.id === id);
    if (index < 0) return null;
    const [removed] = this.bodies.splice(index, 1);
    this.resetOverflow();
    return removed;
  }

  smallestFruits(count = 3) {
    if (!Number.isFinite(count)) return [];
    const limit = Math.max(0, Math.min(300, Math.floor(count)));
    return [...this.bodies].sort((a, b) => a.r - b.r || a.level - b.level || a.id - b.id).slice(0, limit);
  }

  removeSmallest(count = 3) {
    if (!['playing', 'paused', 'over'].includes(this.state)) return [];
    const removed = this.smallestFruits(count);
    if (!removed.length) return [];
    const ids = new Set(removed.map(body => body.id));
    this.bodies = this.bodies.filter(body => !ids.has(body.id));
    this.resetOverflow();
    return removed;
  }

  revive() {
    if (this.state !== 'over') return false;
    this.state = 'playing';
    this.protect(3, 'revive');
    return true;
  }

  update(dt) {
    if (this.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    const steps = Math.max(1, Math.ceil(dt * 120));
    const h = dt / steps;
    this.tick++;
    for (let step = 0; step < steps && this.state === 'playing'; step++) this.step(h);
    if (this.state !== 'playing') return;
    if (!this.finishIfOverflowing()) this.onDanger(0);
  }

  step(dt) {
    if (this.state !== 'playing') return;
    this.time += dt;
    const shaking = this.shakeRemaining > 0;
    if (shaking) {
      this.shakeElapsed += dt;
      this.shakeRemaining = Math.max(0, this.shakeRemaining - dt);
    }
    for (const body of this.bodies) {
      body.age += dt;
      body.squash *= Math.exp(-8 * dt);
      let gravity = 1100, drag = .23;
      if (this.mode === 'water') {
        const submerged = Math.max(0, Math.min(1, (body.y + body.r - this.waterSurface) / (2 * body.r)));
        gravity = 550 - 500 * submerged + Math.sin(this.time * 1.1 + body.id) * 12 * submerged;
        drag = .23 + 1.97 * submerged;
        body.vx += Math.sin(this.time * .8 + body.id * .65) * 34 * submerged * dt;
      } else if (this.mode === 'space') {
        gravity = 8 + Math.sin(this.time * .55 + body.id) * 3;
        drag = .12;
        body.vx += Math.sin(this.time * .45 + body.id * .7) * 4.5 * dt;
      }
      if (shaking) {
        const envelope = 0.4 + 0.6 * this.shakeRemaining;
        body.vx += Math.sin(this.shakeElapsed * Math.PI * 10 + body.id % 3 * 0.5) * 2200 * envelope * dt;
      }
      const airDrag = Math.exp(-drag * dt);
      body.vy += gravity * dt;
      body.vx *= airDrag;
      body.vy *= airDrag;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.spin * dt;
      body.spin *= Math.exp(-(body.landed ? 3 : .6) * dt);
      this.bound(body, dt);
      this.markEntered(body);
    }

    const merges = [];
    const reserved = new Set();
    for (let iteration = 0; iteration < 7; iteration++) {
      for (let i = 0; i < this.bodies.length; i++) {
        const a = this.bodies[i];
        for (let j = i + 1; j < this.bodies.length; j++) {
          const b = this.bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const sum = a.r + b.r;
          const distance2 = dx * dx + dy * dy;
          if (distance2 > sum * sum) continue;
          a.landed=true;b.landed=true;

          if (iteration === 0 && a.level === b.level && a.level < this.fruits.length - 1 &&
              a.mergedTick !== this.tick && b.mergedTick !== this.tick &&
              !reserved.has(a.id) && !reserved.has(b.id)) {
            reserved.add(a.id);
            reserved.add(b.id);
            merges.push([a, b]);
          }

          const distance = Math.sqrt(distance2);
          // Identical centers are possible after a merge. A stable normal avoids NaN.
          const nx = distance > 0.00001 ? dx / distance : (a.id < b.id ? 1 : -1);
          const ny = distance > 0.00001 ? dy / distance : 0;
          const invA = 1 / (a.r * a.r);
          const invB = 1 / (b.r * b.r);
          const invSum = invA + invB;
          const correction = Math.max(0, sum - distance - 0.25) * 0.86 / invSum;
          a.x -= correction * invA * nx;
          a.y -= correction * invA * ny;
          b.x += correction * invB * nx;
          b.y += correction * invB * ny;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const closing = rvx * nx + rvy * ny;
          if (closing < 0) {
            const restitution = closing < -90 ? 0.38 : 0;
            if (closing < -60) {
              const squash = Math.min(1, -closing / 650);
              a.squash = Math.max(a.squash, squash);
              b.squash = Math.max(b.squash, squash);
            }
            const impulse = -(1 + restitution) * closing / invSum;
            a.vx -= impulse * invA * nx;
            a.vy -= impulse * invA * ny;
            b.vx += impulse * invB * nx;
            b.vy += impulse * invB * ny;
            const tx = -ny;
            const ty = nx;
            const slip = rvx * tx + rvy * ty;
            const friction = Math.max(-impulse * 0.23, Math.min(impulse * 0.23, -slip / invSum));
            a.vx -= friction * invA * tx;
            a.vy -= friction * invA * ty;
            b.vx += friction * invB * tx;
            b.vy += friction * invB * ty;
            if (Math.abs(slip) > 25) {
              if (Math.abs(a.vx) > 35) a.spin = Math.max(-0.8, Math.min(0.8, a.spin + friction * invA * 0.0003));
              if (Math.abs(b.vx) > 35) b.spin = Math.max(-0.8, Math.min(0.8, b.spin - friction * invB * 0.0003));
            }
          }
        }
      }
      for (const body of this.bodies) this.bound(body, dt, false);
    }

    for (const body of this.bodies) this.markEntered(body);
    // Resolve touching pairs before checking overflow, as a merge may clear them.
    if (merges.length) {
      this.bodies = this.bodies.filter(body => !reserved.has(body.id));
      for (const [a, b] of merges) {
        const level = a.level + 1;
        const x = (a.x + b.x) * 0.5;
        const y = Math.min(this.height - 8 - this.fruits[level].radius, (a.y + b.y) * 0.5);
        const entered = a.entered || b.entered || y - this.fruits[level].radius >= this.maxLine;
        const incoming = !entered && a.incoming && b.incoming;
        const specialMerged = this.isApple(a.level) && (a.special === true || b.special === true);
        const mergedBody = this.makeBody(level, x, y, {
          vx: (a.vx + b.vx) * 0.35,
          vy: Math.min(-35, (a.vy + b.vy) * 0.35),
          angle: (a.angle + b.angle) * 0.5,
          spin: (a.spin + b.spin) * 0.5,
          // Combining a fresh drop with a blocked inbound must not restart its
          // entrance exemption and let repeated drops postpone game over.
          age: incoming ? Math.max(a.age, b.age) : Math.max(0.6, Math.min(a.age, b.age)),
          entered, incoming,
          landed:a.landed||b.landed,
          mergedTick: this.tick,
          special: this.isApple(level) && this.random() < 0.06,
        });
        this.bound(mergedBody, 0, false);
        this.bodies.push(mergedBody);
        const points = this.fruits[level].points ?? (level + 1) * (level + 2) / 2;
        this.score += points;
        this.combo = this.time - this.lastMerge < 1.3 ? this.combo + 1 : 1;
        this.lastMerge = this.time;
        this.onMerge({ mergeId:mergedBody.id, level, x: mergedBody.x, y: mergedBody.y, points, combo: this.combo, specialMerged });
      }
    }
    for (const body of this.bodies) {
      if (!shaking && Math.abs(body.vx) < 12 && Math.abs(body.vy) < 20) {
        body.spin = 0;
      } else if (Math.abs(body.spin) < 0.015) body.spin = 0;
    }
    if(this.blast){const {x,y}=this.blast;this.bodies=this.bodies.filter(b=>Math.hypot(b.x-x,b.y-y)>250+b.r);this.blast=null;this.protect(2,'revive');}
    for(const body of this.bodies) body.overflowTime = !this.overflowProtected && this.crossesMax(body) ? (body.overflowTime||0)+dt : Math.max(0,(body.overflowTime||0)-dt*3);
    const warning = Math.max(0,...this.bodies.map(body=>(body.overflowTime||0)/1.35));
    this.onDanger(Math.min(1,warning));
    this.finishIfOverflowing();
  }

  bound(body, dt, damp = true) {
    const left = 8 + body.r;
    const right = this.width - 8 - body.r;
    const floor = this.height - 8 - body.r;
    const spaceTop = this.mode === 'space' && body.entered;
    const top = body.r + (spaceTop ? 8 : 4);
    if ((spaceTop || this.time < this.shakeContainUntil) && body.y < top) {
      body.y = top;
      if (body.vy < 0) body.vy *= spaceTop ? -.38 : -.1;
    }
    if (body.x < left) {
      body.x = left;
      if (body.vx < 0) {
        body.squash = Math.max(body.squash, Math.min(1, -body.vx / 700));
        body.vx *= -.25;
      }
    }
    if (body.x > right) {
      body.x = right;
      if (body.vx > 0) {
        body.squash = Math.max(body.squash, Math.min(1, body.vx / 700));
        body.vx *= -.25;
      }
    }
    if (body.y > floor) {
      body.landed=true;
      body.y = floor;
      if (body.vy > 0) {
        if (body.vy > 100) body.squash = Math.max(body.squash, Math.min(1, body.vy / 700));
        body.vy = body.vy > 100 ? -body.vy * .22 : 0;
      }
      if (damp) {
        body.vx *= Math.exp(-5 * dt);
        if (Math.abs(body.vx) > 30) body.spin += (body.vx / body.r * 0.08 - body.spin) * Math.min(1, dt * 5);
      }
    }
    // Guard huge accumulated impulses when a large merge rearranges a tight stack.
    body.vx = Math.max(-700, Math.min(700, body.vx));
    body.vy = Math.max(-700, Math.min(1100, body.vy));
    body.spin = Math.max(-0.8, Math.min(0.8, body.spin));
  }
}
