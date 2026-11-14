/** Original, dependency-free fruit illustrations shared by the board and UI. */
export const FRUITS = [
  { id: 'cherry', name: '체리', radius: 16, color: '#ef6c76', points: 1 },
  { id: 'strawberry', name: '딸기', radius: 22, color: '#f17f85', points: 3 },
  { id: 'grape', name: '포도', radius: 28, color: '#aa8ac8', points: 6 },
  { id: 'orange', name: '오렌지', radius: 36, color: '#f3a64d', points: 10 },
  { id: 'apple', name: '사과', radius: 44, color: '#e97373', points: 15 },
  { id: 'pear', name: '배', radius: 53, color: '#e7d775', points: 21 },
  { id: 'peach', name: '복숭아', radius: 63, color: '#f2a2aa', points: 28 },
  { id: 'pineapple', name: '파인애플', radius: 74, color: '#efc360', points: 36 },
  { id: 'melon', name: '멜론', radius: 86, color: '#b7cf8f', points: 45 },
  { id: 'watermelon', name: '수박', radius: 100, color: '#72ab78', points: 55 },
  { id: 'secret', name: '용과', radius: 112, color: '#e66d9d', points: 100 },
  { id: 'starfruit', name: '스타프루트', radius: 121, color: '#eed263', points: 160 },
  { id: 'mangosteen', name: '망고스틴', radius: 130, color: '#8c5f9e', points: 240 },
  { id: 'celestial', name: '태양의 열매', radius: 140, color: '#f3ae54', points: 360 },
];

export const APPLE_LEVEL = 4;
export const PEAR_LEVEL = 5;
export const WATERMELON_LEVEL = 9;
export const SECRET_LEVEL = 10;
export const FINAL_LEVEL = FRUITS.length - 1;

const INK = '#314b3d';
const path = (d, fill, stroke = INK, width = 1.65, opacity = 1) => ({ tag: 'path', d, fill, stroke, width, opacity });
const ellipse = (cx, cy, rx, ry, fill, stroke = 'none', width = 1.65, opacity = 1) => ({ tag: 'ellipse', cx, cy, rx, ry, fill, stroke, width, opacity });
const leaf = (x = 0, y = -35, color = '#6c9b6d') => path(`M ${x} ${y} Q ${x + 5} ${y - 17} ${x + 24} ${y - 12} Q ${x + 20} ${y + 2} ${x} ${y} Z`, color);
const stem = (d = 'M 0 -33 Q -3 -42 4 -47') => path(d, 'none', '#546a43', 3.2);
const round = (fill, ry = 42) => ellipse(0, 4, 43, ry, fill, INK);
const shine = (x = -20, y = -17, rx = 7, ry = 10) => ellipse(x, y, rx, ry, '#fffdf0', 'none', 0, 0.33);
const face = (y = 10, wide = 1) => [
  ellipse(-11 * wide, y, 2.2, 3.1, INK), ellipse(11 * wide, y, 2.2, 3.1, INK),
  path(`M -4 ${y + 6} Q 0 ${y + 10} 4 ${y + 6}`, 'none', INK, 1.7),
  ellipse(-19 * wide, y + 6, 5, 2.5, '#f48582', 'none', 0, 0.46),
  ellipse(19 * wide, y + 6, 5, 2.5, '#f48582', 'none', 0, 0.46),
];

function starPath(points, outer, inner, offset = -Math.PI / 2) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const angle = offset + index * Math.PI / points;
    const radius = index % 2 ? inner : outer;
    return `${index ? 'L' : 'M'} ${Math.cos(angle) * radius} ${Math.sin(angle) * radius}`;
  }).join(' ') + ' Z';
}

