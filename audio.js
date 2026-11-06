// Original 16-bar puzzle tune: plucked keys, warm bass and a light offbeat chord.
// Generated locally with Web Audio; no network audio or copied recordings.
const MELODY = [
  [76,79,81,79,76,74,72,null], [74,76,79,null,76,74,72,null],
  [76,81,84,81,79,76,74,null], [72,76,79,76,74,null,72,null],
  [77,81,84,81,79,77,76,null], [74,77,81,null,79,77,74,null],
  [74,79,83,81,79,76,74,null], [76,74,72,null,74,null,79,null],
  [79,83,86,83,81,79,76,null], [81,84,88,84,81,79,76,null],
  [77,81,84,81,77,76,74,null], [79,83,86,null,84,83,79,null],
  [84,79,76,79,81,79,76,null], [81,77,74,null,77,79,81,null],
  [77,81,79,77,76,74,72,null], [74,79,76,74,72,null,null,null],
];
const CHORDS = [
  [48,60,64,67], [48,60,64,71], [45,60,64,69], [45,60,64,67],
  [41,60,65,69], [41,60,65,69], [43,59,62,67], [43,59,62,69],
  [40,59,64,67], [45,60,64,69], [38,60,65,69], [43,59,62,65],
  [48,60,64,67], [41,60,65,69], [38,60,65,69], [43,59,62,65],
];
const EIGHTH = 60 / 112 / 2;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const unit = (value, fallback) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

export class GardenAudio {
  constructor({ contextFactory, setTimer, clearTimer } = {}) {
    this.contextFactory = contextFactory || (() => {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      return Audio ? new Audio() : null;
    });
    this.setTimer = setTimer || ((callback, delay) => globalThis.setInterval(callback, delay));
    this.clearTimer = clearTimer || (id => globalThis.clearInterval(id));
    this.context = null; this.timer = null; this.playing = false; this.quiet = false;
    this.step = 0; this.nextNote = 0;
    this.voices = { music: new Set(), effects: new Set() };
    this.settings = { sound:true, volume:.55, music:true, musicVolume:.45, effects:true, effectsVolume:.8 };
  }

  configure(settings = {}) {
    for (const key of ['sound','music','effects']) if (typeof settings[key] === 'boolean') this.settings[key] = settings[key];
    for (const key of ['volume','musicVolume','effectsVolume']) this.settings[key] = unit(settings[key], this.settings[key]);
    this._mix();
    if (!this.settings.sound || !this.settings.effects || !this.settings.volume || !this.settings.effectsVolume) this._stopVoices('effects');
    this._sync();
  }

  async unlock() {
    if (!this.settings.sound) return false;
    try {
      if (!this.context || this.context.state === 'closed') {
        this.context = this.contextFactory();
        if (!this.context) return false;
        const c = this.context;
        this.master = c.createGain(); this.musicBus = c.createGain(); this.effectsBus = c.createGain();
        this.musicBus.connect(this.master); this.effectsBus.connect(this.master);
        const limiter = c.createDynamicsCompressor();
        limiter.threshold.value = -12; limiter.knee.value = 10; limiter.ratio.value = 5;
        limiter.attack.value = .003; limiter.release.value = .15;
        this.master.connect(limiter); limiter.connect(c.destination);
        this.master.gain.value = 0; this._mix();
        c.onstatechange = () => {
          if (c !== this.context) return;
          if (c.state !== 'running') { this._stopMusic(); this._stopVoices('effects'); }
          else this._sync();
        };
      }
      // Invoked directly during a pointer/keyboard gesture, before any await.
      const resumed = this.context.state === 'running' ? null : this.context.resume();
      if (resumed) await resumed;
      this._sync();
      return this.context.state === 'running';
    } catch { return false; }
  }

  setPlaying(playing, quiet = false) {
    if (this.playing === !!playing && this.quiet === !!quiet) { this._sync(); return; }
    this.playing = !!playing; this.quiet = !!quiet;
    this._mix(); this._sync();
  }

  silence() {
    this.setPlaying(false);
    this._stopVoices('effects');
  }

  _gain(node, value) {
    if (!node || !this.context || this.context.state === 'closed') return;
    node.gain.setTargetAtTime(value, this.context.currentTime, .018);
  }

  _mix() {
    this._gain(this.master, this.settings.sound ? this.settings.volume : 0);
    this._gain(this.musicBus, this.settings.musicVolume * .6 * (this.quiet ? .4 : 1));
    this._gain(this.effectsBus, this.settings.effectsVolume * .9);
  }

