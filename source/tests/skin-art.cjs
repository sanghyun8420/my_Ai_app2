const assert=require('node:assert/strict');
const {createCanvas,Path2D,loadImage}=require('@napi-rs/canvas');
globalThis.Path2D=Path2D;
(async()=>{
 const {preloadCarLogos,getCarLogo}=await import('../dist/car-logo-assets.js');
 await preloadCarLogos(url=>loadImage(new URL(url)));
 for(let level=1;level<14;level++)assert(getCarLogo(level),'original emblem must load: '+level);
 const {drawSkinnedFruit,SKINS,skinFruitName}=await import('../dist/skins.js');
 const {FRUITS}=await import('../dist/fruits.js');
 let count=0;
 for(const skin of SKINS)for(let level=0;level<FRUITS.length;level++){
  const canvas=createCanvas(240,240),c=canvas.getContext('2d');let depth=0;
  const save=c.save.bind(c),restore=c.restore.bind(c);c.save=()=>{depth++;save();};c.restore=()=>{depth--;assert(depth>=0);restore();};
  drawSkinnedFruit(c,level,120,120,75,.4,1,(level===4||level===5),.7,skin.id);
  assert.equal(depth,0,skin.id);assert.equal(c.globalAlpha,1);assert.equal(c.getTransform().a,1);
  assert(c.getImageData(0,0,240,240).data.some((n,i)=>i%4===3&&n>0));count++;
 }
 assert.equal(skinFruitName(0,'cars'),'기아');assert.equal(skinFruitName(13,'cars'),'부가티');
 const foodImages=new Set();
 for(let level=0;level<14;level++){const c=createCanvas(160,160),ctx=c.getContext('2d');drawSkinnedFruit(ctx,level,80,80,65,0,1,false,0,'food');foodImages.add(c.toBuffer('image/png').toString('base64'));}
 assert.equal(foodImages.size,14,'every food stage must have its own artwork');
 assert.equal(skinFruitName(0,'food'),'김밥');assert.equal(skinFruitName(4,'food'),'떡볶이');assert.equal(skinFruitName(11,'food'),'피자');
 const {ZOO_STAGES,drawAnimal}=await import('../dist/zoo.js');const animals=new Set();for(let level=0;level<ZOO_STAGES.length;level++){const c=createCanvas(180,180),ctx=c.getContext('2d');drawAnimal(ctx,level,90,90,65,.3,.7);assert.equal(ctx.getTransform().a,1);assert.equal(ctx.globalAlpha,1);assert(c.getContext('2d').getImageData(0,0,180,180).data.some((v,i)=>i%4===3&&v));animals.add(c.toBuffer('image/png').toString('base64'));}assert.equal(animals.size,15,'15 distinctive zoo illustrations');
 const fresh=createCanvas(240,240),rotten=createCanvas(240,240);drawSkinnedFruit(fresh.getContext('2d'),4,120,120,80,0,1,false,0,'fruit3d');drawSkinnedFruit(rotten.getContext('2d'),4,120,120,80,0,1,false,0,'mystery');
 const a=fresh.getContext('2d').getImageData(0,0,240,240).data,b=rotten.getContext('2d').getImageData(0,0,240,240).data;let changed=0;
 for(let i=0;i<a.length;i+=4){assert(Math.abs(a[i+3]-b[i+3])<=2,'decay remains inside the fruit silhouette');if(a[i+3]>200&&Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>30)changed++;}
 assert(changed>3000,'decay visibly changes fruit surface color and texture');
 console.log('PASS native Canvas artwork:',count,'skin/level combinations, balanced state, nonempty images, and car-stage labels.');
})().catch(e=>{console.error(e);process.exitCode=1});
