import { developerBundle } from './source-package.mjs';
import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(process.argv[2] || path.join(root, 'github-pages'));
const publicUrl = 'https://sanghyun8420.github.io/my_Ai_app2/';
const api = 'https://suika-shake-garden-n5k7.hbhbhs02.chatgpt.site/';
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error('내보낼 폴더는 비어 있어야 합니다.');
for (const name of await readdir(path.join(root, 'dist'))) {
  if (name === 'github-pages-download.html' || !/\.(html|css|js|svg|png)$/.test(name)) continue;
  await copyFile(path.join(root, 'dist', name), path.join(output, name));
}
const appPath = path.join(output, 'app.js');
let app = await readFile(appPath, 'utf8');
if ((app.match(/social = new GardenSocial\(\{/g) || []).length !== 1) throw new Error('친구 서버 연결 위치를 확인해 주세요.');
app = `import { createApiFetcher } from './remote-api.js';\n` + app.replace('social = new GardenSocial({', `social = new GardenSocial({\n  fetcher: createApiFetcher('${api}'),`);
await writeFile(appPath, app);
await copyFile(path.join(root, 'scripts/github-pages/remote-api.js'), path.join(output, 'remote-api.js'));
const htmlPath = path.join(output, 'index.html');
let html = await readFile(htmlPath, 'utf8');
html=html.replace(/<meta[^>]+(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\s*/g,'');
html = html.replace('</head>', `  <link rel="canonical" href="${publicUrl}">\n  <meta name="robots" content="index,follow">\n  <meta property="og:title" content="수박정원 · 다섯 가지 작은 게임">\n  <meta property="og:description" content="수박·사과·블록 퍼즐, 과일 원정대와 사과 키우기. 친구와 놀고 나만의 정원을 키우는 다섯 가지 게임.">\n  <meta property="og:url" content="${publicUrl}">\n  <meta property="og:type" content="website">\n  <meta property="og:image" content="${publicUrl}share-card.png">\n  <meta name="twitter:card" content="summary_large_image">\n</head>`);
await writeFile(htmlPath, html);
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${publicUrl}</loc></url></urlset>\n`);
await copyFile(path.join(root, 'scripts/github-pages/README.md'),path.join(output,'README.md'));

await copyFile(path.join(root,'RELEASE-NOTES.ko.md'),path.join(output,'RELEASE-NOTES.ko.md'));
for(const name of ['AGENTS.md','CONTINUE.ko.md'])await copyFile(path.join(root,'scripts/github-pages',name),path.join(output,name));
const sourceCount=await developerBundle(root,output);
console.log(`Included ${sourceCount} editable source files and source-code.zip`);
console.log(`Exported ${ (await readdir(output)).length } GitHub Pages files to ${output}`);
