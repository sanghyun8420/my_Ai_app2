import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createLocalApp} from '../scripts/dev-server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'garden-local-test-')),databasePath=path.join(directory,'garden.sqlite'),origin='http://localhost:4173';
let app;
try{
 app=await createLocalApp({databasePath});
 const homepage=await app(new Request(origin+'/'));assert.equal(homepage.status,200);assert((await homepage.text()).includes('game-canvas'));
 const code=await app(new Request(origin+'/science.js'));assert.equal(code.status,200);assert(code.headers.get('Content-Type').includes('javascript'));
 assert.equal((await app(new Request(origin+'/science.js',{method:'HEAD'}))).status,200);
 assert.equal((await app(new Request(origin+'/science.js',{method:'POST'}))).status,405);
 for(const pathname of ['/%2e%2e%2fworker%2fapi.js','/.env','/.openai/hosting.json','/%00','/does-not-exist'])assert.equal((await app(new Request(origin+pathname))).status,404,pathname);
 assert.equal((await app(new Request(origin+'/bad%zz'))).status,400);
 const empty=await app(new Request(origin+'/api/me'));assert.equal(empty.status,200);assert.equal((await empty.json()).user,null);
 const account={username:'local_dev1',password:'local-password-123',displayName:'로컬 개발'};
 const registered=await app(new Request(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(account)}));assert.equal(registered.status,201);const user=(await registered.json()).user,cookie=registered.headers.get('Set-Cookie').split(';')[0];assert.equal(user.username,'local_dev1');
 const me=await app(new Request(origin+'/api/me',{headers:{Cookie:cookie}}));assert.equal((await me.json()).user.id,user.id);
 const concurrent=await Promise.all(['parallel_a','parallel_b'].map(username=>app(new Request(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({...account,username})}))));
 for(const response of concurrent)assert.equal(response.status,201,'simultaneous API registration batches cannot nest SQLite transactions');
 const parallelUsers=await Promise.all(concurrent.map(response=>response.json()));assert.notEqual(parallelUsers[0].user.id,parallelUsers[1].user.id);

 app.close();app=await createLocalApp({databasePath});
 const login=await app(new Request(origin+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(account)}));assert.equal(login.status,200,'local database persists and migrations do not run twice');assert.equal((await login.json()).user.id,user.id);
 console.log('PASS local development handler: static/HEAD, traversal rejection, real concurrent registration/login/session and persistent SQLite migrations; no listener started.');
}finally{app?.close();await rm(directory,{recursive:true,force:true});}