  _wantsMusic() {
    const s = this.settings;
    return this.playing && s.sound && s.music && s.volume > 0 && s.musicVolume > 0;
  }

  _sync() {
    if (!this._wantsMusic() || this.context?.state !== 'running') { this._stopMusic(); return; }
    if (this.timer !== null) return;
    this.nextNote = this.context.currentTime + .035;
    this.timer = this.setTimer(() => this._tick(), 25);
    this._tick();
  }

  _stopMusic() {
    if (this.timer !== null) { this.clearTimer(this.timer); this.timer = null; }
    this._stopVoices('music');
  }

  _stopVoices(channel) {
    const now = this.context?.currentTime || 0;
    for (const voice of this.voices[channel]) {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(.0001, now, .004);
        voice.osc.stop(now + .025);
      } catch {}
      this.voices[channel].delete(voice);
    }
  }

  _tone(channel, frequency, time, duration, volume, type = 'sine', end = frequency) {
    if (this.context?.state !== 'running') return;
    const c = this.context, voices = this.voices[channel];
    if (voices.size >= (channel === 'effects' ? 24 : 48)) {
      const oldest = voices.values().next().value;
      oldest.osc.stop(); voices.delete(oldest);
    }
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    if (end !== frequency) osc.frequency.exponentialRampToValueAtTime(end, time + duration * .7);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(gain); gain.connect(channel === 'music' ? this.musicBus : this.effectsBus);
    const voice = { osc, gain }; voices.add(voice);
    osc.onended = () => { voices.delete(voice); osc.disconnect(); gain.disconnect(); };
    osc.start(time); osc.stop(time + duration + .015);
  }

  _tick() {
    if (!this._wantsMusic() || this.context?.state !== 'running') { this._stopMusic(); return; }
    try {
      const now = this.context.currentTime;
      if (this.nextNote < now - .2) this.nextNote = now + .025;
      let scheduled = 0;
      while (this.nextNote < now + .12 && scheduled++ < 4) {
        const bar = Math.floor(this.step / 8) % MELODY.length, beat = this.step % 8;
        const time = this.nextNote + (beat % 2 ? .012 : 0), note = MELODY[bar][beat], chord = CHORDS[bar];
        if (note !== null) {
          this._tone('music', hz(note), time, .24, .23, 'triangle');
          this._tone('music', hz(note + 12), time, .11, .025);
        }
        if (beat === 0 || beat === 4) this._tone('music', hz(chord[0] + (beat === 4 ? 7 : 0)), time, .34, .21);
        if (beat === 2 || beat === 6) for (const n of chord.slice(1)) this._tone('music', hz(n), time, .16, .045, 'triangle');
        if (beat % 2 === 0) this._tone('music', beat === 0 ? 130 : 480, time, .035, .03, 'sine', 90);
        this.step = (this.step + 1) % (MELODY.length * 8);
        this.nextNote += EIGHTH;
      }
    } catch { this._stopMusic(); }
  }

  effect(type, level = 0) {
    const s = this.settings;
    if (!s.sound || !s.effects || !s.volume || !s.effectsVolume || this.context?.state !== 'running') return false;
    try {
      const now = this.context.currentTime;
      const tone = (f, delay, duration, volume, wave = 'sine', end = f) => this._tone('effects', f, now + delay, duration, volume, wave, end);
      if (type === 'over') {
        [72,67,64,60].forEach((note, i) => tone(hz(note), i * .13, .22, .19, 'triangle'));
      } else if (type === 'special' || type === 'revive') {
        [72,76,79,84].forEach((note, i) => tone(hz(note), i * .075, .3, .18, 'triangle'));
        tone(hz(96), .25, .32, .05);
      } else if (type === 'merge') {
        const pitch = Math.min(12, Math.max(0, level)) * .7;
        tone(hz(75 + pitch), 0, .12, .27, 'sine', hz(82 + pitch));
        tone(hz(82 + pitch), .075, .18, .23, 'triangle', hz(79 + pitch));
      } else if (type === 'shake') {
        for (let i = 0; i < 5; i++) tone(130 + i * 35, i * .045, .09, .15, 'triangle', 310 - i * 25);
      } else if (type === 'calm' || type === 'eraser') {
        [600,800,1100].forEach((f, i) => tone(f, i * .045, .11, .16, 'sine', f * .7));
      } else {
        tone(540, 0, .085, .25, 'sine', 980);
        tone(860, .065, .13, .2, 'triangle', 340);
      }
      return true;
    } catch { return false; }
  }
}
