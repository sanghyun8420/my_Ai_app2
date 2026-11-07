/* Original vector artwork, lit and textured once, then cached for gameplay. */
const TAU=Math.PI*2,cache=new Map();
export const PLANET_NAMES=['수성','금성','지구','화성','목성','토성','천왕성','해왕성','명왕성','달','유로파','타이탄','청색별','태양'];
const ellipse=(c,x,y,rx,ry,fill,stroke,width=1)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
function poly(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function gradient(c,colors,x=-32,y=-40,x2=30,y2=43){const g=c.createLinearGradient(x,y,x2,y2);colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));return g;}
function radial(c,colors,x=-18,y=-22,r=67,cx=9,cy=12){const g=c.createRadialGradient(x,y,1,cx,cy,r);colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));return g;}
function noise(seed){let n=Math.imul(seed+17,0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
function text(c,label,x,y,size,color,font='sans-serif'){c.font=`700 ${size}px ${font}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(label,x,y);}
function cached(c,family,level,painter){
 const key=family+level;let surface=cache.get(key);
 if(surface){cache.delete(key);cache.set(key,surface);}
 else{
  try{surface=typeof OffscreenCanvas==='function'?new OffscreenCanvas(512,512):globalThis.document?.createElement('canvas')||new c.canvas.constructor(512,512);surface.width=512;surface.height=512;const s=surface.getContext('2d');s.translate(256,256);s.scale(4,4);s.lineCap='round';s.lineJoin='round';painter(s,level);cache.set(key,surface);if(cache.size>32)cache.delete(cache.keys().next().value);}catch{surface=null;}
 }
 if(surface)c.drawImage(surface,-64,-64,128,128);else painter(c,level);
}
const chrome=c=>gradient(c,['#fafcfd','#8b969f','#ffffff','#59656f','#dde2e5']);
function disc(c){ellipse(c,0,0,44,44,radial(c,['#ffffff','#f4f6f8','#c3cbd2']), '#aeb8c1',.8);ellipse(c,0,0,41.5,41.5,null,'#ffffffba',.6);}
function crest(c,fill,stroke='#bc963b'){c.beginPath();c.moveTo(-32,-39);c.quadraticCurveTo(0,-46,32,-39);c.lineTo(28,11);c.quadraticCurveTo(20,32,0,43);c.quadraticCurveTo(-20,32,-28,11);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
function horse(c,x=0,y=3,size=1,fill='#171a1b'){
 c.save();c.translate(x,y);c.scale(size,size);c.fillStyle=fill;c.beginPath();c.moveTo(-9,15);c.bezierCurveTo(-20,14,-18,3,-10,-2);c.lineTo(-4,-10);c.lineTo(-6,-19);c.lineTo(0,-27);c.lineTo(4,-24);c.lineTo(10,-23);c.lineTo(9,-17);c.lineTo(3,-18);c.lineTo(1,-10);c.lineTo(6,-5);c.lineTo(15,-10);c.lineTo(21,-4);c.lineTo(19,0);c.lineTo(13,-5);c.lineTo(6,3);c.lineTo(1,8);c.lineTo(8,15);c.lineTo(8,24);c.lineTo(4,24);c.lineTo(3,17);c.lineTo(-4,14);c.lineTo(-9,24);c.lineTo(-14,28);c.lineTo(-17,26);c.lineTo(-12,21);c.lineTo(-9,11);c.closePath();c.fill();c.strokeStyle=fill;c.lineWidth=2.8;c.beginPath();c.moveTo(-15,5);c.bezierCurveTo(-31,-4,-18,-14,-26,-17);c.stroke();c.restore();
}
function bull(c){c.fillStyle='#d4ae53';c.beginPath();c.moveTo(-26,4);c.bezierCurveTo(-18,-10,5,-11,17,-4);c.lineTo(23,-8);c.lineTo(29,-4);c.lineTo(28,4);c.lineTo(21,9);c.lineTo(16,7);c.lineTo(10,14);c.lineTo(10,27);c.lineTo(5,26);c.lineTo(4,12);c.lineTo(-8,11);c.lineTo(-16,22);c.lineTo(-21,21);c.lineTo(-15,5);c.closePath();c.fill();c.strokeStyle='#e7c575';c.lineWidth=2;c.beginPath();c.moveTo(22,-6);c.quadraticCurveTo(15,-17,16,-20);c.moveTo(27,-4);c.quadraticCurveTo(35,-14,32,-17);c.moveTo(-23,1);c.bezierCurveTo(-37,0,-25,-19,-37,-18);c.stroke();}
function paintCar(c,level){
 c.save();c.lineCap='round';c.lineJoin='round';const metal=chrome(c);
 if(![4,8,9,10,11,13].includes(level))disc(c);
 if(level===0){ // The connected strokes of the modern KIA wordmark.
  c.strokeStyle='#15202b';c.lineWidth=6;c.lineJoin='miter';c.lineCap='butt';c.beginPath();c.moveTo(-35,11);c.lineTo(-35,-9);c.moveTo(-34,7);c.lineTo(-16,-9);c.lineTo(-16,11);c.lineTo(11,-9);c.lineTo(11,11);c.lineTo(34,-9);c.lineTo(34,11);c.stroke();
 }else if(level===1){
  c.save();c.rotate(-.14);ellipse(c,0,0,36,21,null,metal,3.4);c.transform(1,0,-.25,1,0,0);poly(c,[[-19,-12],[-10,-15],[-14,14],[-23,13]],metal);poly(c,[[11,-14],[20,-12],[17,12],[8,15]],metal);c.strokeStyle=metal;c.lineWidth=7;c.beginPath();c.moveTo(-15,4);c.quadraticCurveTo(0,-5,15,-5);c.stroke();c.restore();
 }else if(level===2){
  for(const side of [-1,1]){poly(c,[[side*7,-9],[side*42,-13],[side*33,-1],[side*13,7]],metal,'#87929a',.8);for(let i=0;i<4;i++){c.strokeStyle='#67747f';c.lineWidth=.8;c.beginPath();c.moveTo(side*13,-6+i*3);c.lineTo(side*(37-i*3),-9+i*3);c.stroke();}}poly(c,[[-10,-13],[10,-13],[8,3],[0,10],[-8,3]],'#252b30',metal,1.5);text(c,'GENESIS',0,-2,4.8,'#eeeeef');text(c,'GENESIS',0,22,8.5,'#263541');
 }else if(level===3){
  c.fillStyle='#d42532';c.beginPath();c.moveTo(-31,-19);c.quadraticCurveTo(0,-32,31,-19);c.lineTo(26,-13);c.quadraticCurveTo(10,-18,5,-12);c.lineTo(2,28);c.lineTo(-2,28);c.lineTo(-6,-12);c.quadraticCurveTo(-15,-18,-28,-13);c.closePath();c.fill();c.strokeStyle='#d42532';c.lineWidth=3;c.beginPath();c.moveTo(-33,-24);c.quadraticCurveTo(0,-37,33,-24);c.stroke();text(c,'T E S L A',0,34,6.5,'#c62936');
 }else if(level===4){
  ellipse(c,0,0,45,31,gradient(c,['#5d8d6c','#0c3e26','#062a1a']),'#aab9a9',2);ellipse(c,0,0,41,27,null,'#e3e6d5',.8);c.save();c.transform(1,0,-.16,1,0,0);text(c,'LAND',0,-8,15,'#fffef0');text(c,'ROVER',0,9,15,'#fffef0');c.restore();c.strokeStyle='#eee9cc';c.lineWidth=1.2;c.beginPath();c.moveTo(-34,-6);c.lineTo(-25,-6);c.moveTo(26,8);c.lineTo(34,8);c.stroke();
 }else if(level===5){
  ellipse(c,0,0,34,34,null,metal,3);ellipse(c,0,0,31.5,31.5,null,'#5f6a73',.65);for(let i=0;i<3;i++){const a=-Math.PI/2+i*TAU/3;poly(c,[[0,0],[Math.cos(a-.13)*8,Math.sin(a-.13)*8],[Math.cos(a)*31,Math.sin(a)*31],[Math.cos(a+.13)*8,Math.sin(a+.13)*8]],metal,'#73808a',.5);}
 }else if(level===6){
  ellipse(c,0,0,39,39,metal,'#63717c',1);ellipse(c,0,0,35.5,35.5,'#171d24');ellipse(c,0,0,26,26,'#f3f5f4','#d6dde2',1);for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,0);c.arc(0,0,25,-Math.PI/2+i*Math.PI/2,-Math.PI/2+(i+1)*Math.PI/2);c.closePath();c.fillStyle=i%2?'#f9faf7':'#2a8cc1';c.fill();}for(const [letter,x,y,rot]of[['B',-19,-25,-.65],['M',0,-32,0],['W',19,-25,.65]]){c.save();c.translate(x,y);c.rotate(rot);text(c,letter,0,0,9,'#f7f9fb');c.restore();}
 }else if(level===7){
  for(let i=0;i<4;i++){ellipse(c,(i-1.5)*18,0,15,15,null,'#61727c',3.5);ellipse(c,(i-1.5)*18,-.4,14.2,14.2,null,'#f9fbfc',1.8);}text(c,'Audi',0,28,10,'#4b565e');
 }else if(level===8){
  crest(c,gradient(c,['#edd38c','#b98c35','#f1d791']));c.save();c.beginPath();c.rect(-27,-27,54,49);c.clip();for(let y=-24;y<24;y+=12){c.fillStyle=(y/12)%2?'#b92d2e':'#202326';c.fillRect(-28,y,19,8);c.fillRect(10,y,19,8);}c.strokeStyle='#594b2d';c.lineWidth=1;c.beginPath();c.moveTo(0,-27);c.lineTo(0,30);c.moveTo(-27,0);c.lineTo(27,0);c.stroke();c.restore();poly(c,[[-13,-11],[13,-11],[11,13],[0,24],[-11,13]],'#d7b363','#735d32',.7);horse(c,0,7,.46);text(c,'PORSCHE',0,-32,7,'#302b24');text(c,'STUTTGART',0,-7,3.9,'#352d23');
 }else if(level===9){
  crest(c,gradient(c,['#fff161','#efcb24','#be951c']),'#181c20');c.save();c.beginPath();c.rect(-28,-37,56,10);c.clip();for(const [x,color]of[[-28,'#27944c'],[-9,'#f7f5db'],[10,'#c63830']]){c.fillStyle=color;c.fillRect(x,-37,19,9);}c.restore();horse(c,-1,4,.97);text(c,'S F',0,33,8,'#1f2421');
 }else if(level===10){
  crest(c,gradient(c,['#2e302d','#090d0e','#242723']),'#c9a653');text(c,'LAMBORGHINI',0,-29,5.9,'#dfbd6d');c.save();c.translate(-1,0);c.scale(.87,.87);bull(c);c.restore();
 }else if(level===11){
  crest(c,'#dfbe63','#253a52');c.save();c.beginPath();c.moveTo(-27,-32);c.lineTo(27,-32);c.lineTo(24,12);c.lineTo(0,36);c.lineTo(-24,12);c.closePath();c.clip();for(let y=-34;y<40;y+=13)for(let x=-32;x<40;x+=13)poly(c,[[x,y+6],[x+6,y],[x+13,y+6],[x+6,y+13]],(Math.floor((x+32)/13)+Math.floor((y+34)/13))%2?'#a53e31':'#e9cf82');c.restore();poly(c,[[-10,-42],[10,-42],[8,-35],[-8,-35]],'#31507a');c.strokeStyle='#efcf68';c.lineWidth=2;c.beginPath();c.moveTo(-6,-40);c.lineTo(-6,-36);c.moveTo(0,-42);c.lineTo(0,-36);c.moveTo(6,-40);c.lineTo(6,-36);c.stroke();
 }else if(level===12){
  ellipse(c,0,0,42,24,metal,'#58646b',1.2);ellipse(c,0,0,37,18,'#243d51','#f2f5f6',1);text(c,'PAGANI',0,-1,13,'#f4f5f2','serif');text(c,'AUTOMOBILI MODENA',0,10,3.8,'#c7d0d8');
 }else{
  ellipse(c,0,0,45,29,gradient(c,['#df3849','#a51928','#6e0c1c']),'#e0e0d1',2);for(let i=0;i<34;i++){const a=i*TAU/34;ellipse(c,Math.cos(a)*41,Math.sin(a)*25,1,1,'#f5f0d8');}text(c,'EB',0,-12,13,'#18191c','serif');text(c,'BUGATTI',0,5,15,'#fffdf4');
 }
 c.restore();
}
export function drawCarLogo(c,level){cached(c,'car',level,paintCar);}

function sphere(c,color,r=43){ellipse(c,0,0,r,r,radial(c,[color[0],color[1],color[2]]));}
function clippedSphere(c,paint,r=43){c.save();c.beginPath();c.arc(0,0,r,0,TAU);c.clip();paint();c.restore();}
function terminator(c,r=43){clippedSphere(c,()=>{const g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#ffffff17');g.addColorStop(.52,'#06112500');g.addColorStop(1,'#020815ce');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);},r);}
function craters(c,count,color='#15171855'){for(let i=0;i<count;i++){const a=noise(i*7+3)*TAU,rr=Math.sqrt(noise(i*9+4))*36,x=Math.cos(a)*rr,y=Math.sin(a)*rr,r=2+noise(i*5+13)*4;ellipse(c,x,y,r,r*.8,color,'#f4e9d32e',.5);c.beginPath();c.ellipse(x-.4,y-.5,r*.7,r*.5,0,Math.PI,TAU);c.strokeStyle='#181d252b';c.lineWidth=.8;c.stroke();}}
function bands(c,colors,step=7){for(let y=-44,i=0;y<45;y+=step,i++){c.fillStyle=colors[i%colors.length];c.beginPath();c.moveTo(-48,y);for(let x=-48;x<=48;x+=4)c.lineTo(x,y+Math.sin(x*.095+i*1.7)*1.8);for(let x=48;x>=-48;x-=4)c.lineTo(x,y+step+Math.sin(x*.095+i*1.7)*1.8);c.closePath();c.fill();}}
function ring(c,front){c.save();c.rotate(-.36);c.scale(1,.32);c.strokeStyle='#b4a680';c.lineWidth=12;c.beginPath();c.arc(0,0,51,front?0:Math.PI,front?Math.PI:TAU);c.stroke();for(const [r,col,w]of[[46,'#e3d6b3',2],[49,'#6b644e',1],[53,'#dfd2af',1.6],[57,'#5b58474d',.7]]){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(0,0,r,front?0:Math.PI,front?Math.PI:TAU);c.stroke();}c.restore();}
function paintPlanet(c,level){
 c.save();const palettes=[['#c7b9a6','#8c8173','#3a3a39'],['#fae2a3','#c99954','#62482f'],['#61b6e6','#1e66a0','#102d53'],['#efab78','#b35c35','#4e2e25'],['#ecd7b2','#b59173','#51423c'],['#efe3ae','#c9b77f','#665c3c'],['#b4e2e1','#6eb7c3','#315d75'],['#579cdb','#3459a0','#102444'],['#d2bda7','#937e6c','#403a39'],['#dfdfd9','#9d9e9c','#3f4248'],['#f1e1b9','#bb9c71','#584734'],['#eccc76','#bc8c41','#5c4525'],['#d1f7ff','#4682cd','#143263'],['#fff4b2','#ffb535','#bd3a12']];
 if(level===5)ring(c,false);
 sphere(c,palettes[level],level===5?35:43);
 clippedSphere(c,()=>{
  if([0,3,8,9].includes(level)){craters(c,level===9?27:17);if(level===3)ellipse(c,-6,-39,12,4,'#e8ddc1');if(level===8){c.fillStyle='#e7ddca';c.beginPath();c.moveTo(0,-5);c.bezierCurveTo(-23,-23,-29,3,-7,16);c.bezierCurveTo(9,30,31,-11,0,-5);c.fill();}}
  else if(level===2){
   c.fillStyle='#75986b';for(const points of[[[-32,-20],[-21,-32],[-6,-27],[-9,-17],[-17,-11],[-10,-6],[-13,7],[-25,2],[-28,-9]],[[-7,8],[3,11],[4,20],[-5,34],[-10,28],[-12,16]],[[7,-26],[20,-32],[36,-15],[31,-4],[20,-6],[18,5],[9,1],[4,-11]],[[22,20],[36,24],[31,32],[19,28]]])poly(c,points,'#76965b');poly(c,[[9,-2],[21,1],[22,10],[12,21],[7,10]],'#9b9c58');ellipse(c,0,-40,20,4,'#d7eff4');c.strokeStyle='#edf8f9b5';c.lineWidth=2.3;for(const [y,x]of[[-18,3],[2,-21],[24,4]]){c.beginPath();c.ellipse(x,y,26,4,-.2,.2,Math.PI*1.5);c.stroke();}
  }else if(level===4){bands(c,['#b8754a','#ead9bb','#c6a282','#f1e3c8','#a56c4b','#dcc7a7'],6);ellipse(c,20,14,13,6,'#aa6147');ellipse(c,18,13,9,3.3,'#cd8a62');}
  else if(level===5){bands(c,['#d4c28e','#e6d6ac','#b3a174','#ebddb8'],5);}
  else if(level===1||level===11){bands(c,level===1?['#dba76388','#fff0c566','#9f713b55']:['#dbb55f99','#edd18a55','#ab743344'],5);}
  else if(level===6){bands(c,['#d5eddf25','#338eaf14','#bbebe72b'],9);}
  else if(level===7){bands(c,['#81bbeb33','#1c408055','#8db4de24'],6);ellipse(c,-13,13,12,4,'#183c7299');}
  else if(level===10){c.strokeStyle='#96694e';c.lineWidth=1;for(let i=0;i<13;i++){c.beginPath();c.moveTo(-46,-30+i*7);c.bezierCurveTo(-12,-37+i*8,3,30-i*3,48,-14+i*6);c.stroke();}}
  else{for(let i=0;i<180;i++){const a=noise(i*11+5)*TAU,r=Math.sqrt(noise(i*7+21))*43,x=Math.cos(a)*r,y=Math.sin(a)*r;c.fillStyle=level===13?(i%3?'#f6db6c88':'#c74f21aa'):'#d9f6ff80';ellipse(c,x,y,.5+noise(i*13)*2,.5+noise(i*17)*1.7,c.fillStyle);}}
 },level===5?35:43);
 terminator(c,level===5?35:43);
 if(level===5)ring(c,true);
 if(level>=12){c.strokeStyle=level===13?'#f3b34566':'#86c4f247';c.lineWidth=3;ellipse(c,0,0,44.5,44.5,null,c.strokeStyle,3);}
 c.restore();
}
export function drawPlanet(c,level){cached(c,'planet',level,paintPlanet);}

function leaf(c,x,y,scale=1,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(2,-16,20,-18,28,-14);c.bezierCurveTo(25,0,11,6,0,0);c.fillStyle=gradient(c,['#87b64c','#396a23']);c.fill();c.strokeStyle='#c5d78288';c.lineWidth=.8;c.beginPath();c.moveTo(1,0);c.lineTo(23,-12);c.stroke();c.restore();}
function stem(c,x=0,y=-31){c.strokeStyle='#685338';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-3,y-12,x+3,y-18);c.stroke();}
function fruitPath(c,type){c.beginPath();
 if(type==='apple'||type==='peach'){c.moveTo(0,-30);c.bezierCurveTo(-29,-47,-49,-19,-39,12);c.bezierCurveTo(-33,39,-12,44,0,37);c.bezierCurveTo(13,44,35,35,41,7);c.bezierCurveTo(49,-26,24,-47,0,-30);}
 else if(type==='pear'){c.moveTo(-11,-37);c.bezierCurveTo(-21,-23,-14,-11,-31,5);c.bezierCurveTo(-56,36,-25,46,1,43);c.bezierCurveTo(36,44,49,25,29,3);c.bezierCurveTo(11,-13,21,-37,7,-42);c.quadraticCurveTo(-5,-46,-11,-37);}
 else if(type==='strawberry'){c.moveTo(0,-29);c.bezierCurveTo(-31,-49,-50,-17,-37,5);c.bezierCurveTo(-25,26,-7,44,0,43);c.bezierCurveTo(10,42,29,19,39,-5);c.bezierCurveTo(50,-29,17,-44,0,-29);}
 else c.ellipse(0,3,42,type==='dragon'?38:40,0,0,TAU);
 c.closePath();
}
function glaze(c){c.save();c.fillStyle='#ffffff66';c.beginPath();c.ellipse(-20,-18,6,13,.5,0,TAU);c.fill();c.globalAlpha=.5;ellipse(c,-28,-2,2,4,'#ffffff');c.restore();}
function fruitBody(c,type,colors,texture){fruitPath(c,type);c.fillStyle=radial(c,colors,-19,-24,70);c.fill();c.save();fruitPath(c,type);c.clip();texture?.();const edge=c.createRadialGradient(-9,-12,26,0,4,53);edge.addColorStop(0,'#170d1500');edge.addColorStop(.68,'#170d1500');edge.addColorStop(1,'#170d1566');c.fillStyle=edge;c.fillRect(-50,-50,100,100);c.restore();}
function pores(c,color,count=65){for(let i=0;i<count;i++){const a=noise(i*7+11)*TAU,r=Math.sqrt(noise(i*13+31))*42;ellipse(c,Math.cos(a)*r,Math.sin(a)*r+3,.4+noise(i*5)*.35,.5,color);}}
function paintFruit3D(c,level){
 c.save();ellipse(c,3,39,31,4,'#1b29351b');
 if(level===0){
  c.strokeStyle='#65753a';c.lineWidth=2.4;c.beginPath();c.moveTo(-14,-7);c.bezierCurveTo(-22,-31,-4,-28,2,-43);c.moveTo(17,-3);c.bezierCurveTo(25,-24,5,-28,2,-43);c.stroke();leaf(c,2,-36,.7,.2);for(const [x,y,r]of[[-16,12,25],[17,14,25]]){ellipse(c,x,y,r,r,radial(c,['#f79580','#bf263d','#5e1029'],x-11,y-13,40,x,y));ellipse(c,x-9,y-9,4,7,'#ffffff6b');ellipse(c,x,y-r+2,5,2,'#651e2c');}
 }else if(level===1){
  fruitBody(c,'strawberry',['#ffb5a0','#ec4a45','#921c37'],()=>{for(let row=0;row<7;row++)for(let k=0;k<7;k++){const x=(k-3)*10+(row%2)*5,y=-24+row*9;if(Math.abs(x)<39-row*2){ellipse(c,x,y,1.35,2.1,'#a22d28');ellipse(c,x-.5,y-.7,.65,1.15,'#ffe193');}}});for(let i=0;i<6;i++){c.save();c.translate(0,-30);c.rotate(i*TAU/6);poly(c,[[0,0],[-6,-4],[0,-20],[6,-4]],gradient(c,['#9ec152','#3f742d']));c.restore();}glaze(c);
 }else if(level===2){
  stem(c,0,-27);leaf(c,0,-30,.8,-.4);for(const [x,y,r]of[[-14,-14,16],[14,-14,16],[-26,7,16],[0,6,18],[27,6,16],[-14,26,17],[14,26,17],[0,42,13]]){ellipse(c,x,y,r,r,radial(c,['#b79cde','#7752a9','#352457'],x-7,y-9,r*1.7,x,y));ellipse(c,x-5,y-6,3,4,'#ede3f14d');}
 }else if(level===3){
  fruitBody(c,'round',['#ffda7c','#f18b19','#a04412'],()=>pores(c,'#ae5b2529',95));ellipse(c,5,-33,5,2.5,'#8d7a28');leaf(c,5,-34,.65,.2);glaze(c);
 }else if(level===4){
  fruitBody(c,'apple',['#ffb195','#dd3940','#771a2f'],()=>{c.strokeStyle='#ed9c6344';c.lineWidth=.7;for(let i=-4;i<5;i++){c.beginPath();c.moveTo(i*6,-40);c.bezierCurveTo(i*10,-12,i*8,20,i*6,43);c.stroke();}pores(c,'#ffdba13b',35);});ellipse(c,0,-29,7,2.8,'#65152f55');stem(c,0,-30);leaf(c,2,-37,.85,.2);glaze(c);
 }else if(level===5){
  fruitBody(c,'pear',['#f1efa0','#c8ce50','#788132'],()=>pores(c,'#887a4e80',85));stem(c,2,-37);leaf(c,5,-42,.65,.25);glaze(c);
 }else if(level===6){
  fruitBody(c,'peach',['#ffe5ad','#f49597','#be5472'],()=>{const g=c.createLinearGradient(-15,0,13,0);g.addColorStop(0,'#7c354200');g.addColorStop(.5,'#ad5c6b77');g.addColorStop(1,'#fed19b00');c.strokeStyle=g;c.lineWidth=8;c.beginPath();c.moveTo(0,-29);c.bezierCurveTo(17,-10,-6,20,0,38);c.stroke();pores(c,'#fff3c42e',95);});leaf(c,1,-32,.95,.15);
 }else if(level===7){
  c.save();c.translate(0,9);c.scale(.8,.93);fruitBody(c,'round',['#fae189','#d9a331','#8a6425'],()=>{c.strokeStyle='#785b3666';c.lineWidth=1;for(let i=-6;i<7;i++){for(const sign of [-1,1]){c.beginPath();c.moveTo(-55,i*12);c.lineTo(55,i*12+sign*95);c.stroke();}}for(let i=0;i<65;i++){const a=noise(i*7+9)*TAU,r=Math.sqrt(noise(i*13+17))*39;ellipse(c,Math.cos(a)*r,Math.sin(a)*r+3,1,1,'#f8e39388');}});c.restore();for(let i=-3;i<4;i++)poly(c,[[i*6,-18],[i*8+(i===0?0:Math.sign(i)*11),-50+Math.abs(i)*7],[i*6+7,-20]],gradient(c,['#8daa46','#345e29']));
 }else if(level===8){
  fruitBody(c,'round',['#e2e3a6','#b2bc70','#617340'],()=>{c.strokeStyle='#f0e5acaf';c.lineWidth=.85;for(let i=-5;i<6;i++){c.beginPath();c.moveTo(i*10,-43);c.bezierCurveTo(i*7,-17,i*12,14,i*9,47);c.stroke();c.beginPath();c.moveTo(-45,i*9);c.bezierCurveTo(-18,i*7,14,i*11,45,i*9);c.stroke();}});stem(c,0,-34);glaze(c);
 }else if(level===9){
  fruitBody(c,'round',['#9cb863','#4e7f3b','#193d30'],()=>{c.fillStyle='#244d2dbb';for(let i=-3;i<4;i++){c.beginPath();c.moveTo(i*12-2,-43);c.bezierCurveTo(i*16-9,-18,i*14-7,20,i*9-2,46);c.lineTo(i*9+3,46);c.bezierCurveTo(i*14+4,18,i*16+4,-17,i*12+3,-43);c.closePath();c.fill();}pores(c,'#b8c97955',95);});stem(c,1,-34);glaze(c);
 }else if(level===10){
  for(let i=0;i<7;i++){const a=-Math.PI/2+i*TAU/7;c.save();c.rotate(a);poly(c,[[24,-9],[51,0],[26,10]],'#e45b8e','#8e2b59',.7);poly(c,[[37,-3],[51,0],[37,4]],'#b9ce50');c.restore();}fruitBody(c,'dragon',['#ffb1cb','#e44c91','#8f235e']);for(let i=0;i<6;i++){const a=i*2.399,x=Math.cos(a)*25,y=Math.sin(a)*24;c.save();c.translate(x,y);c.rotate(a);poly(c,[[-3,4],[13,-2],[2,-14]],gradient(c,['#ff9cb9','#bc326c']));poly(c,[[3,-11],[10,-3],[2,-3]],'#b6ca57');c.restore();}glaze(c);
 }else if(level===11){
  const points=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?23:45;return[Math.cos(a)*r,Math.sin(a)*r];});c.save();c.translate(1,4);poly(c,points,'#a98a25');c.restore();poly(c,points,radial(c,['#fff5ab','#e4ca48','#92932e']),'#a8a745',.8);for(let i=0;i<5;i++){const a=-Math.PI/2+i*TAU/5;c.strokeStyle='#fff9be9c';c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*41,Math.sin(a)*41);c.stroke();ellipse(c,Math.cos(a+.2)*10,Math.sin(a+.2)*10,1.5,3,'#9b7037');}
 }else if(level===12){
  fruitBody(c,'round',['#b484ac','#693a77','#2b1d46'],()=>pores(c,'#d6c2c039',60));for(let i=0;i<4;i++){c.save();c.translate(0,-31);c.rotate(i*TAU/4);c.beginPath();c.ellipse(11,0,16,7,0,0,TAU);c.fillStyle=gradient(c,['#95b451','#3e6d31']);c.fill();c.restore();}stem(c,1,-32);glaze(c);
 }else{
  for(let i=0;i<9;i++){const a=i*TAU/9;poly(c,[[Math.cos(a-.2)*31,Math.sin(a-.2)*31],[Math.cos(a)*49,Math.sin(a)*49],[Math.cos(a+.2)*31,Math.sin(a+.2)*31]],gradient(c,['#ffe5a3','#d99124']));}fruitBody(c,'round',['#fff3bd','#edb148','#b96629'],()=>{for(let i=0;i<8;i++){const a=i*TAU/8;c.strokeStyle='#ffe5ad9a';c.lineWidth=1;c.beginPath();c.moveTo(Math.cos(a)*9,Math.sin(a)*9);c.quadraticCurveTo(Math.cos(a+.2)*28,Math.sin(a+.2)*28,Math.cos(a)*40,Math.sin(a)*40);c.stroke();}});glaze(c);
 }
 c.restore();
}
export function drawFruit3D(c,level){cached(c,'fruit3d',level,paintFruit3D);}
