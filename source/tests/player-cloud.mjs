import assert from 'node:assert/strict';
import {createLocalApp} from '../scripts/dev-server.mjs';
import {GardenProgress} from '../dist/profile.js';
import {GardenSocial} from '../dist/social.js';
import {PlayerCloud,PLAYER_KEY,CLOUD_META,PENDING_RESTORE,DEVICE_KEYS,captureDevice,validateDevice,restoreDevice,applyPendingRestore,localScores} from '../dist/player-cloud.js';
import {ECONOMY_KEY,GAME_KEYS} from '../dist/economy.js';
const makeStorage=initial=>{const map=new Map(Object.entries(initial||{}));return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};};
const app=await createLocalApp({databasePath:':memory:'}),origin='https://garden.example';
const clients=[];
async function client(initial={}){
 const storage=makeStorage(initial),profile=new GardenProgress({storage});await profile.init();let cookie='',reloads=0;
 const fetcher=async(path,init={})=>{const headers=new Headers(init.headers);headers.set('Origin',origin);if(cookie)headers.set('Cookie',cookie);const response=await app(new Request(origin+path,{...init,headers}));const session=response.headers.get('set-cookie');if(session)cookie=session.split(';')[0];return response;};
 const social=new GardenSocial({document:null,location:new URL(origin),fetcher});await social.init();const cloud=new PlayerCloud({social,storage,document:null,reload:()=>reloads++});await cloud.init();clients.push(cloud);return {storage,profile,social,cloud,reloads:()=>reloads};
}
try{
 const a=await client({[GAME_KEYS.suika]:JSON.stringify({gems:50,bestScore:12000}),'suika-garden-best':'17111',[GAME_KEYS.apple]:JSON.stringify({gems:3,best:25}),[GAME_KEYS.blocks]:JSON.stringify({best:450}),unrelated:'keep'});
 assert.equal(a.cloud.ready,true);assert.equal(a.social.user,null);assert.deepEqual(localScores(a.storage),{suika:17111,apple:25,blocks:450});
 await a.cloud.join('이름만');assert.equal(a.social.user.isGuest,true);assert.equal(a.cloud.version,1);assert.equal(a.cloud.conflict,false);
 const identity=JSON.parse(a.storage.getItem(PLAYER_KEY));assert.match(identity.key,/^[A-Za-z0-9_-]{43}$/);assert.equal(identity.userId,a.social.user.id);
 const rank=await a.social._request('/api/leaderboard');assert.equal(rank.scores[0].displayName,'이름만');assert.equal(rank.scores[0].score,17111);
 assert.equal((await a.social._request('/api/leaderboard?game=apple')).scores[0].score,25);
 const snapshot=captureDevice(a.storage);assert(!Object.keys(snapshot.values).includes(PLAYER_KEY));assert(!JSON.stringify(snapshot).includes(identity.key),'private recovery key must never enter progress backup');
 assert.equal(JSON.parse(snapshot.values[ECONOMY_KEY]).gems,53);const before=a.cloud.version;await a.cloud.save();assert.equal(a.cloud.version,before,'unchanged progress does not create save versions');
 const b=await client();await b.cloud.recover(identity.key);assert.equal(b.social.user.id,a.social.user.id);assert.equal(b.reloads(),1);assert(b.storage.getItem(PENDING_RESTORE));
 assert.equal(JSON.parse(b.storage.getItem(ECONOMY_KEY)).gems,0,'restore stages before reload rather than mutating live wallet');
 assert.equal(applyPendingRestore(b.storage).restored,true);assert.equal(b.storage.getItem(PENDING_RESTORE),null);assert.equal(JSON.parse(b.storage.getItem(ECONOMY_KEY)).gems,53);
 // A restored wallet must not add the legacy balances a second time.
 const loaded=new GardenProgress({storage:b.storage});await loaded.init();assert.equal(loaded.profile.gems,53);assert.equal(loaded.profile.bestScore,17111);
 await b.cloud.join('이름 바꿈');assert.equal((await a.social._request('/api/leaderboard')).scores[0].displayName,'이름 바꿈');
 // Simultaneous writes share one request and never conflict with themselves.
 await a.profile.buyItem('shake');await Promise.all([a.cloud.save(),a.cloud.save(),a.cloud.save()]);assert.equal(a.cloud.version,before+1);
 const c=await client({[PLAYER_KEY]:JSON.stringify(identity)});assert.equal(c.social.user.id,a.social.user.id);assert(c.cloud.conflict,'new origin with no save metadata must ask before replacing progress');
 const remote=(await c.social._request('/api/cloud-save')).snapshot;await c.cloud.save();assert.deepEqual((await a.social._request('/api/cloud-save')).snapshot,remote,'conflict must not overwrite server progress');
 // A restored device that becomes stale gets CAS rejection and keeps its own wallet.
 b.cloud.restoring=false;b.cloud.connected=true;b.cloud.version=before;b.cloud.conflict=false;await assert.rejects(()=>b.cloud.save(),e=>e.code==='CLOUD_CONFLICT');assert(b.cloud.conflict);assert.equal(JSON.parse(b.storage.getItem(ECONOMY_KEY)).gems,53);
 const plain=makeStorage({unrelated:'keep'});restoreDevice(snapshot,plain);assert.equal(plain.getItem('unrelated'),'keep');assert.deepEqual(captureDevice(plain),snapshot);
 const unchanged=JSON.stringify([...plain.map]);assert.throws(()=>restoreDevice({version:1,values:{...snapshot.values,[ECONOMY_KEY]:'bad'}},plain));assert.equal(JSON.stringify([...plain.map]),unchanged,'invalid backup cannot replace valid local progress');
 assert.throws(()=>validateDevice({version:1,values:{...snapshot.values,'auth-token':'private'}}));
 assert.throws(()=>validateDevice({version:1,values:{...snapshot.values,[ECONOMY_KEY]:snapshot.values[ECONOMY_KEY].replace('"records":{','"records":{"__proto__":{},')}}));
 const interrupted=makeStorage(Object.fromEntries(plain.map)),previous=Object.fromEntries(DEVICE_KEYS.map(key=>[key,interrupted.getItem(key)]));let interruptedOnce=false;const write=interrupted.setItem;interrupted.setItem=(key,value)=>{if(key==='suika-garden-best'&&!interruptedOnce){interruptedOnce=true;throw Error('quota');}write(key,value);};
 const changed=structuredClone(snapshot),wallet=JSON.parse(changed.values[ECONOMY_KEY]);wallet.gems+=123;changed.values[ECONOMY_KEY]=JSON.stringify(wallet);assert.throws(()=>restoreDevice(changed,interrupted),/quota/);assert.deepEqual(Object.fromEntries(DEVICE_KEYS.map(key=>[key,interrupted.getItem(key)])),previous,'interrupted write restores all previous device keys');
 interrupted.setItem=write;interrupted.setItem(PENDING_RESTORE,JSON.stringify({snapshot:{},meta:{}}));assert.equal(applyPendingRestore(interrupted).restored,false);assert.deepEqual(Object.fromEntries(DEVICE_KEYS.map(key=>[key,interrupted.getItem(key)])),previous);
 // Network failure never blocks local play, deletes identity, or disables future retries.
 const offlineStorage=makeStorage({[PLAYER_KEY]:JSON.stringify(identity)}),offlineSocial={user:null,_request:async()=>{throw Error('offline');}},offline=new PlayerCloud({social:offlineSocial,storage:offlineStorage,document:null});clients.push(offline);await offline.init();assert(offline.ready);assert(offline.timer);assert.equal(JSON.parse(offlineStorage.getItem(PLAYER_KEY)).key,identity.key);
 console.log('PASS nickname player flow: historical high scores, password-free identity, isolated recovery keys, cloud autosave/deduplication, staged cross-origin restore, wallet preservation, conflict protection, atomic rollback and offline play.');
}finally{for(const cloud of clients)cloud.dispose();app.close();}
