import assert from 'node:assert/strict';
import {ExpeditionJourney} from '../dist/growth-journey.js';
import {FruitExpedition} from '../dist/growth-models.js';
const travel=new ExpeditionJourney();
travel.advance();travel.advance();travel.advance();
let last=0;
for(let i=0;i<300;i++){travel.tick(1/60,'waves');assert(travel.distance>=last&&travel.distance<=288,'camera advances without reversing or overshooting');last=travel.distance;}
assert(Math.abs(travel.distance-288)<.1,'consecutive kills finish all queued movement');
travel.advance();travel.tick(.1,'waves');const stopped=travel.distance;
for(const phase of ['boss','camp','defeat']){travel.tick(.1,phase);assert.equal(travel.distance,stopped,'encounter and resting screens must not drift');assert.equal(travel.target,stopped,'old travel cannot resume after an encounter change');}
travel.tick(.1,'waves');assert.equal(travel.distance,stopped,'returning to waves does not restart cancelled movement');
travel.advance(true);for(let i=0;i<300;i++)travel.tick(1/60,'victory');assert(Math.abs(travel.distance-stopped-160)<.1,'boss victory starts its own journey');
const enemy={id:7,x:550,boss:false,hp:100},original={...enemy};travel.track([enemy]);const hit=travel.effect({type:'hit',enemyId:7,x:550});
travel.advance();travel.tick(.1,'waves');assert(travel.project(enemy)<550);assert.equal(travel.projectEffect(hit).x,travel.project(enemy),'hit effects and surviving enemies share the camera');assert.deepEqual(enemy,original,'camera projection never changes combat coordinates');
// A long march must not visually park a distant monster on the combat frontline.
travel.distance+=400;enemy.x=300;assert(travel.project(enemy)>213,'a monster outside combat range still visibly approaches');
for(const type of ['hit','shot','tap']){const effect=travel.effect({type,enemyId:7,x:enemy.x});travel.distance+=20;enemy.x-=1;assert.equal(travel.projectEffect(effect).x,travel.project(enemy),`${type} stays attached while the camera and target move`);assert.equal(travel.projectEffect(effect,true).x,effect.x,'reduced motion keeps raw combat coordinates');}
enemy.x=213;const frontHit=travel.effect({type:'hit',enemyId:7,x:213});travel.distance+=30;assert.equal(travel.project(enemy),213);assert.equal(travel.projectEffect(frontHit).x,213,'contact effects cannot drift behind a clamped frontline');
const coin=travel.effect({type:'coin',enemyId:7,x:213});travel.trim([]);const coinAt=travel.projectEffect(coin).x;travel.distance+=10;assert.equal(travel.projectEffect(coin).x,coinAt-10,'defeated enemies and coins remain attached to the scenery');assert.equal(travel.origins.size,0);assert.equal(travel.enemies.size,0,'completed enemies do not accumulate in memory');
travel.target=travel.distance;travel.track([{id:12,x:450}]);travel.advance();travel.tick(.1,'waves');const resetAt=travel.distance;travel.reset();assert.equal(travel.distance,resetAt);assert.equal(travel.target,resetAt);assert.equal(travel.speed,0);assert.equal(travel.origins.size,0);assert.equal(travel.enemies.size,0);travel.tick(.1,'waves');assert.equal(travel.distance,resetAt,'reset preserves scenery but cancels a stale march');
travel.advance();travel.tick(.1,'waves',true);assert.equal(travel.distance,travel.target);assert.equal(travel.walk,0,'reduced motion does not build a delayed walking animation');
// Confirm movement is earned by completed fights without changing their reward or save data.
const records=new Map(),game=new FruitExpedition({storage:{getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)}}),journey=new ExpeditionJourney();game.start();
for(let i=0;i<100;i++){journey.track(game.enemies);const events=game.tick(.1);journey.track(game.enemies);for(const event of events)if(event.type==='coin')journey.advance();journey.trim(game.enemies);journey.tick(.1,game.phase);}
assert(game.data.stats.kills>0);assert.equal(journey.target,game.data.stats.kills*96);assert(journey.distance>0);const before=JSON.stringify(game);for(let i=0;i<60;i++)journey.tick(1/60,'waves');assert.equal(JSON.stringify(game),before,'visual movement never awards extra currency or kills');
console.log('PASS expedition travel: queued kills, stopped/reset encounters, victory continuation, approaching enemies, attached hit/shot/tap effects, cleanup, reduced motion and untouched rewards.');
