import assert from 'node:assert/strict';
import {RaceSimulation} from '../dist/racing-model.js';
const make=()=>{const race=new RaceSimulation({random:()=>.4});race.phase='racing';race.distance=300;race.speed=10;race.rivals.forEach((r,i)=>Object.assign(r,{lane:i?-.6:0,target:i?-.6:0,distance:i?1500:300,speed:10,phase:0}));race.x=0;return race;};
const hit=make();hit.step({accel:true});assert.equal(hit.collisions,1,'rival contact is no longer invisible');assert.equal(hit.invulnerable,75);assert(hit.events.some(e=>e.type==='hit'));hit.step({accel:true});assert.equal(hit.collisions,1,'shared cooldown prevents repeated collision while overlapping');
const otherLane=make();otherLane.rivals[0].lane=.6;otherLane.rivals[0].target=.6;otherLane.step({accel:true});assert.equal(otherLane.collisions,0,'separated cars do not collide');
const far=make();far.rivals[0].distance=1000;far.step({accel:true});assert.equal(far.collisions,0,'off-screen cars do not collide');
const jump=make();jump.jump=20;jump.step({accel:true});assert.equal(jump.collisions,0,'jump passes above rivals');
const restore=RaceSimulation.restore(hit.serialize());assert.equal(restore.invulnerable,74);restore.step({accel:true});assert.equal(restore.collisions,1,'cooldown survives resume');
console.log('PASS racing rival contact: visual coordinates, lanes, jumping and cooldown with restore.');
