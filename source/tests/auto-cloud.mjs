import assert from 'node:assert/strict';
import {createLocalApp} from '../scripts/dev-server.mjs';
import {GardenProgress} from '../dist/profile.js';
import {GardenSocial} from '../dist/social.js';
import {PlayerCloud,PLAYER_KEY,CLOUD_META,PENDING_RESTORE,applyPendingRestore} from '../dist/player-cloud.js';
import {ECONOMY_KEY,GAME_KEYS} from '../dist/economy.js';

const app=await createLocalApp({databasePath:':memory:'}),origin='https://garden.example',clients=[];
const storageFor=initial=>{const map=new Map(Object.entries(initial||{}));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
async function client(initial={},options={}){
 const storage=storageFor(initial),profile=new GardenProgress({storage});await profile.init();let cookie='',reloads=0,offline=!!options.offline,loseAck=false;
 const calls=[];
 const fetcher=async(path,init={})=>{
  calls.push({path,...init});if(offline)throw Error('offline');const headers=new Headers(init.headers);headers.set('Origin',origin);if(cookie)headers.set('Cookie',cookie);
  const response=await app(new Request(origin+path,{...init,headers}));const session=response.headers.get('set-cookie');if(session)cookie=session.split(';')[0];
  if(loseAck&&path==='/api/cloud-save'&&init.method==='POST'&&response.ok){loseAck=false;throw Error('lost acknowledgement');}return response;
 };
 const social=new GardenSocial({document:null,location:new URL(origin),fetcher});await social.init();
 const cloud=new PlayerCloud({social,storage,document:null,reload:()=>reloads++,beforeCapture:()=>profile._save()});clients.push(cloud);await cloud.init();
 return {storage,profile,social,cloud,calls,reloads:()=>reloads,online:()=>{offline=false;},expire:()=>{cookie='';},loseAck:()=>{loseAck=true;}};
}
const copy=c=>Object.fromEntries(c.storage.map);
const earn=(c,n)=>{c.profile._profile.gems+=n;c.profile._save();};
try{
 const a=await client({[GAME_KEYS.suika]:JSON.stringify({gems:80,bestScore:12345})});
 assert(a.social.user.isGuest,'first play silently creates a private guest identity');assert.equal(a.cloud.version,1);assert.equal(a.cloud.intervalMs,5000);assert.equal(a.cloud.conflict,false);assert.equal(a.reloads(),0);
 const identity=JSON.parse(a.storage.getItem(PLAYER_KEY));assert.equal(a.calls.filter(c=>c.path==='/api/guest').length,1);
 await a.cloud.save();await a.cloud.save();assert.equal(a.cloud.version,1,'routine local revision changes do not cause duplicate server writes');
 assert.equal((await a.social._request('/api/leaderboard')).scores[0].score,12345);
 const b=await client({[PLAYER_KEY]:JSON.stringify(identity),unrelated:'keep'});
 assert.equal(b.social.user.id,a.social.user.id);assert.equal(b.cloud.conflict,false);assert.equal(b.reloads(),1,'a linked new device automatically stages the latest server save');
 assert.equal(JSON.parse(b.storage.getItem(ECONOMY_KEY)).gems,0,'live wallet remains intact until reload');assert(b.storage.getItem('garden-device-backup-v1'));
 assert(applyPendingRestore(b.storage).restored);b.cloud.dispose();const b2=await client(copy(b));assert.equal(b2.profile.profile.gems,80);assert.equal(b2.reloads(),0);
 earn(b2,7);await b2.cloud.save();const remoteVersion=b2.cloud.version;earn(a,3);
 await a.cloud.save();assert.equal(a.cloud.conflict,false);assert.equal(a.reloads(),1,'stale CAS automatically loads the newer server save');
 assert.equal(JSON.parse(JSON.parse(a.storage.getItem(PENDING_RESTORE)).snapshot.values[ECONOMY_KEY]).gems,87);
 assert.equal(JSON.parse(JSON.parse(a.storage.getItem('garden-device-backup-v1')).values[ECONOMY_KEY]).gems,83,'the superseded device wallet remains recoverable');

 // Resume after an accepted request whose response was lost: preserve newer local progress.
 const ack=await client(copy(b2));earn(ack,4);ack.loseAck();await assert.rejects(()=>ack.cloud.save(),e=>e.code==='NETWORK_ERROR');
 const pending=JSON.parse(ack.storage.getItem(CLOUD_META)).pending;assert.equal(pending.version,remoteVersion);earn(ack,6);ack.cloud.dispose();
 const resumed=await client(copy(ack));assert.equal(resumed.reloads(),0,'an unacknowledged own save must not roll back newer offline progress');assert.equal(resumed.profile.profile.gems,97);assert.equal(JSON.parse((await resumed.social._request('/api/cloud-save')).snapshot.values[ECONOMY_KEY]).gems,97);
 assert(!JSON.parse(resumed.storage.getItem(CLOUD_META)).pending);
 await resumed.social._request('/api/player/name',{method:'POST',body:{displayName:'연결된 정원'}});
 const mirror=await client({[PLAYER_KEY]:JSON.stringify(identity)});assert.equal(mirror.social.user.displayName,'연결된 정원');mirror.cloud.dispose();

 const offline=await client({[GAME_KEYS.suika]:JSON.stringify({gems:12})},{offline:true});assert(offline.cloud.ready);assert(!offline.social.user);const offlineKey=JSON.parse(offline.storage.getItem(PLAYER_KEY)).key;
 offline.online();await offline.cloud.synchronize();assert(offline.social.user);assert.equal(JSON.parse(offline.storage.getItem(PLAYER_KEY)).key,offlineKey);assert.equal(offline.profile.profile.gems,12);
 offline.expire();earn(offline,2);await assert.rejects(()=>offline.cloud.save(),e=>e.status===401);assert.equal(offline.social.user,null);
 await offline.cloud.synchronize();assert(offline.social.user.isGuest);assert.equal(JSON.parse(offline.storage.getItem(PLAYER_KEY)).key,offlineKey,'expired guest sessions recover the same identity');

 const account=await client({[CLOUD_META]:JSON.stringify({userId:'ga_registered',kind:'account',version:4}),[GAME_KEYS.suika]:JSON.stringify({gems:30})});
 assert(account.cloud.needsLogin);assert(!account.social.user);assert(!account.storage.getItem(PLAYER_KEY),'an expired registered login never silently forks into a guest');
 const oldGems=offline.storage.getItem(ECONOMY_KEY);offline.cloud.resetForGuest();assert(!offline.storage.getItem(PLAYER_KEY));assert(!offline.storage.getItem(CLOUD_META));assert.equal(offline.storage.getItem(ECONOMY_KEY),oldGems,'explicit logout clears identity only');

 const invalid=await client();const original=JSON.parse(invalid.storage.getItem(ECONOMY_KEY));await assert.rejects(()=>invalid.cloud.adoptRemote({version:99,snapshot:{version:1,values:{}}}));assert(invalid.cloud.conflict);await invalid.cloud.save();assert.deepEqual(JSON.parse(invalid.storage.getItem(ECONOMY_KEY)).records,original.records,'invalid server data cannot replace local progress');assert.equal((await invalid.social._request('/api/cloud-save')).version,1,'invalid server data blocks automatic overwrites');
 const keeper=new GardenSocial({document:null,fetcher:async(path,init)=>{assert.equal(init.keepalive,new TextEncoder().encode(init.body).length<60000);return new Response('{}');}});
 await keeper._request('/api/test',{method:'POST',body:{text:'작음'},keepalive:true});await keeper._request('/api/test',{method:'POST',body:{text:'한'.repeat(21000)},keepalive:true});
 const owner=await client({[GAME_KEYS.suika]:JSON.stringify({gems:19})});
 const signed=await owner.social._request('/api/auth/register',{method:'POST',body:{username:'Garden2026',displayName:'계정 정원',password:'Garden2026Pass',passwordConfirm:'Garden2026Pass',saveVersion:owner.cloud.version,snapshot:(await owner.social._request('/api/cloud-save')).snapshot}});
 owner.social._acceptUser(signed);owner.storage.removeItem(PLAYER_KEY);await owner.cloud.load(signed.cloud);assert(applyPendingRestore(owner.storage).restored);owner.cloud.dispose();
 const other=await client();const login=await other.social._request('/api/auth/login',{method:'POST',body:{username:'Garden2026',password:'Garden2026Pass'}});other.social._acceptUser(login);other.storage.removeItem(PLAYER_KEY);await other.cloud.connect();
 assert.equal(other.reloads(),1,'logging into the same account on another device auto-loads its save');assert.equal(JSON.parse(JSON.parse(other.storage.getItem(PENDING_RESTORE)).snapshot.values[ECONOMY_KEY]).gems,519);
 assert.equal(JSON.parse(other.storage.getItem(PENDING_RESTORE)).meta.kind,'account');
 console.log('PASS automatic cloud: silent guests, one shared private server, five-second deduplicated saves, auto restore, CAS resolution, local backups, lost-ack recovery, offline retry, expired session recovery, registered identity preservation and keepalive size limits.');
}finally{for(const cloud of clients)cloud.dispose();app.close();}
