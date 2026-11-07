import {mkdtemp,readdir,copyFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const project=fileURLToPath(new URL('../',import.meta.url));
const destination=process.argv[2]?path.resolve(process.argv[2]):path.basename(path.resolve(project))==='source'?path.dirname(path.resolve(project)):null;
if(!destination)throw Error('소스 ZIP에서는 대상 폴더를 지정하세요: node scripts/sync-pages.mjs /path/to/pages-root');
if(destination===path.resolve(project)||destination.startsWith(path.resolve(project)+path.sep))throw Error('배포 파일은 소스 폴더 바깥에 생성해 주세요.');
const temporary=await mkdtemp(path.join(tmpdir(),'suika-pages-'));
async function copy(from,to){await mkdir(to,{recursive:true});for(const entry of await readdir(from,{withFileTypes:true})){if(entry.isSymbolicLink())continue;const source=path.join(from,entry.name),target=path.join(to,entry.name);if(entry.isDirectory())await copy(source,target);else await copyFile(source,target);}}
try{
 execFileSync(process.execPath,[path.join(project,'scripts/export-github-pages.mjs'),temporary],{stdio:'inherit'});
 await mkdir(destination,{recursive:true});
 for(const entry of await readdir(temporary,{withFileTypes:true})){
  if(entry.name==='source'&&path.resolve(destination,'source')===path.resolve(project))continue;
  const from=path.join(temporary,entry.name),to=path.join(destination,entry.name);if(entry.isDirectory())await copy(from,to);else await copyFile(from,to);
 }
 console.log('Updated GitHub Pages files, source snapshot and source-code.zip in '+destination);
}finally{await rm(temporary,{recursive:true,force:true});}
