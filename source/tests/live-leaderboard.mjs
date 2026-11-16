import assert from 'node:assert/strict';
import {LiveLeaderboard} from '../dist/leaderboard-live.js';
let tick,clears=0,visible=true,user='first',calls=[],rendered=[],statuses=[],syncs=0,failSync=false;
const waiting=[];
const board=new LiveLeaderboard({setTimer:fn=>{tick=fn;return 1;},clearTimer:()=>clears++,visible:()=>visible,context:()=>user,sync:async()=>{syncs++;if(failSync)throw Error('오프라인 기록 보존');},read:game=>{calls.push(game);return new Promise((resolve,reject)=>waiting.push({resolve,reject}));},render:(value,game)=>rendered.push({value,game}),status:value=>statuses.push(value)});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
try{
 const first=board.open('suika');await turn();assert.equal(syncs,1);assert.deepEqual(calls,['suika']);assert.equal(board.refresh(),first,'same request coalesces');
 waiting.shift().resolve({scores:[{score:100}]});await first;assert.equal(rendered.length,1);assert(statuses.at(-1).updatedAt);
 visible=false;tick();await turn();assert.equal(calls.length,1,'background tabs do not poll');visible=true;tick();await turn();assert.equal(calls.length,2);
 const poll=waiting.shift(),apple=board.open('apple');await turn();poll.resolve({scores:[{score:9999}]});await turn();assert.equal(rendered.length,1,'old game response cannot overwrite the selected game');
 waiting.shift().resolve({scores:[{score:20}]});await apple;assert.equal(rendered.at(-1).game,'apple');
 const stale=board.refresh();await turn();const pending=waiting.shift();user='second';pending.resolve({me:{id:'first'}});await stale;assert.equal(rendered.length,2,'old account response cannot expose its own-rank panel after account switch');
 failSync=true;const retry=board.refresh({sync:true});await turn();waiting.shift().resolve({scores:[]});await retry;assert(statuses.at(-1).warning.includes('오프라인'));
 const failed=board.refresh();await turn();waiting.shift().reject(Error('network'));await failed;assert.equal(statuses.at(-1).error,'network');assert.equal(rendered.length,3,'failed refresh keeps the last displayed ranking');
 const closing=board.refresh();await turn();const late=waiting.shift();board.close();late.resolve({scores:[{score:1}]});await closing;assert.equal(rendered.length,3);assert.equal(board.timer,null);assert(clears>=3);await board.refresh();assert.equal(waiting.length,0);
 console.log('PASS live leaderboard: five-second visible polling, request coalescing, tab/account race guards, manual sync, retained rows on failure, warnings and timer cleanup.');
}finally{board.close();}
