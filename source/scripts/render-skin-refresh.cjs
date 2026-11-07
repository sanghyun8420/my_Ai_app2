const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const fs=require('node:fs');
for(const [path,name]of[['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Garden Korean'],['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Garden Korean Bold']])if(fs.existsSync(path))GlobalFonts.registerFromPath(path,name);
(async()=>{
 const {drawSkinnedFruit,skinFruitName}=await import('../dist/skins.js');
 const {FRUITS}=await import('../dist/fruits.js');
 const canvas=createCanvas(1120,1200),c=canvas.getContext('2d');
 c.fillStyle='#f1ecdf';c.fillRect(0,0,1120,1200);
 for(const [group,skin,title]of[[0,'cars','자동차 · 브랜드 엠블럼'],[1,'galaxy','행성 · 태양계'],[2,'fruit3d','3D 과일 · 빛과 질감']]){
  const top=group*400;c.fillStyle='#294437';c.font='22px "Garden Korean Bold",sans-serif';c.textAlign='left';c.fillText(title,16,top+28);
  for(let i=0;i<14;i++){
   const x=(i%7)*160,y=top+42+Math.floor(i/7)*174;
   c.fillStyle='#fffdf4';c.fillRect(x+6,y,148,164);
   drawSkinnedFruit(c,i,x+80,y+71,53,0,1,false,0,skin);
   c.textAlign='center';c.font='13px "Garden Korean",sans-serif';c.fillStyle='#304535';c.fillText((i+1)+'. '+skinFruitName(i,skin),x+80,y+150,144);
  }
 }
 fs.writeFileSync(process.argv[2]||'/tmp/skin-refresh-preview.png',canvas.toBuffer('image/png'));
 console.log('Rendered42 reference-updated skin stages.');
})().catch(error=>{console.error(error);process.exitCode=1;});
