import assert from 'node:assert/strict';
import { GardenAudio } from '../dist/audio.js';
import { loadPreferences, savePreferences } from '../dist/preferences.js';

class Param {
  constructor(value = 1) { this.value = value; this.events = []; }
  record(type, value, time) {
    assert(Number.isFinite(value)); assert(Number.isFinite(time)); assert(time >= 0);
    this.value = value; this.events.push({ type, value, time });
  }
  setValueAtTime(value, time) { this.record('set', value, time); }
  exponentialRampToValueAtTime(value, time) { assert(value > 0); this.record('ramp', value, time); }
  setTargetAtTime(value, time, decay) { assert(decay > 0); this.record('target', value, time); }
  cancelScheduledValues(time) { assert(time >= 0); }
}
class Context {
  constructor() { this.currentTime = 0; this.state = 'suspended'; this.destination = {}; this.sources = []; this.resumes = 0; }
  createGain() { return { gain:new Param(), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { ...Object.fromEntries(['threshold','knee','ratio','attack','release'].map(key => [key,new Param()])), connect() {} }; }
  createOscillator() {
    const c = this, node = { frequency:new Param(), type:'sine', end:Infinity, disposed:false,
      connect() {}, disconnect() { this.disposed = true; },
      start(time) { assert(Number.isFinite(time)); assert(time >= c.currentTime); this.startTime = time; },
      stop(time = c.currentTime) { assert(Number.isFinite(time)); this.end = time; },
    };
    this.sources.push(node); return node;
  }
  resume() { this.resumes++; this.state = 'running'; this.onstatechange?.(); return Promise.resolve(); }
  advance(seconds) {
    this.currentTime += seconds;
    for (const node of this.sources) if (!node.ended && node.end <= this.currentTime) { node.ended = true; node.onended?.(); }
  }
}
const timers = new Map(); let created = 0, timerId = 0;
const context = new Context();
const music = new GardenAudio({ contextFactory:() => { created++; return context; }, setTimer:fn => { timers.set(++timerId,fn); return timerId; }, clearTimer:id => timers.delete(id) });
music.setPlaying(true);
assert.equal(created, 0, 'loading or restoring a round never creates autoplay audio');
assert.equal(await music.unlock(), true);
assert.equal(created, 1); assert.equal(context.resumes, 1); assert.equal(timers.size, 1);
for (let i = 0; i < 200; i++) music.setPlaying(true);
assert.equal(timers.size, 1, 'render frames never stack music loops');
for (let i = 0; i < 2800; i++) { context.advance(.025); for (const callback of timers.values()) callback(); }
assert(context.sources.length > 500, 'the original tune schedules across multiple complete loops');
assert(music.voices.music.size < 48); assert(context.sources.some(source => source.type === 'triangle'));
music.setPlaying(true, true);
assert(music.musicBus.gain.value < .2, 'menus lower the background music');
music.configure({ music:false });
assert.equal(timers.size, 0); assert.equal(music.voices.music.size, 0);
assert.equal(music.effect('drop'), true, 'effects work with music disabled');
assert(music.voices.effects.size >= 2);
music.configure({ effects:false, music:true });
assert.equal(music.voices.effects.size, 0); assert.equal(music.effect('merge', 9), false); assert.equal(timers.size, 1);
music.configure({ effects:true });
for (const name of ['drop','merge','special','shake','eraser','calm','revive','over']) assert.equal(music.effect(name, 9), true);
for (let i = 0; i < 100; i++) music.effect('merge', 1000);
assert(music.voices.effects.size <= 24, 'merge chains have a bounded number of voices');
music.configure({ sound:false });
assert.equal(timers.size, 0); assert.equal(music.voices.effects.size, 0); assert.equal(music.master.gain.value, 0);
assert.equal(music.effect('drop'), false);
music.configure({ sound:true, volume:0 }); assert.equal(timers.size, 0);
music.configure({ volume:.55 }); assert.equal(timers.size, 1);
music.silence();
assert.equal(timers.size, 0); assert.equal(music.voices.music.size + music.voices.effects.size, 0);
context.advance(10);
music.setPlaying(true); assert.equal(timers.size, 1);
assert(music.nextNote > context.currentTime, 'returning to a tab never catches up a silent backlog');
context.state = 'suspended'; context.onstatechange(); assert.equal(timers.size, 0);
assert.equal(await music.unlock(), true); assert.equal(timers.size, 1);
music.configure({ musicVolume:0 }); assert.equal(timers.size, 0);
music.configure({ musicVolume:.45 }); assert.equal(timers.size, 1);
music.silence(); context.advance(2);
assert(context.sources.every(source => source.disposed), 'all scheduled voices release their nodes after stopping');

const unsupported = new GardenAudio({ contextFactory:() => null });
assert.equal(await unsupported.unlock(), false); assert.equal(unsupported.effect('drop'), false);
const failed = new GardenAudio({ contextFactory:() => { const c = new Context(); c.resume = () => Promise.reject(new Error('gesture required')); return c; } });
failed.setPlaying(true); assert.equal(await failed.unlock(), false); assert.equal(failed.timer, null);
const saved = new Map([['suika-garden-preferences-v1', JSON.stringify({ sound:false, volume:.8, unlockedModes:['classic','water'], boardColor:'#abcdef' })]]);
const storage = { getItem:key => saved.get(key), setItem:(key,value) => saved.set(key,value) };
let prefs = loadPreferences(storage);
assert.equal(prefs.sound, false); assert.equal(prefs.music, true); assert.equal(prefs.effects, true);
savePreferences({ music:false, effects:true, musicVolume:.2, effectsVolume:2 }, storage);
prefs = loadPreferences(storage);
assert.equal(prefs.music, false); assert.equal(prefs.musicVolume, .2); assert.equal(prefs.effectsVolume, 1);
assert.equal(prefs.boardColor, '#abcdef'); assert(prefs.unlockedModes.includes('water'));
console.log('PASS audio: gesture unlock, two full music loops, single scheduler, independent channels/volumes, mute and tab suspend/resume, bounded effects, node cleanup, unsupported audio and legacy preferences.');