function artwork(level) {
  const c = FRUITS[level].color;
  let s = [];
  if (level === 0) {
    s = [stem('M 0 -24 Q 10 -42 5 -48'), leaf(5, -37), round(c, 38),
      path('M 18 -29 Q 40 -15 35 15 Q 26 36 3 40', 'none', '#d85367', 4, 0.4), shine(-20, -12), ...face(9)];
  } else if (level === 1) {
    s = [path('M -40 -19 C -32 -40 31 -40 40 -19 C 47 3 21 37 4 45 Q 0 48 -4 45 C -21 37 -47 3 -40 -19 Z', c),
      path('M -29 -25 L -13 -30 L -15 -43 L 0 -34 L 13 -44 L 15 -31 L 31 -27 L 16 -17 L 1 -24 L -13 -17 Z', '#79a677'), shine(-23, -11, 5, 8)];
    [[-26,-2],[-14,23],[24,0],[15,25],[0,34],[-4,-10],[10,-15],[-28,13]].forEach(([x,y]) => s.push(ellipse(x,y,1.4,2.4,'#ffe6a5')));
    s.push(...face(4, 0.85));
  } else if (level === 2) {
    s = [stem('M 0 -27 Q -4 -37 3 -48'), leaf(0,-36)];
    [[-16,-21],[13,-22],[-28,-2],[0,-3],[28,-2],[-16,19],[15,19],[0,33]].forEach(([x,y],i) => s.push(ellipse(x,y,i === 7 ? 13 : 15,i === 7 ? 13 : 15,i%2?'#aa8ac8':'#b798d1',INK,1.4)));
    s.push(shine(-21,-25,4,5), ...face(5, 0.82));
  } else if (level === 3) {
    s = [round(c),
      path('M -31 15 Q -16 40 12 38', 'none', '#de8a37', 3.5, 0.45),
      stem('M 0 -32 L 0 -39'), leaf(0,-34), shine(-22,-13), ...face(10)];
    [[-27,9],[-15,-21],[28,18],[23,-14],[-12,29],[10,30]].forEach(([x,y])=>s.push(ellipse(x,y,1.1,1.1,'#dc8b3b','none',0,.55)));
  } else if (level === APPLE_LEVEL) {
    s = [stem(), leaf(2,-37), path('M 0 -31 C -20 -43 -45 -24 -43 1 C -42 24 -28 44 -11 43 Q 0 39 11 43 C 28 44 42 24 43 1 C 45 -24 20 -43 0 -31 Z', c),
      path('M 0 -31 Q 4 -25 11 -27', 'none', '#c65c60', 2), shine(-24,-12), ...face(10)];
  } else if (level === 5) {
    s = [stem('M 0 -33 Q -3 -43 4 -47'), leaf(2,-38), path('M -16 -26 C -23 -16 -18 -7 -31 4 C -54 24 -37 47 0 46 C 37 47 54 24 31 4 C 18 -7 23 -16 16 -26 Q 0 -41 -16 -26 Z', c),
      shine(-22,9,7,10), ...face(15)];
    [[-30,22],[22,30],[-12,-7],[16,3],[-6,35]].forEach(([x,y])=>s.push(ellipse(x,y,.8,.8,'#b9a84f')));
  } else if (level === 6) {
    s = [stem('M 0 -33 Q 3 -41 0 -46'), leaf(2,-36), path('M 0 -29 C -21 -46 -45 -20 -43 3 C -41 26 -20 42 0 46 C 20 42 41 26 43 3 C 45 -20 21 -46 0 -29 Z', c),
      path('M 0 -29 C -6 -17 -7 -5 -3 1', 'none', '#da7c8b', 2, .7),
      path('M 0 30 Q 5 38 0 45', 'none', '#da7c8b', 1.8,.6), shine(-24,-11), ...face(11)];
  } else if (level === 7) {
    s = [path('M -20 -24 L -30 -42 L -9 -35 L -8 -50 L 4 -37 L 17 -49 L 18 -34 L 35 -39 L 24 -21 Z', '#75a577'),
      path('M 0 -30 C -26 -30 -39 -12 -38 10 C -37 36 -22 47 0 47 C 22 47 37 36 38 10 C 39 -12 26 -30 0 -30 Z', c)];
    ['M -28 -14 L 29 31','M -35 2 L 17 43','M -35 20 L -8 43','M -9 -28 L 36 8','M 28 -14 L -29 31','M 35 2 L -17 43','M 35 20 L 8 43','M 9 -28 L -36 8'].forEach(d=>s.push(path(d,'none','#d7a443',1,.66)));
    s.push(shine(-24,-5,5,9), ...face(12));
  } else if (level === 8) {
    s = [round(c), path('M 0 -37 Q -2 -45 6 -46','none','#657e4e',3)];
    ['M -28 -26 Q 1 -3 33 29','M -41 -5 Q -7 17 15 44','M -7 -37 Q 25 -12 42 12','M 28 -26 Q -1 -3 -33 29','M 41 -5 Q 7 17 -15 44','M 7 -37 Q -25 -12 -42 12'].forEach(d=>s.push(path(d,'none','#e8ecc3',1.6,.7)));
    s.push(shine(-23,-16), ...face(11));
  } else if (level === WATERMELON_LEVEL) {
    s = [ellipse(0,0,43,43,c,INK,1.7)];
    for(const [offset,width]of [[-31,7],[-13,9],[9,10],[31,7]]){
      s.push({...path(`M ${offset} -47 C ${offset-15} -18 ${offset+13} 14 ${offset-3} 47 L ${offset+width} 47 C ${offset+width+14} 14 ${offset+width-12} -18 ${offset+width} -47 Z`,'#3e8158','none'),clipCircle:true});
    }
    s.push({...ellipse(13,31,39,20,'#1b6040','none',0,.16),clipCircle:true},
      ellipse(0,13,25,17,'#b0dca2','none',0,.28),
      path('M -2 -39 Q -9 -48 -1 -48 Q 8 -47 4 -42','none','#476e3a',2.5),
      leaf(3,-37,'#8daf68'),shine(-20,-17,10,6),...face(9));
  } else if (level === SECRET_LEVEL) {
    s = [
      ellipse(0, 2, 43, 43, c, '#735261', 1.7),
      path('M -5 -34 Q -13 -43 -6 -49 Q 4 -43 6 -34 Z', '#8fb968', INK, 1.3),
      path('M -31 -17 Q -42 -17 -44 -26 Q -33 -30 -26 -24 Z', '#83af62', INK, 1.3),
      path('M 29 -23 Q 35 -32 43 -26 Q 42 -17 33 -13 Z', '#8fb968', INK, 1.3),
      path('M -35 10 Q -46 15 -42 25 Q -32 24 -27 17 Z', '#91bc70', INK, 1.3),
      path('M 33 12 Q 45 15 41 26 Q 32 26 27 19 Z', '#83af62', INK, 1.3),
      path('M -10 36 Q -15 46 -6 49 Q 2 44 3 37 Z', '#8fb968', INK, 1.3),
      path('M 16 33 Q 20 45 28 41 Q 30 33 23 27 Z', '#91bc70', INK, 1.3),
      ellipse(0, 3, 35, 37, '#cf4d84', 'none'),
      ellipse(0, 3, 32, 34, '#fff9ed', '#f4b4cb', 1.2),
    ];
    [[-18,-19],[-7,-25],[7,-24],[20,-17],[-25,-7],[-13,-10],[0,-14],[14,-9],[26,2],[-25,9],[-17,2],[17,2],[-21,23],[-9,28],[6,29],[21,21],[0,22],[-4,0],[23,11],[-17,16],[11,-18]].forEach(([x,y],index) => s.push(ellipse(x,y,index%3===0?1:.8,index%2?1.4:1.1,'#584747')));
    s.push(...face(10,.8));
  } else if (level === 11) {
    s = [
      path(starPath(5, 47, 25), '#88a35a', INK, 1.6),
      path(starPath(5, 44, 23.5), c, '#aeb664', .8),
      path(starPath(5, 35, 19), '#f8e28a', 'none'),
    ];
    for(let point=0;point<5;point++) {
      const angle=-Math.PI/2+point*Math.PI*2/5;
      s.push(path(`M 0 0 L ${Math.cos(angle)*34} ${Math.sin(angle)*34}`, 'none', '#debd4d', .9, .66));
    }
    s.push(ellipse(-6,-12,1.1,2,'#a17e43'),ellipse(7,-12,1.1,2,'#a17e43'),shine(-16,-16,4,7),...face(6,.78));
  } else if (level === 12) {
    s = [
      ellipse(0,4,43,42,c,'#59465d',1.7),
      path('M 0 -31 Q -16 -35 -22 -46 Q -5 -48 2 -36 Q 9 -49 25 -42 Q 19 -29 3 -28 Z','#83a16a',INK,1.4),
      path('M -2 -31 Q -24 -23 -31 -35 Q -19 -46 -2 -35 Q 9 -43 19 -31 Q 14 -21 -2 -31 Z','#98b279',INK,1.4),
      stem('M 0 -34 Q -4 -41 2 -47'),
      ellipse(0,8,32,30,'#b37aa9','#c28bba',1.2),
      ellipse(0,8,29,27,'#eadcc5','none'),
      path('M 0 5 C -14 -4 -10 -22 0 -20 C 10 -22 14 -4 0 5 Z','#fffbea','#d7cbb8',.8),
      path('M 2 6 C 9 -10 28 -11 29 2 C 30 13 15 17 2 6 Z','#fff9e7','#d7cbb8',.8),
      path('M 2 8 C 22 4 31 21 20 30 C 9 37 1 24 2 8 Z','#fffbea','#d7cbb8',.8),
      path('M -2 8 C -1 24 -9 37 -20 30 C -31 21 -22 4 -2 8 Z','#fff9e7','#d7cbb8',.8),
      path('M -2 6 C -15 17 -30 13 -29 2 C -28 -11 -9 -10 -2 6 Z','#fffbea','#d7cbb8',.8),
      shine(-33,-14,4,8),...face(9,.8),
    ];
  } else {
    s = [
      ellipse(0,0,49,49,'#f8dfa0','none',0,.24),
      path(starPath(12,47,42),'#eac06c','none',0,.68),
      ellipse(0,1,43,43,c,'#97743e',1.7),
      path('M -30 18 Q -17 41 8 39 Q 30 34 36 14','none','#da8d3e',4,.36),
      path('M -9 -36 Q -13 -46 -3 -49 Q 3 -42 11 -39 Q 4 -32 -9 -36 Z','#f5ce71','#ad8848',1.2),
      ellipse(-15,-16,15,12,'#ffe8ab','none',0,.45),
      path('M -28 -5 Q -13 -10 -1 -5','none','#fbd67d',1.4,.6),
      path('M 12 -22 L 14 -17 L 19 -15 L 14 -13 L 12 -8 L 10 -13 L 5 -15 L 10 -17 Z','#fff2c1','none'),
      path('M -24 22 L -22 26 L -18 28 L -22 30 L -24 34 L -26 30 L -30 28 L -26 26 Z','#ffedb1','none'),
      ...face(12,1),
    ];
  }
  return s;
}

