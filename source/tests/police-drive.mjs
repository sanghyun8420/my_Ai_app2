import assert from 'node:assert/strict';
import {RaceSimulation,RacingGarage,CARS,effectiveCar,DIFFICULTIES} from '../dist/racing-model.js';
import {GardenProgress} from '../dist/profile.js';
import {GAME_KEYS} from '../dist/economy.js';
const memory=(seed={})=>{const m=new Map(Object.entries(seed).map(([k,v])=>[k,JSON.stringify(v)]));return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))};};
const car=effectiveCar(CARS[0]);
const p=new RaceSimulation({car,mode:'drive',scenario:'police'});p.phase='racing';p.setViewport(900,187);
for(const [seconds,stars,count,kinds]of [[0,1,1,['patrol']],[20,2,2,['patrol']],[40,3,4,['patrol']],[60,4,4,['patrol']],[80,5,6,['armored','helicopter']],[100,6,7,['tank']]]){p.elapsed=seconds;p.update(1/60,{});assert.equal(p.wanted,stars);assert.equal(p.police.length,count);for(const kind of kinds)assert(p.police.some(c=>c.kind===kind));}
assert(p.police.every(car=>car.y>533),'police remain behind the player');
p.tick=419;p.update(1/60,{});assert.equal(p.roadblocks.length,1);const restored=RaceSimulation.restore(p.serialize());assert.equal(restored.scenario,'police');assert.equal(restored.hp,100);assert.equal(restored.wanted,6);assert.equal(restored.police.length,7);assert.equal(restored.roadblocks.length,1);
const race=new RaceSimulation({car});race.phase='racing';race.elapsed=120;race.update(1/60,{});assert.equal(race.police.length,0);assert.equal(race.wanted,0);
const normal=new RaceSimulation({car,mode:'drive'});normal.phase='racing';normal.speed=8;for(let i=0;i<4;i++){normal.invulnerable=0;normal.x=0;normal.traffic=[{lane:0,y:533,speed:8,color:'#fff'}];normal.update(1/60,{});assert.equal(normal.hp,75-25*i);}assert.equal(normal.phase,'finished');assert(normal.result.crashed);
const hard=new RaceSimulation({car,mode:'drive',scenario:'hard',difficulty:'hell'});hard.phase='racing';hard.speed=8;for(let i=0;i<3;i++){hard.invulnerable=0;hard.x=0;hard.traffic=[{lane:0,y:533,speed:8,color:'#fff'}];hard.update(1/60,{});}assert.equal(hard.hp,0);assert.equal(hard.phase,'finished');
const lanes=new Set();for(const random of [()=>0,()=>.26,()=>.51,()=>.99]){const r=new RaceSimulation({car,random});r.phase='racing';r.speed=8;r.tick=DIFFICULTIES.easy.nitro-1;r.update(1/60,{accel:true});lanes.add(r.zones[0].lane);}assert.equal(lanes.size,4);
const saved=memory(),garage=new RacingGarage({storage:saved});garage.save();garage.select('selectedDriveScenario','police');assert.equal(new RacingGarage({storage:saved}).data.selectedDriveScenario,'police');
const stock=memory({[GAME_KEYS.suika]:{coins:100000,inventory:{shake:999}}}),progress=new GardenProgress({storage:stock});await progress.init();await progress.buyItem('shake');assert.equal(progress.profile.inventory.shake,1000);assert.equal(new GardenProgress({storage:stock}).profile.inventory.shake,1000);
console.log('PASS police drive: time-based 1/2/4 patrol escalation, barricades, armor/helicopter/tank, persisted HP and encounters, police restricted to drive, damage/game over, harder road, randomized pads and purchases beyond 999.');
