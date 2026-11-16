import assert from 'node:assert/strict';
import {LiveLeaderboard} from '../dist/leaderboard-live.js';
import {PlayerCloud} from '../dist/player-cloud.js';

// Window timer methods reject a class instance as their receiver. Node timers
// accept it, so ordinary server-side tests cannot detect this browser failure.
const names=['setInterval','clearInterval','setTimeout','clearTimeout'];
const originals=Object.fromEntries(names.map(name=>[name,globalThis[name]]));
const timers=new Map();let sequence=0;
for(const name of names)globalThis[name]=function(callback,delay){
 if(this!==undefined&&this!==globalThis)throw new TypeError('Illegal invocation');
 if(name.startsWith('clear')){timers.delete(callback);return;}
 const id=++sequence;timers.set(id,{kind:name,callback,delay});return id;
};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
let board,cloud;
try{
 let reads=0,rendered=0,hang=false;const states=[];
 board=new LiveLeaderboard({read:async()=>{reads++;if(hang)return new Promise(()=>{});return {scores:[{id:'player',displayName:'정원사',score:14898,rank:1}]};},render:()=>rendered++,status:state=>states.push(state),sync:async()=>false});
 await board.open('suika');await turn();assert.equal(reads,1);assert.equal(rendered,1,'default browser timers must let the first public request run');
 const poll=[...timers.values()].find(t=>t.kind==='setInterval');assert.equal(poll.delay,5000);poll.callback();await turn();assert.equal(rendered,2,'visible polling uses correctly bound browser timers');
 hang=true;const pending=board.refresh();await turn();const deadline=[...timers.values()].find(t=>t.kind==='setTimeout'&&t.delay===12000);assert(deadline);deadline.callback();await pending;assert(states.at(-1).error);assert.equal(states.at(-1).loading,false);
 hang=false;poll.callback();await turn();assert.equal(rendered,3,'a browser deadline failure does not disable the next automatic read');
 board.close();assert.equal(timers.size,0,'closing clears browser timers without illegal invocation');board=null;

 cloud=new PlayerCloud({social:{user:null},document:null,autoGuest:false});await cloud.init();assert(cloud.ready);const automatic=[...timers.values()].find(t=>t.kind==='setInterval');assert.equal(automatic.delay,5000,'automatic save initialization survives browser receiver checks');
 automatic.callback();await turn();cloud.dispose();cloud=null;assert.equal(timers.size,0);
 console.log('PASS browser timer contracts: public rankings load/poll/retry/close and player autosave starts/disposes with Window-style receiver checks.');
}finally{
 board?.close();cloud?.dispose();for(const name of names)globalThis[name]=originals[name];
}