const SCENES = FRUITS.map((_, level) => artwork(level));
const PATHS = new WeakMap();

function mixColor(hex,target,amount){return '#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-amount)+parseInt(target.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');}

export function drawFruit(ctx, level, x, y, radius, rotation = 0, alpha = 1, special = false, time = 0) {
  level = Math.max(0, Math.min(FRUITS.length - 1, level | 0));
  ctx.save(); ctx.translate(x, y); ctx.scale(radius / 44, radius / 44); ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (special && [APPLE_LEVEL,PEAR_LEVEL].includes(level)) drawSpecialAppleEffect(ctx, time, 'back');
  ctx.save(); ctx.rotate(rotation);
  for (const shape of SCENES[level]) {
    ctx.save(); ctx.globalAlpha *= shape.opacity ?? 1;
    if(shape.clipCircle){ctx.beginPath();ctx.arc(0,0,43,0,Math.PI*2);ctx.clip();}
    if(shape.fill===FRUITS[level].color){
      const gloss=ctx.createRadialGradient(-17,-23,2,6,10,57);
      gloss.addColorStop(0,mixColor(shape.fill,'#ffffff',.38));gloss.addColorStop(.52,shape.fill);gloss.addColorStop(1,mixColor(shape.fill,'#183f2d',.27));
      ctx.fillStyle=gloss;
    }else ctx.fillStyle = shape.fill;
    ctx.strokeStyle = shape.stroke; ctx.lineWidth = shape.width;
    let p = PATHS.get(shape);
    if (!p) {
      if (shape.tag === 'path') p = new Path2D(shape.d);
      else { p = new Path2D(); p.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2); }
      PATHS.set(shape, p);
    }
    if (shape.fill !== 'none') ctx.fill(p);
    if (shape.stroke !== 'none' && shape.width > 0) ctx.stroke(p);
    ctx.restore();
  }
  ctx.restore();
  if (special && [APPLE_LEVEL,PEAR_LEVEL].includes(level)) drawSpecialAppleEffect(ctx, time);
  ctx.restore();
}

