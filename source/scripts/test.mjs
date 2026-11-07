import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const core=process.argv.includes('--core');
const files=(await readdir(path.join(root,'tests'))).filter(name=>/\.(mjs|cjs)$/.test(name)&&(!core||!name.endsWith('.cjs'))).sort();
const failed=[];
for(const name of files){
 const result=spawnSync(process.execPath,[path.join(root,'tests',name)],{cwd:root,stdio:'inherit'});
 if(result.error){process.stderr.write(`${name}: ${result.error.message}\n`);failed.push(name);}
 else if(result.status!==0)failed.push(name);
}
if(failed.length){process.stderr.write(`Failed: ${failed.join(', ')}\n`);process.exitCode=1;}
else process.stdout.write(`PASS ${files.length} test files${core?' (core)':''}.\n`);
