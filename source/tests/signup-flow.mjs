import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createLocalApp} from '../scripts/dev-server.mjs';
import {GardenProgress} from '../dist/profile.js';
import {captureDevice,restoreDevice} from '../dist/player-cloud.js';
import {ECONOMY_KEY,GAME_KEYS} from '../dist/economy.js';
const directory=await mkdtemp(path.join(tmpdir(),'garden-signup-')),file=path.join(directory,'test.sqlite'),app=await createLocalApp({databasePath:file}),database=new DatabaseSync(file),origin='https://garden.example';
const password='MyGarden42',base={username:'Garden8420',displayName:'나의 정원',password,passwordConfirm:password};
async function call(url,body,cookie){const response=await app(new Request(origin+url,{method:body?'POST':'GET',headers:{...(body?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}));return {status:response.status,data:await response.json(),cookie:response.headers.get('Set-Cookie')?.split(';')[0]};}
const wallet=snapshot=>JSON.parse(snapshot.values[ECONOMY_KEY]);
try{
 for(const username of ['garden','123456','garden_1','가든12','a1'])assert.equal((await call('/api/auth/register',{...base,username})).status,400);
 for(const [bad,confirm]of [['abcdefghi','abcdefghi'],['123456789','123456789'],['a1','a1'],[password,password.toLowerCase()],[password,undefined]])assert.equal((await call('/api/auth/register',{...base,password:bad,passwordConfirm:confirm})).status,400);
 assert.equal((await call('/api/auth/register',{...base,displayName:''})).status,400);
 assert.equal((await call('/api/auth/availability?username=Garden8420')).data.available,true);
 const registered=await call('/api/auth/register',base);assert.equal(registered.status,201);assert.equal(registered.data.user.username,'garden8420');assert.equal(registered.data.user.isGuest,false);assert.equal(registered.data.signupReward.amount,500);assert.equal(wallet(registered.data.cloud.snapshot).gems,500);
 assert.equal((await call('/api/auth/availability?username=GARDEN8420')).data.available,false);
 assert.equal((await call('/api/auth/register',{...base,username:'GARDEN8420'})).status,409);
 assert.equal(database.prepare('SELECT COUNT(*) AS n FROM garden_signup_rewards').get().n,1);
 assert.equal((await call('/api/auth/login',{username:base.username,password:password.toLowerCase()})).status,401,'passwords distinguish case');
 const signed=await call('/api/auth/login',{username:'GARDEN8420',password});assert.equal(signed.status,200);assert.equal(wallet((await call('/api/cloud-save',null,signed.cookie)).data.snapshot).gems,500,'login never repeats signup reward');
 // Existing IDs containing underscores remain usable for login.
 database.prepare('UPDATE garden_accounts SET username=? WHERE id=?').run('old_user7',registered.data.user.id);assert.equal((await call('/api/auth/login',{username:'old_user7',password})).status,200);
 const map=new Map([[GAME_KEYS.suika,JSON.stringify({gems:77,bestScore:9001,ownedSkins:['classic','cars']})]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};const profile=new GardenProgress({storage});await profile.init();const snapshot=captureDevice(storage);
 const guest=await call('/api/guest',{key:'g'.repeat(43),displayName:'예전 이름'});assert.equal(guest.status,201);await call('/api/profile/import',{scores:{suika:9001}},guest.cookie);
 assert.equal((await call('/api/cloud-save',{version:0,snapshot},guest.cookie)).status,200);
 // Hold password hashing while another device advances the save version.
 const original=crypto.subtle.deriveBits;let unlock,entered;const gate=new Promise(r=>unlock=r),started=new Promise(r=>entered=r);crypto.subtle.deriveBits=async function(...args){entered();await gate;return original.apply(this,args);};
 let rejected;
 try{const pending=call('/api/auth/register',{...base,username:'Guest8420',snapshot,saveVersion:1},guest.cookie);await started;await call('/api/cloud-save',{version:1,snapshot},guest.cookie);unlock();rejected=await pending;}finally{crypto.subtle.deriveBits=original;unlock();}
 assert.equal(rejected.status,409);assert.equal((await call('/api/me',null,guest.cookie)).data.user.isGuest,true,'failed upgrade must not change guest account');assert.equal(database.prepare('SELECT COUNT(*) AS n FROM garden_signup_rewards').get().n,1,'version race cannot award gems');assert.equal(wallet((await call('/api/cloud-save',null,guest.cookie)).data.snapshot).gems,77);
 const upgrade=await call('/api/auth/register',{...base,username:'Guest8420',snapshot,saveVersion:2},guest.cookie);assert.equal(upgrade.status,201);assert.equal(upgrade.data.user.id,guest.data.user.id);assert.equal(upgrade.data.user.friendCode,guest.data.user.friendCode);assert.equal(upgrade.data.user.bestScore,9001);assert.equal(upgrade.data.user.isGuest,false);assert.equal(upgrade.data.cloud.version,3);assert.equal(wallet(upgrade.data.cloud.snapshot).gems,577);assert(wallet(upgrade.data.cloud.snapshot).records[GAME_KEYS.suika].ownedSkins.includes('cars'));
 assert.equal((await call('/api/guest',{key:'g'.repeat(43)})).status,404,'upgraded account no longer accepts old guest recovery key');assert.equal((await call('/api/me',null,guest.cookie)).data.user,null,'old guest sessions are revoked');
 restoreDevice(upgrade.data.cloud.snapshot,storage);const restored=new GardenProgress({storage});await restored.init();assert.equal(restored.profile.gems,577);assert(restored.profile.ownedSkins.includes('cars'));assert.equal(restored.profile.bestScore,9001);
 const again=await call('/api/auth/login',{username:'guest8420',password});assert.equal(again.status,200);assert.equal(wallet((await call('/api/cloud-save',null,again.cookie)).data.snapshot).gems,577);assert.equal(database.prepare('SELECT COUNT(*) AS n FROM garden_signup_rewards').get().n,2);
 console.log('PASS signup: strict mixed IDs, case-insensitive duplicates, password/confirmation validation, case-sensitive login, legacy accounts,500 gems once, atomic version-race rollback, guest ID/friends/score/skins retained and cross-device reward restore.');
}finally{database.close();app.close();await rm(directory,{recursive:true,force:true});}
