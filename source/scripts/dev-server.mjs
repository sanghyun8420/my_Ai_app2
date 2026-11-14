import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir,realpath} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {handleApi} from '../worker/api.js';

const defaultRoot=fileURLToPath(new URL('../',import.meta.url));
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.zip':'application/zip','.webmanifest':'application/manifest+json; charset=utf-8'};
const BODY_LIMIT=16384;

function localD1(sqlite){
 const prepare=(sql,values=[])=>({sql,values,bind(...bound){return prepare(sql,bound);},async first(column){const row=sqlite.prepare(sql).get(...values);return column?row?.[column]??null:row||null;},async all(){return {success:true,results:sqlite.prepare(sql).all(...values)};},async run(){const result=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}});
 let batches=Promise.resolve();
 return {prepare,batch(statements){
  const result=batches.then(()=>{
   sqlite.exec('BEGIN IMMEDIATE');
   try{
    // Execute synchronously inside the transaction: no request can interleave
    // another query while the database is partway through this batch.
    const results=statements.map(statement=>{const value=sqlite.prepare(statement.sql).run(...statement.values);return {success:true,meta:{changes:Number(value.changes),last_row_id:Number(value.lastInsertRowid)}};});
    sqlite.exec('COMMIT');return results;
   }catch(error){sqlite.exec('ROLLBACK');throw error;}
  });
  batches=result.catch(()=>{});return result;
 }};
}

/** Local-only development app; no network listeners or production credentials. */
export async function createLocalApp({root=defaultRoot,databasePath=path.join(root,'.local/garden.sqlite')}={}){
 root=path.resolve(root);if(databasePath!==':memory:')await mkdir(path.dirname(path.resolve(databasePath)),{recursive:true});
 const sqlite=new DatabaseSync(databasePath);sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 try{
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const migrations=(await readdir(path.join(root,'drizzle'))).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
  for(const name of migrations){
   if(sqlite.prepare('SELECT name FROM local_schema_migrations WHERE name=?').get(name))continue;
   sqlite.exec('BEGIN IMMEDIATE');try{sqlite.exec(await readFile(path.join(root,'drizzle',name),'utf8'));sqlite.prepare('INSERT INTO local_schema_migrations(name,applied_at) VALUES(?,?)').run(name,Date.now());sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}
  }
 }catch(error){sqlite.close();throw error;}
 const DB=localD1(sqlite),staticRoot=await realpath(path.join(root,'dist'));
 const handler=async request=>{
  const pathname=new URL(request.url).pathname;
  if(pathname==='/api'||pathname.startsWith('/api/'))return handleApi(request,{DB},{});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  let decoded;try{decoded=decodeURIComponent(pathname);}catch{return new Response('Bad path',{status:400});}
  if(decoded.includes('\0')||decoded.includes('\\')||decoded.split('/').some(part=>part==='..'||part.startsWith('.')))return new Response('Not found',{status:404});
  const candidate=path.resolve(staticRoot,'.'+(decoded==='/'?'/index.html':decoded));
  if(candidate!==staticRoot&&!candidate.startsWith(staticRoot+path.sep))return new Response('Not found',{status:404});
  try{
   const file=await realpath(candidate);if(!file.startsWith(staticRoot+path.sep))return new Response('Not found',{status:404});
   const body=await readFile(file);return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
  }catch{return new Response('Not found',{status:404});}
 };
 handler.close=()=>sqlite.close();
 return handler;
}

async function main(){
 const port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from1to65535.');
 const app=await createLocalApp(),server=createServer(async(req,res)=>{
  try{
   const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>BODY_LIMIT){res.writeHead(413,{'Content-Type':'text/plain'});res.end('Request too large');return;}chunks.push(chunk);}
   const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
   const url=new URL(req.url||'/',`http://${req.headers.host||'localhost:'+port}`);
   const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
   const response=await app(request);res.statusCode=response.status;
   for(const [key,value]of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
   const cookies=response.headers.getSetCookie?.()||[];if(cookies.length)res.setHeader('Set-Cookie',cookies);
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.statusCode=500;res.setHeader('Content-Type','text/plain');res.end('Local development server error');}
 });
 server.listen(port,'0.0.0.0',()=>console.log(`수박정원 local development: http://localhost:${port} (local SQLite only)`));
 const close=()=>server.close(()=>{app.close();process.exit(0);});process.once('SIGINT',close);process.once('SIGTERM',close);
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error.message);process.exitCode=1;});
