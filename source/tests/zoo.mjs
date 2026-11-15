import assert from 'node:assert/strict';
import {ZOO_STAGES} from '../dist/zoo.js';
import {FRUITS} from '../dist/fruits.js';
import {FruitWorld} from '../dist/physics.js';
import {GameSave,normalizeGameRecord} from '../dist/save-state.js';
import {GardenProgress} from '../dist/profile.js';
import {loadPreferences,savePreferences} from '../dist/preferences.js';
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
assert.equal(ZOO_STAGES.length,15);assert.deepEqual(ZOO_STAGES.slice(0,3).map(a=>a.name),['햄스터','고양이','강아지']);assert.equal(ZOO_STAGES[14].name,'고래');
for(let level=0;level<14;level++){
 const events=[],world=new FruitWorld({fruits:FRUITS,mode:'zoo',onMerge:e=>events.push(e)}),r=ZOO_STAGES[level].radius;
 world.bodies=[world.makeBody(level,300-r+1,450,{age:2}),world.makeBody(level,300+r-1,450,{age:2})];world.update(1/120);
 assert.equal(events.length,1,'animal merge '+level);assert.equal(events[0].level,level+1);assert.equal(world.bodies.length,1);assert.equal(world.bodies[0].r,ZOO_STAGES[level+1].radius);assert.equal(world.score,ZOO_STAGES[level+1].points);assert.equal(world.bodies[0].special,false);assert.equal(events[0].specialMerged,false);assert.equal(events[0].specialPearsCleared,0);
 assert(!world.isApple(level));assert(!world.isPear(level));
}
const whales=new FruitWorld({fruits:FRUITS,mode:'zoo'});whales.bodies=[whales.makeBody(14,153,550,{age:2}),whales.makeBody(14,437,550,{age:2})];whales.update(1/120);assert.equal(whales.bodies.length,2,'whales are terminal, not an undefined16th animal');assert.equal(whales.setMode('classic'),false,'reset before leaving a15-stage world');
const restored=new FruitWorld({fruits:FRUITS});assert(restored.restore(whales.serialize()));assert.equal(restored.mode,'zoo');assert.equal(restored.bodies[0].r,143);assert.equal(restored.restore({...whales.serialize(),mode:'classic'}),false);assert.equal(restored.restore({...whales.serialize(),bodies:whales.serialize().bodies.map(b=>({...b,special:true}))}),false);
const profile=new GardenProgress({storage});await profile.init();const run=await profile.startRun({fresh:true,mode:'zoo'});await profile.checkpointRun(9876,40);assert.equal(profile.profile.modeBestScores.zoo,9876);assert.equal(profile.profile.bestScore,0);assert.equal(profile.profile.classicMergedFruits,0);assert.deepEqual(profile.profile.discoveredLevels,[]);assert.equal((await profile.unlockAchievement('watermelon',{mode:'zoo',runId:run.runId})).unlocked,false);
await assert.rejects(()=>profile.checkpointRun(10000,42,{specialShakeRewards:1}),e=>e.code==='INVALID_RUN');
const record={runId:run.runId,world:whales.serialize(),mode:'zoo',activeLevel:0,nextLevel:1,activeSpecial:false,nextSpecial:false,aimX:300,shakes:0,shakeReadyAt:0,dropCount:0,itemCount:0,roundCleared:40,maxLevel:14,watermelonMade:false,secretDiscovered:false,celebratedLevels:[14],discoveredLevels:[],toolReadyAt:{eraser:0,calm:0}};
const save=new GameSave({storage});assert(save.write(record));assert.equal(save.read().maxLevel,14);assert.deepEqual(save.read().celebratedLevels,[14]);assert.equal(save.write({...record,mode:'classic'}),false);assert.equal(save.read().mode,'zoo');assert.throws(()=>normalizeGameRecord({...record,activeSpecial:true,activeLevel:4}));
const old={...record};delete old.celebratedLevels;assert.deepEqual(normalizeGameRecord(old).celebratedLevels,[]);
const loaded=new GardenProgress({storage});await loaded.init();assert.equal(loaded.pendingRun.mode,'zoo');assert.equal(loaded.profile.modeBestScores.zoo,9876);await loaded.finishRun(9876,40);await loaded.startRun({fresh:true,mode:'classic'});assert.equal(loaded.pendingRun.mode,'classic');assert.equal(loaded.profile.bestScore,0);
savePreferences({unlockedModes:['classic','zoo','unknown']},storage);assert.deepEqual(loadPreferences(storage).unlockedModes,['classic','zoo']);
console.log('PASS zoo:15 named animals, all14 merge transitions and radii, terminal whales, mode-aware saves/14th index, safe mode changes, no special fruits/fruit achievements/unlocks, isolated scores and old-save compatibility.');
