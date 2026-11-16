const assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
for(const face of ['Regular','Bold']){const path='/usr/share/fonts/opentype/noto/NotoSansCJK-'+face+'.ttc';if(require('node:fs').existsSync(path))GlobalFonts.registerFromPath(path,'Garden Korean');}
(async()=>{
 const {KRW_STAGES,USD_STAGES}=await import('../dist/currency-art.js');const {drawSkinnedFruit,skinFruitName}=await import('../dist/skins.js');
 const sheet=createCanvas(1120,760),c=sheet.getContext('2d');c.fillStyle='#ece8dc';c.fillRect(0,0,1120,760);
 for(const [group,skin,stages,valid]of [[0,'krw',KRW_STAGES,[10,50,100,500,1000,5000,10000,50000]],[1,'usd',USD_STAGES,[1,2,5,10,20,50,100]]]){
  assert.equal(stages.length,14);const images=new Set();c.fillStyle='#294736';c.font='bold 22px "Garden Korean"';c.textAlign='left';c.fillText(skin==='krw'?'원화 금고 · 10원 → 5만원':'달러 금고 · $1 → $100',18,group*380+31);
  for(let i=0;i<14;i++){
   const stage=stages[i];assert(valid.includes(stage.denomination),'each note and coin must use a real denomination');assert(stage.count>=1&&stage.count<=3);assert.equal(stage.value,stage.denomination*stage.count);if(i)assert(stage.value>stages[i-1].value);
   const canvas=createCanvas(180,180),x=canvas.getContext('2d');drawSkinnedFruit(x,i,90,90,72,.17,1,false,0,skin);assert.equal(x.getTransform().a,1);assert.equal(x.globalAlpha,1);assert(x.getImageData(0,0,180,180).data.some((v,j)=>j%4===3&&v));images.add(canvas.toBuffer('image/png').toString('base64'));
   const sx=(i%7)*160,sy=group*380+45+Math.floor(i/7)*161;c.fillStyle='#fffdf7';c.beginPath();c.roundRect(sx+5,sy,150,153,10);c.fill();drawSkinnedFruit(c,i,sx+80,sy+68,59,0,1,false,0,skin);c.fillStyle='#294736';c.font='12px "Garden Korean"';c.textAlign='center';c.fillText(`${i+1}. ${skinFruitName(i,skin)}`,sx+80,sy+136,145);
  }
  assert.equal(images.size,14,'all stages must look different');
 }
 assert.equal(KRW_STAGES[0].denomination,10);assert.equal(KRW_STAGES[13].denomination,50000);assert.equal(USD_STAGES[0].denomination,1);assert.equal(USD_STAGES[13].denomination,100);
 require('node:fs').writeFileSync('/tmp/garden-currency-skins.png',sheet.toBuffer('image/png'));
 console.log('PASS money artwork:28 distinct coin/note/stack stages, real denominations, strictly increasing totals, endpoint names, native Canvas rendering and balanced state.');
})().catch(error=>{console.error(error);process.exitCode=1;});
