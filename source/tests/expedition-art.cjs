const assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const {FruitExpedition}=await import('../dist/growth-models.js');
 const {drawExpeditionScene,expeditionViewport}=await import('../dist/growth-art.js');
 const storage={getItem:()=>null,setItem(){}};const q=new FruitExpedition({storage});q.start();
 const tree=[];for(const time of [0,.7]){const canvas=createCanvas(600,510),c=canvas.getContext('2d');drawExpeditionScene(c,q,time,[],false);tree.push(c.getImageData(0,160,35,90).data);assert.equal(c.getTransform().a,1);}
 assert.deepEqual(tree[0],tree[1],'stationary tree canopies must not jitter with animation time');
 for(const [width,height]of [[600,510],[600,1100],[1250,510]]){
  const canvas=createCanvas(width,height),c=canvas.getContext('2d'),left=(width-600)/2,top=(height-510)*.7;
  c.translate(left,top);drawExpeditionScene(c,q,1,[],false,{viewWidth:width,viewHeight:height});
  for(const [x,y]of [[0,0],[width-1,0],[0,height-1],[width-1,height-1]])assert(c.getImageData(x,y,1,1).data[3]>0,'forest covers portrait and wide viewports');
  assert.equal(c.getTransform().e,left);assert.equal(c.getTransform().f,top);
 }
 for(const [width,height]of [[320,260],[390,470],[900,300],[1280,660]]){
  const view=expeditionViewport(width,height),canvas=createCanvas(width,height),c=canvas.getContext('2d');
  c.translate(view.offsetX,view.offsetY);c.scale(view.scale,view.scale);drawExpeditionScene(c,q,1,[],false,view);
  assert(view.offsetY+491*view.scale<height-65,'health bar clears the bottom action dock');
  for(const [x,y]of [[0,0],[width-1,height-1]])assert(c.getImageData(x,y,1,1).data[3]>0);
 }
 console.log('PASS expedition art: stable tree canopy, extended portrait/wide forest without blank corners, unscaled actors and balanced Canvas state.');
})().catch(error=>{console.error(error);process.exitCode=1;});