function sparkle(ctx, x, y, radius, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.beginPath(); ctx.moveTo(0, -radius);
  ctx.lineTo(radius * .25, -radius * .25); ctx.lineTo(radius, 0);
  ctx.lineTo(radius * .25, radius * .25); ctx.lineTo(0, radius);
  ctx.lineTo(-radius * .25, radius * .25); ctx.lineTo(-radius, 0);
  ctx.lineTo(-radius * .25, -radius * .25); ctx.closePath();
  ctx.fill(); ctx.stroke(); ctx.restore();
}

/** Shared, bounded lucky-apple and lucky-pear animation in local fruit coordinates. */
export function drawSpecialAppleEffect(ctx, time = 0, layer = 'front') {
  time = Number.isFinite(time) ? time : 0;
  const tau = Math.PI * 2;
  const pulse = .5 + .5 * Math.sin(time * tau / 3.2);
  ctx.save();
  const alpha = ctx.globalAlpha;
  // The glow scales with the fruit, including tiny previews, instead of a pixel blur.
  if (layer === 'back') {
    ctx.translate(0, -2); ctx.scale(1, .94);
    const glow = ctx.createRadialGradient(0, 0, 25, 0, 0, 49);
    glow.addColorStop(0, `rgba(255,220,110,${.2+pulse*.08})`);
    glow.addColorStop(.55, `rgba(255,220,110,${.1+pulse*.04})`);
    glow.addColorStop(.8, `rgba(255,202,60,${.035+pulse*.02})`);
    glow.addColorStop(1, 'rgba(255,220,110,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 49, 0, tau); ctx.fill();
    ctx.restore();
    return;
  }
  // A broad, slow reflection sweeps back and forth; no abrupt flash or reset.
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 2, 41.5, 0, tau); ctx.clip();
  const sweep = Math.sin(time * tau / 4.8) * 54;
  ctx.strokeStyle = '#fff9d9'; ctx.lineWidth = 10;
  ctx.globalAlpha = alpha * (.2 + pulse * .12);
  ctx.beginPath(); ctx.moveTo(sweep - 20, -46); ctx.lineTo(sweep + 20, 46); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.globalAlpha = alpha * .38;
  ctx.beginPath(); ctx.moveTo(sweep - 26, -46); ctx.lineTo(sweep + 14, 46); ctx.stroke();
  ctx.restore();
  // Large four-point stars orbit at the rim while two smaller stars float upward.
  ctx.fillStyle = '#fff5b9'; ctx.strokeStyle = '#d5a02a'; ctx.lineWidth = .85;
  for (let i = 0; i < 5; i++) {
    const angle = time * .68 + i * tau / 5 - .8;
    const twinkle = .5 + .5 * Math.sin(time * tau / 2.5 + i * 1.7);
    ctx.globalAlpha = alpha * (.64 + twinkle * .36);
    sparkle(ctx, Math.cos(angle) * 42, Math.sin(angle) * 36.5 - 2, 4.4 + twinkle * 2, time * .16 + i * .3);
  }
  for (let i = 0; i < 2; i++) {
    const progress = ((time / 3.8 + i * .5) % 1 + 1) % 1;
    const visibility = Math.sin(progress * Math.PI);
    ctx.globalAlpha = alpha * visibility * visibility * .9;
    const x = (i ? 1 : -1) * (17 + Math.sin(progress * Math.PI) * 6);
    sparkle(ctx, x, 19 - progress * 49, 2.5 + visibility * 1.8, -.2 + progress * .4);
  }
  ctx.restore();
}

export function fruitSVG(level, size = 64) {
  level = Math.max(0, Math.min(FRUITS.length - 1, level | 0));
  const shapes = SCENES[level].map(s => {
    const geometry = s.tag === 'path' ? `d="${s.d}"` : `cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}"`;
    const fill=s.fill===FRUITS[level].color?'url(#fruit-gloss)':s.fill;
    return `<${s.tag} ${geometry} fill="${fill}" stroke="${s.stroke}" stroke-width="${s.width}" opacity="${s.opacity ?? 1}"${s.clipCircle?' clip-path="url(#fruit-body-clip)"':''}/>`;
  }).join('');
  const color=FRUITS[level].color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-52 -53 104 105" role="img" aria-label="${FRUITS[level].name}" stroke-linecap="round" stroke-linejoin="round"><defs><clipPath id="fruit-body-clip"><circle cx="0" cy="0" r="43"/></clipPath><radialGradient id="fruit-gloss" cx="32%" cy="25%" r="80%"><stop stop-color="${mixColor(color,'#ffffff',.38)}"/><stop offset=".52" stop-color="${color}"/><stop offset="1" stop-color="${mixColor(color,'#183f2d',.27)}"/></radialGradient></defs>${shapes}</svg>`;
}
