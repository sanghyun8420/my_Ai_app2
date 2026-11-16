import {drawCachedSkin} from './skin-details.js';

// Denominations stay real; intermediate stages are clearly labelled stacks.
const stage=(denomination,count,name)=>Object.freeze({denomination,count,name,value:denomination*count});
export const KRW_STAGES=Object.freeze([
 stage(10,1,'10원'),stage(10,2,'10원 2개'),stage(50,1,'50원'),stage(100,1,'100원'),stage(100,2,'100원 2개'),stage(500,1,'500원'),
 stage(1000,1,'1천원'),stage(1000,2,'1천원 2장'),stage(1000,3,'1천원 3장'),stage(5000,1,'5천원'),stage(10000,1,'1만원'),stage(10000,2,'1만원 2장'),stage(10000,3,'1만원 3장'),stage(50000,1,'5만원')
]);
export const USD_STAGES=Object.freeze([
 stage(1,1,'1달러'),stage(2,1,'2달러'),stage(1,3,'1달러 3장'),stage(2,2,'2달러 2장'),stage(5,1,'5달러'),stage(2,3,'2달러 3장'),stage(10,1,'10달러'),
 stage(5,3,'5달러 3장'),stage(20,1,'20달러'),stage(10,3,'10달러 3장'),stage(20,2,'20달러 2장'),stage(50,1,'50달러'),stage(20,3,'20달러 3장'),stage(100,1,'100달러')
]);
const TAU=Math.PI*2;
function ellipse(c,x,y,rx,ry,fill,stroke,width=.6){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function text(c,value,x,y,size,color,weight=700,align='center'){c.font=`${weight} ${size}px sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(String(value),x,y);}
function path(c,points,color,width=1){c.beginPath();for(const [i,[x,y]]of points.entries())i?c.lineTo(x,y):c.moveTo(x,y);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function paper(c,x,y,w,h,fill,stroke,width=.5){c.beginPath();c.roundRect(x,y,w,h,1.2);c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
function badge(c,count,ink){if(count<2)return;paper(c,14,20,25,12,'#fff9e9',ink,.8);text(c,'× '+count,26.5,26,8,ink);}

function coinMotif(c,value,color){
 c.save();c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1;
 if(value===10){
  for(const [y,w]of[[-12,12],[-7,9],[-2,7],[5,10]]){path(c,[[-w,y+2],[0,y-2],[w,y+2]],color,1.7);c.fillRect(-w*.68,y+2,w*1.36,2.5);}path(c,[[0,-18],[0,-13]],color,1.4);c.fillRect(-5,1,3,6);c.fillRect(2,1,3,6);c.fillRect(-12,11,24,2.3);c.fillRect(-15,15,30,2.3);
 }else if(value===50){
  path(c,[[-5,17],[0,7],[2,-9],[4,-18]],color,1.2);for(let i=0;i<8;i++){const y=-15+i*3.5;ellipse(c,i%2?-1:6,y,2.4,1.1,color);path(c,[[i%2?-3:8,y],[i%2?-8:13,y-3]],color,.7);}
 }else if(value===100){
  ellipse(c,0,-4,7,9,null,color,1);c.beginPath();c.moveTo(-13,14);c.quadraticCurveTo(-8,4,-4,4);c.lineTo(4,4);c.quadraticCurveTo(11,6,14,14);c.stroke();path(c,[[-10,-12],[-6,-17],[7,-17],[10,-12]],color,1.5);c.fillRect(-10,-13,20,2);path(c,[[-4,0],[0,5],[4,0],[0,10],[-4,0]],color,.8);ellipse(c,-2,-5,.7,.9,color);ellipse(c,2,-5,.7,.9,color);
 }else{
  path(c,[[-18,9],[-6,-2],[3,-5],[10,-15],[18,-17],[11,-13],[7,-3]],color,1.3);path(c,[[-6,-2],[-3,-15],[3,-19],[4,-10],[1,-4]],color,1.3);path(c,[[0,-3],[17,4],[19,10],[9,8],[-2,2],[-6,7],[-17,13]],color,1.2);path(c,[[-1,5],[1,18],[6,20],[1,18],[8,16]],color,.8);ellipse(c,12,-15,.8,.8,color);
 }
 c.restore();
}
function coin(c,value,count){
 const copper=value===10,ink=copper?'#8e4c23':'#5c656e',light=copper?'#ffdfa0':'#fafcf8',mid=copper?'#c78c47':'#aeb7b4',dark=copper?'#8d552b':'#59666a';
 c.save();const scale=count>1?.93:1;c.scale(scale,scale);
 for(let i=Math.min(count,3)-1;i>=0;i--){const x=-i*2.4,y=i*2.3;c.save();c.translate(x,y);const g=c.createLinearGradient(-30,-36,30,38);g.addColorStop(0,light);g.addColorStop(.35,mid);g.addColorStop(.55,light);g.addColorStop(1,dark);ellipse(c,0,0,40,40,g,dark,1.2);ellipse(c,0,0,36.7,36.7,null,light,.7);ellipse(c,0,0,34.8,34.8,null,ink,.4);for(let t=0;t<72;t++){const a=t*TAU/72;path(c,[[Math.cos(a)*38,Math.sin(a)*38],[Math.cos(a)*39.2,Math.sin(a)*39.2]],ink,.45);}if(i===0){coinMotif(c,value,ink);text(c,value,0,25,13,ink,800);text(c,'한국은행',0,-25,4.6,ink,600);for(let k=0;k<25;k++){const y=-26+k*2;path(c,[[-28,y],[-25,y+.7]],'#ffffff44',.35);}}c.restore();}
 badge(c,count,ink);c.restore();
}
function portrait(c,x,y,style,ink,base,usd=false){
 c.save();c.translate(x,y);ellipse(c,0,0,10.5,15.1,base,ink,.65);c.save();c.beginPath();c.ellipse(0,0,10,14.6,0,0,TAU);c.clip();
 for(let i=-12;i<=12;i+=1.4)path(c,[[-11,i],[11,i+5]],ink+'36',.35);
 c.fillStyle=ink+'dd';c.beginPath();c.moveTo(-10,17);c.quadraticCurveTo(-9,8,-3,5);c.lineTo(3,5);c.quadraticCurveTo(9,8,11,17);c.fill();
 ellipse(c,0,-3.3,5.1,7.4,base,ink,.5);
 if(!usd&&style===50000){c.fillStyle=ink;c.beginPath();c.ellipse(0,-8,5.3,3.6,0,Math.PI,TAU);c.lineTo(5,-1);c.quadraticCurveTo(4,-7,-4,-4);c.lineTo(-5,0);c.closePath();c.fill();ellipse(c,-5,0,1.9,4.2,ink);path(c,[[-1,5],[-3,9],[1,11],[4,7]],base,.65);}
 else if(!usd){c.fillStyle=ink;paper(c,-5.7,-11.2,11.4,3.8,ink,ink,.2);c.fillRect(-7,-11,3,1.7);c.fillRect(4,-11,3,1.7);if(style===10000){c.fillRect(-6.8,-13,13.6,2.5);path(c,[[-5,2],[-3,6],[0,8],[3,6],[5,2]],ink,1.6);}else{path(c,[[-3.4,2],[0,6],[3.4,2]],ink,1);}}
 else{path(c,[[-5,-4],[-5,-9],[-1,-12],[4,-10],[5,-4]],ink,1.3);if([5,50].includes(style)){c.fillStyle=ink;c.beginPath();c.moveTo(-4,0);c.lineTo(-3,5);c.lineTo(0,7);c.lineTo(3,5);c.lineTo(4,0);c.lineTo(2,3);c.lineTo(-2,3);c.fill();}if(style===100){path(c,[[-5,-7],[-7,-3],[-7,3]],ink,.8);path(c,[[5,-7],[7,-3],[7,3]],ink,.8);}path(c,[[-3.5,7],[0,10],[3.5,7]],base,.8);}
 path(c,[[-3,-4],[-1.1,-4],[1,-4],[3,-4]],ink,.45);path(c,[[0,-3],[-.7,0],[1,0]],ink,.35);path(c,[[-1.7,2],[1.8,2]],ink,.45);
 for(let i=0;i<7;i++){path(c,[[-8+i*.8,11],[-8+i*.8,17]],base+'80',.35);path(c,[[3+i*.8,11],[3+i*.8,17]],base+'80',.35);}
 c.restore();c.restore();
}
const WON_PALETTES={1000:['#dfeaf1','#416c96','#f7f9f0'],5000:['#f2d9b8','#965c3b','#fff1d8'],10000:['#d9e8cf','#456d49','#f5f4df'],50000:['#f4e2a6','#8a682b','#fff5cf']};
const USD_PALETTES={1:['#e8edce','#3c5b42','#f8f6df'],2:['#dce8ce','#385642','#f1f6db'],5:['#ece0e8','#65536c','#fbf6e9'],10:['#efdfc2','#786045','#fcf4dc'],20:['#dce8cf','#42624d','#f5f3dd'],50:['#efdfd7','#70565b','#faf3e5'],100:['#d3e7e9','#376276','#f3f6df']};
function banknote(c,denomination,count,usd){
 const [base,ink,light]=(usd?USD_PALETTES:WON_PALETTES)[denomination];
 c.save();for(let i=Math.min(count,3)-1;i>=0;i--){c.save();c.translate(-i*2,-i*1.8);paper(c,-35,-20,70,40,base,ink,.85);paper(c,-32.8,-17.8,65.6,35.6,light,ink,.45);
 c.save();c.beginPath();c.rect(-32,-17,64,34);c.clip();for(let j=0;j<30;j++){c.beginPath();for(let x=-34;x<=35;x+=1.8){const y=-18+j*1.3+Math.sin(x*.25+j*.4)*1.2;x===-34?c.moveTo(x,y):c.lineTo(x,y);}c.strokeStyle=ink+'28';c.lineWidth=.25;c.stroke();}c.restore();
 for(const sx of [-1,1])for(const sy of [-1,1]){ellipse(c,sx*29,sy*14,2.4,2.4,null,ink,.4);ellipse(c,sx*29,sy*14,1.4,1.4,null,ink,.35);}
 if(usd){
  text(c,'GARDEN RESERVE NOTE',0,-15,3.1,ink,700);text(c,'UNITED STATES OF GARDEN',0,-10.8,2.5,ink,600);portrait(c,-7,0,denomination,ink,base,true);
  text(c,denomination,-26,-10,7.3,ink,800);text(c,denomination,25.5,12,11,denomination===100?'#b58b3a':ink,800);
  ellipse(c,21,-1,5.7,5.7,null,ink,.7);ellipse(c,21,-1,4.5,4.5,null,ink,.3);text(c,'$',21,-1,7,ink,600);path(c,[[14,6],[29,6]],ink,.35);
  text(c,`${denomination} DOLLARS`,-6,15.8,3.2,ink,800);text(c,'G 8420 A',-25,10,2.6,ink,500);text(c,'SG 2026',20,-9,2.8,ink,600);
  if(denomination===100){c.fillStyle='#478cbd99';c.fillRect(6,-17,2.4,34);for(let k=-14;k<16;k+=5){c.fillStyle='#d4eef2';c.fillRect(6.4,k,1.6,1.1);}c.fillStyle='#d5993988';c.fillRect(11,5,6,7);}
 }else{
  text(c,'정 원 은 행',-5,-14.6,4.1,ink,700);portrait(c,19,0,denomination,ink,base,false);
  ellipse(c,-19,-1,7,9,ink+'10');ellipse(c,-19,-1,4.4,6,null,ink+'30',.35);
  text(c,denomination.toLocaleString('en-US'),-28,12.3,denomination===50000?9:8.7,ink,800,'left');text(c,'WON',-24,-9,3.1,ink,600);
  c.fillStyle=ink+'55';for(let j=0;j<8;j++)c.fillRect(-9+j*.9,-7+j%2, .4,14-j%3);text(c,'SG 2026',-14,4.5,2.5,ink,500);
  const patch=c.createLinearGradient(-3,-16,3,16);patch.addColorStop(0,'#d8d5b2');patch.addColorStop(.4,'#9acdc4');patch.addColorStop(.8,'#d9b9d5');patch.addColorStop(1,'#d9d4a1');c.fillStyle=patch;c.fillRect(3,-15,3.8,30);for(let j=-12;j<15;j+=6)ellipse(c,4.9,j,1.1,1.7,null,'#f5fff9aa',.4);
 }
 // Edge stitching and fine border lines remain legible when the note grows.
 path(c,[[-31,17],[31,17]],ink,.3);if(i===0){c.strokeStyle='#ffffff99';c.lineWidth=.4;c.beginPath();c.moveTo(-34,-19);c.lineTo(33,-19);c.stroke();}c.restore();}
 badge(c,count,ink);c.restore();
}
function paintWon(c,level){const stage=KRW_STAGES[level];if(stage.denomination<1000)coin(c,stage.denomination,stage.count);else banknote(c,stage.denomination,stage.count,false);}
function paintDollar(c,level){const stage=USD_STAGES[level];banknote(c,stage.denomination,stage.count,true);}
export function drawWon(c,level){drawCachedSkin(c,'money-krw',level,paintWon);}
export function drawDollar(c,level){drawCachedSkin(c,'money-usd',level,paintDollar);}
