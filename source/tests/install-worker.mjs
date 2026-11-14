import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,readdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {writeServiceWorker} from '../scripts/pwa-assets.mjs';
import {createLocalApp} from '../scripts/dev-server.mjs';
const dist=new URL('../dist/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',dist),'utf8'));
for(const base of ['https://garden.example/','https://sanghyun8420.github.io/my_Ai_app2/']){
 assert.equal(new URL(manifest.start_url,base).href,base,'installation keeps the existing save origin and project path');assert.equal(new URL(manifest.scope,base).href,base);assert.equal(new URL(manifest.id,base).href,base);
}
assert.equal(manifest.display,'standalone');assert(manifest.icons.some(i=>i.sizes==='192x192'));assert(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable'));
for(const icon of [...manifest.icons,{src:'./apple-touch-icon.png',sizes:'180x180'}]){const png=await readFile(new URL(icon.src,dist));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),Number(icon.sizes.split('x')[0]));}
const local=await createLocalApp({databasePath:':memory:'});try{const response=await local(new Request('http://localhost:4173/manifest.webmanifest'));assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^application\/manifest\+json/);}finally{local.close();}
const temporary=await mkdtemp(path.join(tmpdir(),'garden-pwa-test-'));
try{
 await writeFile(path.join(temporary,'index.html'),'<h1>garden shell</h1>');await writeFile(path.join(temporary,'app.js'),'original game code');await writeFile(path.join(temporary,'remote-api.js'),'remote session adapter');await writeFile(path.join(temporary,'source-code.zip'),'private download excluded');await writeFile(path.join(temporary,'github-pages-download.html'),'large download excluded');
 const first=await writeServiceWorker(temporary),unchanged=await writeServiceWorker(temporary);assert.equal(first.version,unchanged.version);await writeFile(path.join(temporary,'app.js'),'updated game code');const changed=await writeServiceWorker(temporary);assert.notEqual(first.version,changed.version,'updated game assets get a new offline cache');
 const script=await readFile(path.join(temporary,'sw.js'),'utf8');assert(!script.includes('skipWaiting'),'never force an update during a running game');
 for(const base of ['https://garden.example/','https://sanghyun8420.github.io/my_Ai_app2/']){
  const handlers=new Map(),stores=new Map([['another-application',new Map()],['suika-garden:/other-game/:previous',new Map()],['suika-garden:'+new URL(base).pathname+':previous',new Map()]]);let online=true,claimed=0,networkVersion='current server';
  const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);return {async addAll(requests){for(const request of requests){const name=new URL(request.url).pathname.slice(new URL(base).pathname.length);entries.set(request.url,new Response(await readFile(path.join(temporary,name))));}},async match(url){return entries.get(String(url))?.clone();}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
  const self={registration:{scope:base},clients:{claim:async()=>claimed++},addEventListener:(type,fn)=>handlers.set(type,fn)};
  vm.runInNewContext(script,{self,caches,URL,Request,Response,fetch:async()=>{if(!online)throw Error('offline');return new Response(networkVersion);}});
  let installing;handlers.get('install')({waitUntil:p=>installing=p});await installing;
  let activating;handlers.get('activate')({waitUntil:p=>activating=p});await activating;assert.equal(claimed,1);assert(stores.has('another-application'));assert(stores.has('suika-garden:/other-game/:previous'));assert(!stores.has('suika-garden:'+new URL(base).pathname+':previous'));
  const fetch=async(url,mode='cors',method='GET')=>{let response;handlers.get('fetch')({request:{url:new URL(url,base).href,mode,method},respondWith:p=>response=p});return response===undefined?null:await response;};
  assert.equal(await fetch('https://api.example/api/cloud-save'),null);assert.equal(await fetch('/api/me'),null);assert.equal(await fetch('./app.js','cors','POST'),null);assert.equal(await fetch('./source-code.zip'),null);assert.equal(await fetch('./github-pages-download.html'),null,'never cache source/download archives');
  assert.equal(await (await fetch('./app.js')).text(),'current server','online always gets current published assets');
  online=false;assert.equal(await (await fetch('./?room=ABC123','navigate')).text(),'<h1>garden shell</h1>');assert.equal(await (await fetch('./app.js?version=next')).text(),'updated game code');assert.equal(await (await fetch('./remote-api.js')).text(),'remote session adapter','Pages offline shell includes injected API module');
  for(const store of stores.values())assert([...store.keys()].every(url=>!url.includes('/api/')),'API sessions, leaderboards and cloud saves must not enter an offline cache');
 }
 console.log('PASS PWA shell: correct native/Pages scope, real PNG icons/manifest MIME, versioned updates, cached offline game and Pages adapter, untouched other caches, no forced reload and no API/private-download caching.');
}finally{await rm(temporary,{recursive:true,force:true});}
