import assert from 'node:assert/strict';
import {createLocalApp} from '../scripts/dev-server.mjs';
import {GardenProgress} from '../dist/profile.js';
import {GardenSocial} from '../dist/social.js';
import {PlayerCloud,PLAYER_KEY,CLOUD_META,PENDING_RESTORE,captureDevice,applyPendingRestore,localScores,preserveHighScores} from '../dist/player-cloud.js';
import {ECONOMY_KEY,GAME_KEYS} from '../dist/economy.js';

const app=await createLocalApp({databasePath:':memory:'}),origin='https://garden.example',clients=[];
const store=initial=>{const map=new Map(Object.entries(initial||{}));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
async function client(initial={},session=''){
 const storage=store(initial),profile=new GardenProgress({storage});await profile.init();let cookie=session,reloads=0,tick;
 const fetcher=async(path,init={})=>{const headers=new Headers(init.headers);headers.set('Origin',origin);if(cookie)headers.set('Cookie',cookie);const response=await app(new Request(origin+path,{...init,headers}));if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return response;};
 const social=new GardenSocial({document:null,location:new URL(origin),fetcher});await social.init();
 const cloud=new PlayerCloud({social,storage,document:null,intervalMs:5000,setTimer:fn=>{tick=fn;return 1;},clearTimer:()=>{},beforeCapture:async()=>{await profile._queue;profile._save();},reload:()=>reloads++});clients.push(cloud);await cloud.init();
 return {storage,profile,social,cloud,tick:()=>tick(),cookie:()=>cookie,reloads:()=>reloads};
}
const copy=c=>Object.fromEntries(c.storage.map),post=(c,url,body)=>c.social._request(url,{method:'POST',body});
async function login(c){const result=await post(c,'/api/auth/login',{username:'Recover42',password:'GardenPass42'});c.social._acceptUser(result);await c.cloud.connect({includeGuestScores:true});c.storage.removeItem(PLAYER_KEY);}
async function reboot(c){assert(applyPendingRestore(c.storage).restored);c.cloud.dispose();return client(copy(c),c.cookie());}
try{
 const guest=await client({[GAME_KEYS.suika]:JSON.stringify({gems:50,bestScore:1200})});
 const signed=await post(guest,'/api/auth/register',{username:'Recover42',displayName:'점수 복원',password:'GardenPass42',passwordConfirm:'GardenPass42',saveVersion:guest.cloud.version,snapshot:captureDevice(guest.storage)});
 guest.social._acceptUser(signed);await guest.cloud.load(signed.cloud);guest.storage.removeItem(PLAYER_KEY);const owner=await reboot(guest);
 const secondGuest=await client();await login(secondGuest);const second=await reboot(secondGuest);
 owner.profile._profile.bestScore=22000;owner.profile._profile.modeBestScores.zoo=50000;owner.profile._profile.gems+=3;owner.profile._save();
 second.profile._profile.gems+=7;second.profile._save();await second.cloud.save();const before=second.cloud.version;
 await owner.cloud.synchronize();assert.equal(owner.reloads(),1);
 const staged=JSON.parse(owner.storage.getItem(PENDING_RESTORE)),wallet=JSON.parse(staged.snapshot.values[ECONOMY_KEY]);
 assert.equal(wallet.gems,557,'the newer server wallet wins; offline balances are never added');assert.equal(wallet.records[GAME_KEYS.suika].bestScore,22000);assert.equal(wallet.records[GAME_KEYS.suika].modeBestScores.zoo,50000);
 const restored=await reboot(owner),saved=await restored.social._request('/api/cloud-save');assert(saved.version>before,'merged records must upload after the staged reload');
 assert.equal(restored.profile.profile.gems,557);assert.equal((await restored.social._request('/api/leaderboard')).me.score,22000,'recovered basic high is actually ranked');
 assert.equal(JSON.parse(saved.snapshot.values[ECONOMY_KEY]).records[GAME_KEYS.suika].modeBestScores.zoo,50000,'mode high stays in its own record');

 const claiming=await client({[GAME_KEYS.suika]:JSON.stringify({gems:900,bestScore:25000})});await login(claiming);const claimed=await reboot(claiming);
 assert.equal(claimed.profile.profile.gems,557,'login claims only guest highs, not guest money');assert.equal((await claimed.social._request('/api/leaderboard')).me.score,25000);

 const other=store(copy(restored));other.setItem(CLOUD_META,JSON.stringify({userId:'ga_other_account',kind:'account',version:1}));other.setItem('suika-garden-best','999999');
 const guarded=new PlayerCloud({social:restored.social,storage:other,document:null,reload:()=>{}});clients.push(guarded);await guarded.load(saved,{includeGuestScores:true});
 assert.equal(JSON.parse(JSON.parse(other.getItem(PENDING_RESTORE)).snapshot.values[ECONOMY_KEY]).records[GAME_KEYS.suika].bestScore,22000,'a known different registered account cannot donate its high on login');

 const legacy=structuredClone(saved.snapshot);legacy.values[GAME_KEYS.apple]=JSON.stringify({best:4321,gems:9999});legacy.values[GAME_KEYS.blocks]=JSON.stringify({best:7654});legacy.values['suika-garden-best']='24000';
 const remoteText=JSON.stringify(saved.snapshot),merged=preserveHighScores(saved.snapshot,legacy);
 assert.equal(JSON.stringify(saved.snapshot),remoteText,'merging never mutates the remote snapshot');assert.deepEqual(localScores(store(merged.values)),{suika:24000,apple:4321,blocks:7654});assert.equal(JSON.parse(merged.values[ECONOMY_KEY]).gems,557);
 legacy.values['suika-garden-best']='NaN';assert.equal(localScores(store(legacy.values)).suika,22000,'unreadable score values cannot poison other valid highs');
 assert.deepEqual(preserveHighScores(saved.snapshot,saved.snapshot),saved.snapshot,'no-op restores do not create extra save versions');
 const cloudBefore=await claimed.social._request('/api/cloud-save');claimed.profile._profile.bestScore=29000;claimed.profile._save();
 claimed.cloud.syncTask=new Promise(()=>{});claimed.cloud.connectTask=new Promise(()=>{});claimed.cloud.saveTask=new Promise(()=>{});
 await claimed.cloud.syncLeaderboard();assert.equal((await claimed.social._request('/api/leaderboard')).me.score,29000,'dedicated rank uploads cannot wait on stuck wallet tasks');
 const cloudAfter=await claimed.social._request('/api/cloud-save');assert.equal(cloudAfter.version,cloudBefore.version);assert.equal(JSON.parse(cloudAfter.snapshot.values[ECONOMY_KEY]).gems,557,'rank refresh never downloads or rewrites the wallet');
 assert.equal(claimed.reloads(),0,'opening rankings cannot reload the game');
 // The five-second background timer must publish records with no ranking dialog
 // or manual action, even while every wallet/capture path is still stalled.
 claimed.cloud.busy=true;claimed.cloud.beforeCapture=()=>new Promise(()=>{});claimed.cloud.beforeScoreCapture=()=>new Promise(()=>{});
 const request=claimed.social._request.bind(claimed.social);let imports=0,failUpload=false,releaseUpload;
 claimed.social._request=async(path,init)=>{if(path==='/api/profile/import'){imports++;if(failUpload)throw Error('offline');if(releaseUpload)await releaseUpload.promise;}return request(path,init);};
 const highs=(suika,apple,blocks)=>{const root=JSON.parse(claimed.storage.getItem(ECONOMY_KEY));root.records[GAME_KEYS.suika].bestScore=suika;root.records[GAME_KEYS.suika].modeBestScores.zoo=999999;root.records[GAME_KEYS.apple].best=apple;root.records[GAME_KEYS.blocks].best=blocks;claimed.storage.setItem(ECONOMY_KEY,JSON.stringify(root));};
 highs(31000,4321,7654);let release;releaseUpload={promise:new Promise(resolve=>release=resolve)};
 claimed.tick();claimed.tick();assert.equal(imports,1,'timer ticks coalesce pending automatic uploads');const automatic=claimed.cloud.flushScores();release();await automatic;releaseUpload=null;
 for(const [game,score]of[['suika',31000],['apple',4321],['blocks',7654]])assert.equal((await request('/api/leaderboard?game='+game)).me.score,score,'registered account highs rank automatically while wallets are busy');
 claimed.tick();await claimed.cloud.flushScores();assert.equal(imports,1,'unchanged highs do not repeatedly submit');
 highs(32000,4400,7700);failUpload=true;claimed.tick();await claimed.cloud.flushScores();assert.equal((await request('/api/leaderboard')).me.score,31000);
 failUpload=false;claimed.tick();await claimed.cloud.flushScores();assert.equal((await request('/api/leaderboard')).me.score,32000,'the next scheduled tick retries a failed upload without a button');
 const meta=claimed.storage.getItem(CLOUD_META),beforeForeign=imports;claimed.storage.setItem(CLOUD_META,JSON.stringify({userId:'ga_different_registered_account',kind:'account'}));highs(999999,999999,999999);claimed.tick();assert.equal(await claimed.cloud.syncLeaderboard(),false);assert.equal(imports,beforeForeign,'automatic publishing never transfers another account records');claimed.storage.setItem(CLOUD_META,meta);
 claimed.cloud.restoring=true;claimed.tick();assert.equal(imports,beforeForeign,'pending account restores block automatic record claims');claimed.cloud.restoring=false;
 const finalCloud=await request('/api/cloud-save');assert.equal(finalCloud.version,cloudBefore.version);assert.equal(JSON.parse(finalCloud.snapshot.values[ECONOMY_KEY]).gems,557);assert.equal(claimed.reloads(),0);
 console.log('PASS score recovery: same-account restore, guest claim, ownership/mode isolation, authoritative wallets and automatic three-game highs/retries/coalescing with no ranking dialog despite stalled wallet and capture tasks.');
}finally{for(const c of clients)c.dispose();app.close();}
