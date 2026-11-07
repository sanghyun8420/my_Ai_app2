import {readFile,readdir,stat,mkdir,copyFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';

const topFiles=['README.md','HANDOFF.ko.md','RELEASE-NOTES.ko.md','package.json','package-lock.json','.gitignore','.openai/hosting.json'];
const directories=['dist','worker','drizzle','migrations','tests','scripts'];
const excluded=new Set(['github-pages-download.html','source-code.zip']);
export async function sourceFiles(root){
 const files=[];
 async function visit(relative){
  const full=path.join(root,relative);let info;try{info=await stat(full);}catch{return;}
  if(info.isDirectory()){for(const entry of await readdir(full,{withFileTypes:true})){if(!entry.isSymbolicLink()&&!['node_modules','build','.git','.wrangler'].includes(entry.name)&&!entry.name.startsWith('.env'))await visit(path.join(relative,entry.name));}}
  else if(info.isFile()&&!excluded.has(path.basename(relative)))files.push(relative.split(path.sep).join('/'));
 }
 for(const name of [...topFiles,...directories])await visit(name);
 return [...new Set(files)].sort();
}
function crc32(buffer){let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export async function zipFiles(root,names){
 const parts=[],central=[];let offset=0;
 for(const name of names){
  const raw=await readFile(path.join(root,name)),compressed=deflateRawSync(raw),filename=Buffer.from(name),crc=crc32(raw);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x5ce7,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(raw.length,22);header.writeUInt16LE(filename.length,26);
  parts.push(header,filename,compressed);
  const item=Buffer.alloc(46);item.writeUInt32LE(0x02014b50);item.writeUInt16LE(20,4);item.writeUInt16LE(20,6);item.writeUInt16LE(0x800,8);item.writeUInt16LE(8,10);item.writeUInt16LE(0x5ce7,14);item.writeUInt32LE(crc,16);item.writeUInt32LE(compressed.length,20);item.writeUInt32LE(raw.length,24);item.writeUInt16LE(filename.length,28);item.writeUInt32LE(offset,42);central.push(item,filename);offset+=header.length+filename.length+compressed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(names.length,8);end.writeUInt16LE(names.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...parts,directory,end]);
}
export async function developerBundle(root,output){
 const names=await sourceFiles(root);
 for(const name of names){const destination=path.join(output,'source',name);await mkdir(path.dirname(destination),{recursive:true});await copyFile(path.join(root,name),destination);}
 await writeFile(path.join(output,'source-code.zip'),await zipFiles(root,names));
 return names.length;
}
