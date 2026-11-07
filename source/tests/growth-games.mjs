import assert from 'node:assert/strict';
import { FruitExpedition, AppleOrchard, GEAR, VARIETIES, stageName } from '../dist/growth-models.js';
const storage=()=>{const values=new Map();return {values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value))};};
const advance=(game,seconds,stop=()=>false)=>{for(let i=0;i<seconds*10;i++){game.tick(.1);if(stop())break;}};

const saved=storage(),quest=new FruitExpedition({storage:saved,seed:42});
assert.equal(quest.data.coins,60);assert.equal(quest.data.gems,0);assert.throws(()=>quest.challenge());assert.throws(()=>quest.chooseTier(1));
quest.upgrade('attack');const damage=quest.stats().damage;assert(damage>8);assert.equal(quest.data.coins,42);
quest.start();advance(quest,80,()=>quest.ready);assert(quest.ready);assert(quest.data.stats.kills>=10);assert(quest.data.coins>40);
quest.challenge();advance(quest,40,()=>quest.phase!=='boss');assert.equal(quest.phase,'victory','first boss is beatable with early upgrades');assert.equal(quest.data.progress[0],1);assert.equal(quest.data.stats.bosses,1);assert(quest.result.gems>=10);
const reloaded=new FruitExpedition({storage:saved});assert.equal(reloaded.data.progress[0],1);assert.equal(reloaded.data.coins,quest.data.coins);assert.equal(reloaded.data.upgrades.attack,1);assert.equal(reloaded.phase,'camp');

quest.data.waveKills=10;quest.challenge();quest.bossLeft=.05;const coins=quest.data.coins,gems=quest.data.gems;quest.tick(.1);assert.equal(quest.phase,'defeat');assert.equal(quest.data.coins,coins);assert.equal(quest.data.gems,gems);assert(quest.ready);quest.upgrade('health');quest.challenge();assert.equal(quest.phase,'boss');assert.equal(quest.hp,quest.stats().maxHp);
const unlock=new FruitExpedition({storage:storage()});unlock.data.progress[0]=14;unlock.data.waveKills=10;unlock.data.upgrades={attack:50,health:50,recovery:10};unlock.challenge();advance(unlock,40,()=>unlock.phase!=='boss');assert.equal(unlock.data.unlocked,1);unlock.chooseTier(1);assert.equal(stageName(unlock.index),'1-1');

// Verify all75 encounters have a reachable win state, including the Hell cap.
const final=new FruitExpedition({storage:storage()});final.data.upgrades={attack:180,health:180,recovery:100};for(let tier=0;tier<5;tier++){if(tier)final.chooseTier(tier);for(let stage=0;stage<15;stage++){final.data.waveKills=10;final.challenge();advance(final,40,()=>final.phase!=='boss');assert.equal(final.phase,'victory',`${tier}:${stage} is reachable`);}}assert.equal(final.data.progress[4],15);assert.equal(final.data.stats.bosses,75);

const rolls=new FruitExpedition({storage:storage(),seed:17});rolls.data.coins=1000;rolls.data.pity=29;const forced=rolls.draw(1);assert(forced[0].rarity>=2);assert.equal(rolls.data.pity,0);const many=rolls.draw(10);assert.equal(many.length,10);assert.equal(rolls.data.coins,340);assert.equal(rolls.data.pulls,11);
const owned=GEAR.find(g=>rolls.data.gear[g.id]>0&&g.slot==='weapon');rolls.equip(0,owned.id);rolls.equip(1,owned.id);assert.equal(rolls.data.equipped[0].weapon,null);assert.equal(rolls.data.equipped[1].weapon,owned.id);assert.throws(()=>rolls.equip(3,owned.id));assert.throws(()=>rolls.draw(2));
let fail=true;const quota=new FruitExpedition({storage:{getItem:()=>null,setItem:()=>{if(fail)throw Error('quota');}},seed:9});const before=JSON.stringify(quota.data);assert.throws(()=>quota.draw());assert.equal(JSON.stringify(quota.data),before,'failed save rolls back gacha currency, rewards and RNG');fail=false;const ok=quota.draw();assert.equal(ok.length,1);
rolls.data.stats.kills=100;const oldGems=rolls.data.gems;assert(rolls.claim('kills100'));assert(!rolls.claim('kills100'));assert.equal(rolls.data.gems,oldGems+16);

let now=100000;const orchardStore=storage(),orchard=new AppleOrchard({storage:orchardStore,now:()=>now});assert.equal(orchard.stage,0);const initial=orchard.data.water;orchard.water();assert(orchard.data.water>initial);assert.throws(()=>orchard.water());now+=3100;orchard.water();const oldCoins=orchard.data.coins;orchard.feed();assert.equal(orchard.data.coins,oldCoins-5);orchard.sunlight();
for(let i=0;i<1300&&orchard.data.growth<100;i++){now+=100;orchard.tick(.1);}assert.equal(orchard.stage,5);const crop=orchard.harvest();assert(crop.apples>=4&&crop.coins>0&&crop.gems===0);assert.equal(orchard.data.growth,0);assert.equal(orchard.data.stats.harvests,1);assert.throws(()=>orchard.harvest());assert.equal(quest.data.gems,gems,'orchard gems never change expedition wallet');
orchard.data.bug=true;now+=2000;const bug=orchard.touch();assert(bug.bug);assert.equal(orchard.data.stats.bugs,1);assert(!orchard.data.bug);
orchard.data.coins=1000;orchard.buyVariety('green');assert(orchard.data.owned.includes('green'));const bought=orchard.data.coins;orchard.buyVariety('green');assert.equal(orchard.data.coins,bought);orchard.plant('green');assert.equal(orchard.variety.id,'green');orchard.upgrade('soil');assert.equal(orchard.data.upgrades.soil,1);orchard.save();
now+=8*3600*1000;const offline=new AppleOrchard({storage:orchardStore,now:()=>now});assert(offline.data.growth>0);assert(offline.data.growth<=100);const noHarvest=offline.data.stats.harvests;offline.save();const offlineAgain=new AppleOrchard({storage:orchardStore,now:()=>now});assert.equal(offlineAgain.data.growth,offline.data.growth);assert.equal(offlineAgain.data.stats.harvests,noHarvest,'offline growth does not mint repeated harvest rewards');
offline.data.stats.harvests=10;const claimed=offline.data.gems;assert(offline.claim('harvest10'));assert(!offline.claim('harvest10'));assert.equal(offline.data.gems,claimed+17);
assert.notEqual(quest.key,orchard.key);assert.equal(VARIETIES.length,5);
console.log('PASS growth games: actual waves, boss win/fail/retry,75-stage completion bounds, upgrades, gacha guarantee/equip/rollback, orchard care/harvest/offline saves and independent coins/shared gems.');
