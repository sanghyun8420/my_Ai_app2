import {createRequire} from 'node:module';
const {createCanvas,Path2D}=createRequire(import.meta.url)('@napi-rs/canvas');
import {writeFile} from 'node:fs/promises';
import {drawFruit} from '../dist/fruits.js';
globalThis.Path2D ??= Path2D;
for(const [name,size,maskable] of [['app-icon-192.png',192,false],['app-icon-512.png',512,false],['app-maskable-512.png',512,true],['apple-touch-icon.png',180,false]]){
 const canvas=createCanvas(size,size),ctx=canvas.getContext('2d');
 ctx.fillStyle='#eff1da';ctx.fillRect(0,0,size,size);
 ctx.fillStyle='#dfe7c8';ctx.beginPath();ctx.ellipse(size*.5,size*.72,size*.29,size*.045,0,0,Math.PI*2);ctx.fill();
 drawFruit(ctx,9,size*.5,size*.5,size*(maskable ? .285 : .34),-.14);
 await writeFile(new URL('../dist/'+name,import.meta.url),canvas.toBuffer('image/png'));
}
console.log('Created opaque application icons at 180,192,512 and maskable512.');
