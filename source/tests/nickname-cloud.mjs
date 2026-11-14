import assert from 'node:assert/strict';
import {createLocalApp} from '../scripts/dev-server.mjs';
import {createApiFetcher} from '../scripts/github-pages/remote-api.js';
const app=await createLocalApp({databasePath:':memory:'}),origin='https://garden.example';
async function call(path,{body,cookie,headers={}}={}){const response=await app(new Request(origin+path,{method:body?'POST':'GET',headers:{...(body?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}));return {response,status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
try{
 assert.equal((await call('/api/guest',{body:{key:'short',displayName:'이름'}})).status,400);
 const a=await call('/api/guest',{body:{key:'a'.repeat(43),displayName:'이름만'}});assert.equal(a.status,201);assert(a.data.user.isGuest);assert.equal(a.data.user.displayName,'이름만');
 const b=await call('/api/guest',{body:{key:'b'.repeat(43),displayName:'이름만'}});assert.equal(b.status,201);assert.notEqual(a.data.user.id,b.data.user.id,'same nickname cannot claim another player');
 const again=await call('/api/guest',{body:{key:'a'.repeat(43)}});assert.equal(again.data.user.id,a.data.user.id,'recovery key retains identity across devices');
 assert.equal((await call('/api/guest',{body:{key:'c'.repeat(43)}})).status,404);
 assert.equal((await call('/api/profile/import',{body:{scores:{suika:12345,apple:25,blocks:450}},cookie:a.cookie})).status,200);
 await call('/api/profile/import',{body:{scores:{suika:1}},cookie:a.cookie});const rank=await call('/api/leaderboard?game=suika');assert.equal(rank.data.scores[0].displayName,'이름만');assert.equal(rank.data.scores[0].score,12345,'legacy imported highest score cannot decrease');
 assert.equal((await call('/api/profile/import',{body:{scores:{suika:-1}},cookie:a.cookie})).status,400);
 assert.equal((await call('/api/player/name',{body:{displayName:'새이름'},cookie:a.cookie})).status,200);assert.equal((await call('/api/leaderboard')).data.scores[0].displayName,'새이름');
 assert.equal((await call('/api/player/name',{body:{},cookie:a.cookie})).status,400);
 const snapshot={version:1,values:{'garden-economy-v1':JSON.stringify({version:1,gems:20,records:{}})}};
 assert.equal((await call('/api/cloud-save',{body:{version:0,snapshot}})).status,401);
 const saved=await call('/api/cloud-save',{body:{version:0,snapshot},cookie:a.cookie});assert.equal(saved.status,200);assert.equal(saved.data.version,1);
 const restored=await call('/api/cloud-save',{cookie:again.cookie});assert.deepEqual(restored.data.snapshot,snapshot);
 assert.equal((await call('/api/cloud-save',{cookie:b.cookie})).data.snapshot,null,'other nickname identities cannot read saves');
 assert.equal((await call('/api/cloud-save',{body:{version:0,snapshot},cookie:a.cookie})).status,409,'stale sites cannot overwrite newer save');
 assert.equal((await call('/api/cloud-save',{body:{version:1,snapshot},cookie:a.cookie})).data.version,2);
 assert.equal((await call('/api/cloud-save',{body:{version:2,snapshot:{version:1,values:{'evil-key':'x'}}},cookie:a.cookie})).status,400);
 assert.equal((await call('/api/cloud-save',{body:{version:2,snapshot:{version:1,values:{'garden-economy-v1':'x'.repeat(520000)}}},cookie:a.cookie})).status,413);
 assert.equal((await call('/api/guest',{body:{key:'d'.repeat(43),displayName:'타인'},headers:{Origin:'https://evil.example'}})).status,403);
 const map=new Map(),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 const remote=createApiFetcher(origin+'/',{storage,fetcher:(url,init)=>app(new Request(url,{...init,headers:{...Object.fromEntries(new Headers(init.headers)),Origin:'https://sanghyun8420.github.io'}}))});
 const joined=await remote('/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:'e'.repeat(43),displayName:'깃허브'})});assert.equal(joined.status,201);const guest=(await joined.json()).user;assert.equal((await (await remote('/api/me')).json()).user.id,guest.id,'Pages remembers anonymous explicit session');
 console.log('PASS nickname + cloud API: password-free join, duplicate names isolated, key recovery, old score import, name update, private saves, CAS conflicts, bounded payloads, CORS and Pages sessions.');
}finally{app.close();}
