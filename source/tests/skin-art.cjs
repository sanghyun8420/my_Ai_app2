const assert=require('node:assert/strict');
const {createCanvas,Path2D}=require('@napi-rs/canvas');
globalThis.Path2D=Path2D;
(async()=>{
 const {drawSkinnedFruit,SKINS,skinFruitName}=await import('../dist/skins.js');
 const {FRUITS}=await import('../dist/fruits.js');
 let count=0;
 for(const skin of SKINS)for(let level=0;level<FRUITS.length;level++){
  const canvas=createCanvas(240,240),c=canvas.getContext('2d');let depth=0;
  const save=c.save.bind(c),restore=c.restore.bind(c);c.save=()=>{depth++;save();};c.restore=()=>{depth--;assert(depth>=0);restore();};
  drawSkinnedFruit(c,level,120,120,75,.4,1,level===4,.7,skin.id);
  assert.equal(depth,0,skin.id);assert.equal(c.globalAlpha,1);assert.equal(c.getTransform().a,1);
  assert(c.getImageData(0,0,240,240).data.some((n,i)=>i%4===3&&n>0));count++;
 }
 assert.equal(skinFruitName(0,'cars'),'기아');assert.equal(skinFruitName(13,'cars'),'부가티');
 console.log('PASS native Canvas artwork:',count,'skin/level combinations, balanced state, nonempty images, and car-stage labels.');
})().catch(e=>{console.error(e);process.exitCode=1});
