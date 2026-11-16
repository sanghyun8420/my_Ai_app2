import assert from 'node:assert/strict';
import {GardenProgress} from '../dist/profile.js';
import {FruitWorld} from '../dist/physics.js';
import {FRUITS} from '../dist/fruits.js';
import {GameSave} from '../dist/save-state.js';
import {ECONOMY_KEY,GAME_KEYS} from '../dist/economy.js';

const values=new Map([[GAME_KEYS.suika,JSON.stringify({coins:20000})]]);
const storage={fail:false,getItem:k=>values.get(k)??null,setItem(k,v){if(this.fail)throw Error('quota');values.set(k,String(v));}};
let progress=new GardenProgress({storage});await progress.init();await progress.startRun({fresh:true});const runId=progress.pendingRun.id;
const world=new FruitWorld({fruits:FRUITS}),save=new GameSave({storage});
function request(tick){world.tick=tick;return {requestId:'continue-'+tick,runId,score:0,mergedFruits:0,snapshot:{runId,world:world.serialize(),mode:'classic',aimX:300,shakes:0,shakeReadyAt:0,dropCount:0,itemCount:0,roundCleared:0,maxLevel:0,watermelonMade:false,secretDiscovered:false,activeLevel:0,nextLevel:0,activeSpecial:false,nextSpecial:false}};}
async function acknowledge(){const pending=progress.getPendingRevival();assert(save.write(pending.snapshot));await progress.acknowledgeRevival(pending.requestId);}
assert.equal(progress.getRevivalCost(),10);
const first=request(1),results=await Promise.all([progress.purchaseRevival(first),progress.purchaseRevival(first)]);
assert.equal(results.filter(r=>r.purchased).length,1);assert.equal(progress.profile.coins,19990);assert.equal(progress.pendingRun.revivalCount,1);assert.equal(progress.getRevivalCost(),100);await acknowledge();
await assert.rejects(()=>progress.purchaseRevival({...first,requestId:'stale-other'}),e=>e.code==='REVIVAL_STALE');assert.equal(progress.getRevivalCost(),100);
await progress.purchaseRevival(request(2));assert.equal(progress.profile.coins,19890);assert.equal(progress.getPendingRevival().cost,100);
progress=new GardenProgress({storage});await progress.init();assert.equal(progress.getRevivalCost(),1000);assert.equal(progress.getPendingRevival().cost,100,'a higher-cost paid board survives reload');await acknowledge();
const durable=storage.getItem(ECONOMY_KEY);storage.fail=true;await assert.rejects(()=>progress.purchaseRevival(request(3)));assert.equal(progress.profile.coins,19890);assert.equal(progress.pendingRun.revivalCount,2);assert.equal(progress.getPendingRevival(),null);assert.equal(storage.getItem(ECONOMY_KEY),durable);storage.fail=false;
await progress.purchaseRevival(request(3));assert.equal(progress.profile.coins,18890);assert.equal(progress.getPendingRevival().cost,1000);await acknowledge();
await progress.purchaseRevival(first);assert.equal(progress.profile.coins,18890);assert.equal(progress.getRevivalCost(),10000,'old requests cannot charge again or change the multiplier');
progress.profile.coins=9;progress._save();await assert.rejects(()=>progress.purchaseRevival(request(4)),e=>e.code==='INSUFFICIENT_GEMS');assert.equal(progress.profile.coins,9);assert.equal(progress.getRevivalCost(),10000);
// Missing counters from old saves are recovered from this round's paid receipts.
const root=JSON.parse(storage.getItem(ECONOMY_KEY));delete root.records[GAME_KEYS.suika].activeRun.revivalCount;storage.setItem(ECONOMY_KEY,JSON.stringify(root));progress=new GardenProgress({storage});await progress.init();assert.equal(progress.getRevivalCost(),10000);
await progress.startRun({fresh:true});assert.notEqual(progress.pendingRun.id,runId);assert.equal(progress.pendingRun.revivalCount,0);assert.equal(progress.getRevivalCost(),10);
progress.pendingRun.revivalCount=15;assert.equal(progress.getRevivalCost(),null,'unaffordable prices beyond safe currency precision cannot overflow or become free');
console.log('PASS revival prices:10→100→1000→10000, exact coin charges, same-request concurrency, replay/stale guards, saved multiplier and paid recovery, insufficient funds/quota rollback, old-save migration and fresh-round reset.');
