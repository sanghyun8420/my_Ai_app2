import assert from 'node:assert/strict';
import {FruitWorld} from '../dist/physics.js';
import {FRUITS} from '../dist/fruits.js';
import {SCIENCE_STAGES,scienceReaction} from '../dist/science.js';

function create(mode='science',events=[]){return new FruitWorld({fruits:FRUITS,mode,random:()=>0,onMerge:event=>events.push(event)});}
function touch(world,a,b){const r1=world.fruits[a].radius,r2=world.fruits[b].radius;world.bodies=[world.makeBody(a,180,450),world.makeBody(b,180+r1+r2-1,450)];world.update(1/120);return world.bodies;}
for(const [a,b,output]of [[0,0,2],[0,1,3],[1,0,3],[0,3,4],[3,0,4],[1,2,4],[2,1,4]]){
 const events=[],world=create('science',events);touch(world,a,b);assert.equal(world.bodies.length,1,`${a}+${b} react on contact`);assert.equal(world.bodies[0].level,output);assert.equal(events.length,1);assert.deepEqual(events[0].reaction,{inputs:[a,b],output});assert.equal(events[0].consumedCount,2);assert.equal(world.bodies[0].special,false);
}
for(const [a,b]of [[1,1],[0,2],[1,3],[2,2],[3,3],[0,4],[1,4],[13,13]]){
 const events=[],world=create('science',events);touch(world,a,b);assert.equal(world.bodies.length,2,`invalid ${a}+${b} stay separate`);assert.equal(events.length,0);
}
// Both reaction routes use exactly two H and one O; no extra source atom remains.
for(const route of [[0,0,2,1],[0,1,3,0]]){
 const [a,b,intermediate,last]=route,world=create();touch(world,a,b);assert.equal(world.bodies[0].level,intermediate);
 const molecule=world.bodies[0];world.bodies.push(world.makeBody(last,molecule.x+molecule.r+world.fruits[last].radius-1,molecule.y));
 world.update(1/120);assert.equal(world.bodies.length,1);assert.equal(world.bodies[0].level,4);
}
// Every later stage can actually be reached using collisions in the solver.
for(let level=4;level<SCIENCE_STAGES.length-1;level++){
 const world=create();touch(world,level,level);assert.equal(world.bodies.length,1);assert.equal(world.bodies[0].level,level+1);
}
assert.equal(SCIENCE_STAGES.length,14);assert.equal(scienceReaction(13,13),null);
// One atom cannot be reserved by two simultaneous contacts.
const crowdedEvents=[],crowded=create('science',crowdedEvents);crowded.bodies=[crowded.makeBody(0,250,450),crowded.makeBody(1,250,450),crowded.makeBody(0,250,450)];crowded.update(1/120);assert.equal(crowdedEvents.length,1);assert.equal(crowded.bodies.length,2);

const science=create();science.bodies=[science.makeBody(4,250,450,{special:true}),science.makeBody(10,420,500)];science.update(1/120);assert(science.bodies.every(body=>!body.special));const snapshot=science.serialize();
const normal=create('classic');assert(normal.restore(snapshot));assert.equal(normal.mode,'science');assert.equal(normal.fruits,SCIENCE_STAGES);assert.equal(normal.bodies[0].r,SCIENCE_STAGES[4].radius);assert.equal(normal.bodies[1].r,SCIENCE_STAGES[10].radius);
const untouched=normal.serialize(),defs=normal.fruits;const invalid=structuredClone(snapshot);invalid.bodies[0].special=true;assert.equal(normal.restore(invalid),false);assert.deepEqual(normal.serialize(),untouched);assert.equal(normal.fruits,defs,'invalid save must not change definitions');
const classic=create('classic');classic.bodies=[classic.makeBody(4,250,450,{special:true})];const classicSave=classic.serialize();assert(normal.restore(classicSave));assert.equal(normal.fruits,FRUITS);assert.equal(normal.bodies[0].special,true);assert.equal(normal.bodies[0].r,FRUITS[4].radius);
const switching=create();switching.reset();assert(switching.setMode('classic'));assert.equal(switching.fruits,FRUITS);assert(switching.setMode('science'));assert.equal(switching.fruits,SCIENCE_STAGES);
const unchanged=create('classic');touch(unchanged,0,0);assert.equal(unchanged.bodies[0].level,1,'normal equal-fruit merging is unchanged');
const exploding=create();exploding.bodies=[exploding.makeBody(0,100,400),exploding.makeBody(1,500,600)];exploding.blast={x:100,y:400,radius:80};exploding.update(1/120);assert.equal(exploding.bodies.length,1);assert.equal(exploding.bodies[0].level,1);assert(exploding.shakeProtected);
console.log('PASS science solver: both water routes/stoichiometry, invalid pairs,14 stages, contact reservation, mode-aware saves/radii, no special apples, mode reset and normal merging.');
