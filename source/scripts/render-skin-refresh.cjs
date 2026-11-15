const {createCanvas,GlobalFonts,Path2D,loadImage}=require('@napi-rs/canvas');
const fs=require('node:fs');
globalThis.Path2D=Path2D;
for(const [path,name]of[['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Garden Korean'],['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Garden Korean Bold']])if(fs.existsSync(path))GlobalFonts.registerFromPath(path,name);
(async()=>{
 const {preloadCarLogos}=await import('../dist/car-logo-assets.js');
 await preloadCarLogos(url=>loadImage(new URL(url)));
 const {drawSkinnedFruit,skinFruitName}=await import('../dist/skins.js');
 const {FRUITS}=await import('../dist/fruits.js');
 const canvas=createCanvas(1120,2000),c=canvas.getContext('2d');
 c.fillStyle='#f1ecdf';c.fillRect(0,0,1120,2000);
 for(const [group,skin,title]of[[0,'cars','자동차 · 브랜드 엠블럼'],[1,'galaxy','행성 · 태양계'],[2,'fruit3d','3D 과일 · 빛과 질감'],[3,'food','야식 정원 · 14가지 다른 음식'],[4,'mystery','??? · 멍과 곰팡이, 마른 과일 껍질']]){
  const top=group*400;c.fillStyle='#294437';c.font='22px "Garden Korean Bold",sans-serif';c.textAlign='left';c.fillText(title,16,top+28);
  for(let i=0;i<14;i++){
   const x=(i%7)*160,y=top+42+Math.floor(i/7)*174;
   c.fillStyle='#fffdf4';c.fillRect(x+6,y,148,164);
   drawSkinnedFruit(c,i,x+80,y+71,53,0,1,false,0,skin);
   c.textAlign='center';c.font='13px "Garden Korean",sans-serif';c.fillStyle='#304535';c.fillText((i+1)+'. '+skinFruitName(i,skin),x+80,y+150,144);
  }
 }
 fs.writeFileSync(process.argv[2]||'/tmp/skin-refresh-preview.png',canvas.toBuffer('image/png'));
 console.log('Rendered70 reference-updated skin stages.');
})().catch(error=>{console.error(error);process.exitCode=1;});
