import assert from 'node:assert/strict';
import {RaceSimulation} from '../dist/racing-model.js';
const make=()=>{const race=new RaceSimulation({random:()=>.4});race.phase='racing';race.distance=300;race.speed=10;race.rivals.forEach((r,i)=>Object.assign(r,{lane:i?-.6:0,target:i?-.6:0,distance:i?1500:300,speed:10,phase:0}));race.x=0;return race;};
const hit=make();hit.step({accel:true});assert.equal(hit.collisions,1,'rival contact is no longer invisible');assert.equal(hit.invulnerable,75);assert(hit.events.some(e=>e.type==='hit'));hit.step({accel:true});assert.equal(hit.collisions,1,'shared cooldown prevents repeated collision while overlapping');
const otherLane=make();otherLane.rivals[0].lane=.6;otherLane.rivals[0].target=.6;otherLane.step({accel:true});assert.equal(otherLane.collisions,0,'separated cars do not collide');
const far=make();far.rivals[0].distance=1000;far.step({accel:true});assert.equal(far.collisions,0,'off-screen cars do not collide');
const jump=make();jump.jump=20;jump.step({accel:true});assert.equal(jump.collisions,0,'jump passes above rivals');
const restore=RaceSimulation.restore(hit.serialize());assert.equal(restore.invulnerable,74);restore.step({accel:true});assert.equal(restore.collisions,1,'cooldown survives resume');
console.log('PASS racing rival contact: visual coordinates, lanes, jumping and cooldown with restore.');

const {CARS,vehicleBoundsIntersect} = await import('../dist/racing-model.js');
const noOverlap = (race, message) => {
 const cars = race.groundVehicles();
 if (race.jump < 12) cars.push(race.vehiclePosition('player'));
 for (let i = 0; i < cars.length; i++) {
  for (let j = 0; j < i; j++) {
   assert(!vehicleBoundsIntersect(cars[i], cars[j]), message);
  }
 }
};
let seed = 6619;
const random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
const legacy = new RaceSimulation({ random });
const checkpoint = legacy.serialize();
checkpoint.rivals.forEach((r, i) => { r.lane = 0; r.distance = (i + 1) * 7; });
const repaired = RaceSimulation.restore(checkpoint);
noOverlap(repaired, 'an old race opens with clear space around the player');
assert.equal(repaired.collisions, 0, 'restoring the layout does not count as a crash');

for (const [mode, difficulty, scenario] of [
 ['race', 'easy', 'endless'],
 ['race', 'hell', 'endless'],
 ['drive', 'hell', 'hard'],
 ['drive', 'hard', 'police']
]) {
 let race = new RaceSimulation({ car: CARS[17], mode, difficulty, scenario, random });
 race.setViewport(1500, 300);
 if (scenario === 'police') race.elapsed = 100;
 let input = { accel: true };
 noOverlap(race, 'countdown vehicle outlines are clear');
 for (let i = 0; i < 3200 && race.phase !== 'finished'; i++) {
  if (i % 43 === 0) {
   const turn = random();
   input = { left: turn < .25, right: turn > .75, accel: random() > .1 };
  }
  race.step(input);
  noOverlap(race, `${mode}/${scenario} step ${i} keeps all ground cars separate`);
  if (i === 540 && race.phase === 'racing') {
   const saved = race.serialize();
   race = RaceSimulation.restore(saved);
   assert.equal(race.distance, saved.distance);
   assert.equal(race.hp, saved.hp);
   race.setViewport(600, 190);
   noOverlap(race, 'changing screen size on a resumed drive is safe');
  }
 }
}
console.log('PASS separate start grid, long race and police traffic, and legacy recovery without overlap.');
