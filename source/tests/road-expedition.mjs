import assert from 'node:assert/strict';
import {RaceSimulation,RacingGarage,CARS,effectiveCar,raceTelemetry,WORLD_TRAVEL_SCALE} from '../dist/racing-model.js';
import {FruitExpedition} from '../dist/growth-models.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))};};
const car=effectiveCar(CARS[0]);
const drive=new RaceSimulation({car,mode:'drive',random:()=>.5,id:'three-collisions'});
drive.phase='racing';drive.speed=8;drive.x=0;
const contact=r=>{r.x=0;r.traffic=[{lane:0,y:533,speed:r.speed,color:'#fff'}];r.update(1/60,{accel:true});};
contact(drive);assert.equal(drive.collisions,1);assert.equal(drive.phase,'racing');
// A vehicle still overlapping after the immunity period is the same accident.
for(let i=0;i<100;i++){drive.traffic[0].y=533;drive.traffic[0].lane=drive.x;drive.update(1/60,{});}
assert.equal(drive.collisions,1);drive.invulnerable=0;contact(drive);assert.equal(drive.collisions,2);
const saved=RaceSimulation.restore(drive.serialize());assert.equal(saved.collisions,2);saved.invulnerable=0;saved.trackCoins=37;
const s=storage(),garage=new RacingGarage({storage:s});garage.save();garage.checkpoint(saved);const before=garage.data.coins;
contact(saved);assert.equal(saved.phase,'finished');assert.equal(saved.result.crashed,true);assert.equal(saved.result.collisions,3);
saved.update(1,{accel:true});assert.equal(saved.collisions,3);assert(garage.finish(saved.result).awarded);assert.equal(garage.data.coins,before+37);assert.equal(garage.data.stage,1);assert.equal(garage.data.completedRaces,0);assert.equal(garage.finish(saved.result).awarded,false);
const race=new RaceSimulation({car});race.phase='racing';for(let i=0;i<4;i++){race.invulnerable=0;contact(race);}assert.equal(race.collisions,4);assert.equal(race.phase,'racing','race mode retains podium-based completion');
const curb=new RaceSimulation({car,mode:'drive'});curb.phase='racing';curb.x=1;curb.update(1/60,{});assert.equal(curb.collisions,0);
const pacing=new RaceSimulation({car,mode:'drive'});pacing.phase='racing';for(let i=0;i<60;i++)pacing.update(1/60,{accel:true});assert(pacing.speed>3&&pacing.speed<car.scrollSpeed*.5,'speed builds over several seconds');pacing.speed=car.scrollSpeed;pacing.traffic=[];const start=pacing.distance;pacing.update(1/60,{accel:true});assert.equal(raceTelemetry(pacing).speed,car.maxSpeed);assert(Math.abs(pacing.distance-start-car.scrollSpeed*WORLD_TRAVEL_SCALE)<1e-9);assert(WORLD_TRAVEL_SCALE<.6,'the world moves slower while the meter retains its scale');
const old=drive.serialize();delete old.collisions;assert.equal(RaceSimulation.restore(old).collisions,0);assert.equal(RaceSimulation.restore({...old,collisions:-1}),null);
const qs=storage(),q=new FruitExpedition({storage:qs});q.start();assert.equal(q.enemies.length,3);assert.equal(new Set(q.enemies.map(e=>e.y)).size,3);assert(q.enemies.every(e=>e.x>=440));
q.attackClock=-100;for(let i=0;i<90;i++)q.tick(.1);assert.equal(q.enemies.length,6,'enemy groups have a bounded population');
q.data.waveKills=10;q.challenge();const index=q.index,tier=q.data.tier;q.bossLeft=.001;q.tick(.01);assert.equal(q.phase,'defeat');assert.equal(q.data.bossRetry[tier],true);assert.equal(q.index,index);
const resumed=new FruitExpedition({storage:qs});assert(resumed.ready);assert.equal(resumed.index,index);resumed.start();assert.equal(resumed.enemies.length,3,'failed boss allows ordinary-enemy farming');resumed.upgrade('attack');assert.equal(resumed.index,index);resumed.challenge();assert.equal(resumed.enemies[0].name,q.makeEnemy(true).name);resumed.enemies[0].hp=1;assert(resumed.tap());assert.equal(resumed.phase,'victory');assert.equal(resumed.data.bossRetry[tier],false);assert.equal(resumed.index,index+1);const coins=resumed.data.coins;resumed.tick(.1);assert.equal(resumed.data.coins,coins);
assert.equal(new FruitExpedition({storage:qs}).data.bossRetry[tier],false);
console.log('PASS road/expedition: three distinct collisions and reload, curb/race exceptions, exact crash payout, gradual acceleration with unchanged speed scale, enemy groups/cap, persistent same-boss farming/upgrades/retry and single victory reward.');
