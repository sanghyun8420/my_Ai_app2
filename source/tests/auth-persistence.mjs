import assert from 'node:assert/strict';
import {createLocalApp} from '../scripts/dev-server.mjs';
import {createSessionFetcher} from '../dist/api-session.js';
import {createApiFetcher} from '../scripts/github-pages/remote-api.js';
import {GardenSocial} from '../dist/social.js';
import {GardenProgress} from '../dist/profile.js';
import {PlayerCloud,captureDevice,applyPendingRestore,PLAYER_KEY,PENDING_RESTORE} from '../dist/player-cloud.js';
import {ECONOMY_KEY,GAME_KEYS} from '../dist/economy.js';

const origin='https://garden.example',app=await createLocalApp({databasePath:':memory:'}),clients=[];
const store=initial=>{const map=new Map(Object.entries(initial||{}));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
const raw=async(path,init={})=>{const headers=new Headers(init.headers);headers.set('Origin',origin);headers.delete('Cookie');return app(new Request(new URL(path,origin),{...init,headers}));};
function socialFor(storage){return new GardenSocial({document:null,location:new URL(origin),fetcher:createSessionFetcher({origin,storage,fetcher:raw})});}
async function cloudFor(social,storage){const cloud=new PlayerCloud({social,storage,document:null,reload:()=>{}});clients.push(cloud);await cloud.init();return cloud;}
const post=(social,path,body)=>social._request(path,{method:'POST',body});
try{
 // This deliberately discards every Set-Cookie header, reproducing the hosted site's failure.
 const local=store({[GAME_KEYS.suika]:JSON.stringify({gems:21,bestScore:9876,ownedSkins:['classic','cars']})}),profile=new GardenProgress({storage:local});await profile.init();
 const social=socialFor(local);await social.init();const cloud=await cloudFor(social,local);assert(social.user.isGuest);assert.equal(cloud.version,1,'cookie-less guests can save immediately');
 const signed=await post(social,'/api/auth/register',{username:'Persistent42',displayName:'내 정원',password:'GardenPass42',passwordConfirm:'GardenPass42',saveVersion:cloud.version,snapshot:captureDevice(local)});
 social._acceptUser(signed);local.removeItem(PLAYER_KEY);await cloud.load(signed.cloud);assert(applyPendingRestore(local).restored);cloud.dispose();
 const reloaded=socialFor(local);await reloaded.init();assert.equal(reloaded.user.id,signed.user.id);assert(!reloaded.user.isGuest,'registration survives the restore reload without cookies');
 const restored=new GardenProgress({storage:local});await restored.init();assert.equal(restored.profile.gems,521);assert(restored.profile.ownedSkins.includes('cars'));assert.equal(restored.profile.bestScore,9876);
 const reloadedCloud=await cloudFor(reloaded,local);assert(!reloadedCloud.restoring);assert(!reloadedCloud.needsLogin);
 // A different device logs in and automatically stages the same server wallet, never its blank guest wallet.
 const other=store(),otherProfile=new GardenProgress({storage:other});await otherProfile.init();const otherSocial=socialFor(other);await otherSocial.init();const otherCloud=await cloudFor(otherSocial,other);
 const login=await post(otherSocial,'/api/auth/login',{username:'Persistent42',password:'GardenPass42'});otherSocial._acceptUser(login);other.removeItem(PLAYER_KEY);await otherCloud.connect();assert(otherCloud.restoring);assert(!otherCloud.conflict);
 const pending=JSON.parse(other.getItem(PENDING_RESTORE));assert.equal(JSON.parse(pending.snapshot.values[ECONOMY_KEY]).gems,521);assert(applyPendingRestore(other).restored);otherCloud.dispose();
 const again=socialFor(other);await again.init();assert.equal(again.user.id,signed.user.id);assert(!again.user.isGuest);assert.equal((await again._request('/api/cloud-save')).version,signed.cloud.version);
 await assert.rejects(()=>post(again,'/api/auth/login',{username:'Persistent42',password:'WrongPass42'}),e=>e.status===401);assert.equal((await again._request('/api/me')).user.id,signed.user.id,'a rejected password must not delete an existing valid session');
 await post(again,'/api/auth/logout',{});assert.equal((await socialFor(other)._request('/api/me')).user,null,'explicit logout removes persisted session');assert.equal(JSON.parse(other.getItem(ECONOMY_KEY)).gems,521);

 // Both transports must ignore late guest failures and late guest login responses after account login.
 for(const kind of ['native','pages']){
  const storage=store();let release,resolveGuest;
  const fake=async(path,init)=>{const name=new URL(path,origin).pathname;if(name==='/api/slow')return new Promise(r=>release=()=>r(new Response('{}',{status:401})));if(name==='/api/guest')return new Promise(r=>resolveGuest=()=>r(Response.json({accessToken:'g'.repeat(43)})));if(name==='/api/auth/login')return Response.json({accessToken:'a'.repeat(43)});return Response.json({authorization:new Headers(init.headers).get('Authorization')});};
  const make=()=>kind==='native'?createSessionFetcher({origin,storage,fetcher:fake}):createApiFetcher(origin,{storage,fetcher:fake});let fetcher=make();
  const old=fetcher('/api/slow'),guest=fetcher('/api/guest',{method:'POST'});await fetcher('/api/auth/login',{method:'POST'});release();resolveGuest();await old;await guest;
  assert.equal((await (await fetcher('/api/me')).json()).authorization,'Bearer '+'a'.repeat(43),kind+' ignores stale guest responses');fetcher=make();assert.equal((await (await fetcher('/api/me')).json()).authorization,'Bearer '+'a'.repeat(43),kind+' retains the account across reload');
 }
 // A stale request cannot tell PlayerCloud or a friend room to log out the newly accepted user.
 let release;const raced=new GardenSocial({document:null,fetcher:()=>new Promise(r=>release=()=>r(new Response(JSON.stringify({code:'SIGN_IN_REQUIRED',error:'old guest'}),{status:401})))});
 raced._acceptUser({user:{id:'guest',username:'guest',isGuest:true}});const request=raced._request('/api/cloud-save').catch(e=>e);raced._acceptUser({user:{id:'member',username:'member42'}});release();const error=await request;
 const guard=new PlayerCloud({social:raced,storage:local,document:null});clients.push(guard);guard.expired(error);assert.equal(raced.user.id,'member');
 let initRelease;const initializing=new GardenSocial({document:null,fetcher:()=>new Promise(r=>initRelease=()=>r(Response.json({user:null})))});const initial=initializing.init();initializing._acceptUser({user:{id:'member',username:'member42'}});initRelease();await initial;assert.equal(initializing.user.id,'member','a delayed initial guest check cannot erase a completed login');
 console.log('PASS auth persistence: native cookie-loss reproduction, guest saves, signup/restore reload, cross-device login/latest wallet, retained skins/high scores, explicit logout, rejected passwords, native/Pages stale responses and delayed initialization.');
}finally{for(const c of clients)c.dispose();app.close();}
