/** Chemistry recipes followed by an explicitly thematic journey through a massive star. */
export const SCIENCE_STAGES = Object.freeze([
  {id:'hydrogen',name:'수소 원자',label:'H',radius:18,points:1,color:'#d6f3ff'},
  {id:'oxygen',name:'산소 원자',label:'O',radius:24,points:1,color:'#ed7b80'},
  {id:'hydrogen2',name:'수소 분자',label:'H₂',radius:25,points:4,color:'#bde7fa'},
  {id:'hydroxyl',name:'중간 결합',label:'OH',radius:28,points:5,color:'#e5a3af'},
  {id:'water',name:'물 분자',label:'H₂O',radius:32,points:12,color:'#7cd3f3'},
  {id:'droplet',name:'물방울',label:'물방울',radius:39,points:20,color:'#69bfe9'},
  {id:'cloud',name:'구름',label:'구름',radius:46,points:32,color:'#c9dce9'},
  {id:'nebula',name:'성운',label:'성운',radius:54,points:50,color:'#b094df'},
  {id:'protostar',name:'원시별',label:'원시별',radius:62,points:80,color:'#f1ba78'},
  {id:'massive-star',name:'무거운 별',label:'별',radius:70,points:125,color:'#9cdbff'},
  {id:'red-supergiant',name:'적색초거성',label:'초거성',radius:79,points:190,color:'#ee8463'},
  {id:'iron-core',name:'철핵',label:'Fe',radius:87,points:280,color:'#a8b5cb'},
  {id:'core-collapse',name:'핵붕괴',label:'핵붕괴',radius:96,points:420,color:'#a29ce7'},
  {id:'supernova',name:'초신성',label:'초신성',radius:108,points:700,color:'#ffdfae'},
].map(stage=>Object.freeze(stage)));

export function scienceReaction(a,b){
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=SCIENCE_STAGES.length||b>=SCIENCE_STAGES.length)return null;
  const low=Math.min(a,b),high=Math.max(a,b);
  if(low===0&&high===0)return 2;
  if(low===0&&high===1)return 3;
  if((low===0&&high===3)||(low===1&&high===2))return 4;
  return a===b&&a>=4&&a<13?a+1:null;
}

const TAU=Math.PI*2;
const circle=(c,x,y,r,fill,stroke=null,width=1)=>{c.beginPath();c.arc(x,y,r,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
const ellipse=(c,x,y,rx,ry,angle,fill,stroke=null,width=1)=>{c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
function text(c,value,x,y,size=17,color='#f8fcff'){
  c.save();c.fillStyle=color;c.textBaseline='middle';
  const font=n=>`800 ${n}px "DM Sans","Noto Sans KR",system-ui,sans-serif`;
  if(String(value).includes('₂')){
    const glyphs=[...String(value)].map(char=>{const sub=char==='₂';c.font=font(size*(sub?.68:1));return {char:sub?'2':char,sub,width:c.measureText(sub?'2':char).width};});
    let left=x-glyphs.reduce((sum,g)=>sum+g.width,0)/2;c.textAlign='left';
    for(const g of glyphs){c.font=font(size*(g.sub?.68:1));c.fillText(g.char,left,y+(g.sub?size*.23:0));left+=g.width;}
  }else{c.font=font(size);c.textAlign='center';c.fillText(value,x,y);}
  c.restore();
}
function glow(c,x,y,r,color,opacity=1){
  c.save();c.globalAlpha*=opacity;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');circle(c,x,y,r,g);c.restore();
}
function ball(c,x,y,r,colors,letter=null){
  const g=c.createRadialGradient(x-r*.38,y-r*.42,r*.02,x+r*.25,y+r*.3,r*1.35);
  g.addColorStop(0,colors[0]);g.addColorStop(.5,colors[1]);g.addColorStop(1,colors[2]);
  circle(c,x,y,r,g,'#526d87',1.1);ellipse(c,x-r*.35,y-r*.38,r*.17,r*.1,-.5,'#ffffff80');
  if(letter)text(c,letter,x,y+r*.07,r*1.02,letter==='H'?'#315777':'#fff5f3');
}
const H=['#ffffff','#daeff8','#85b1cd'],O=['#ffd4d6','#e67c82','#9f4666'];
function bond(c,x1,y1,x2,y2){c.strokeStyle='#a9cadd';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.strokeStyle='#effbff';c.lineWidth=3;c.beginPath();c.moveTo(x1,y1-2);c.lineTo(x2,y2-2);c.stroke();}
function star(c,x,y,outer,inner,points,color,rotation=-Math.PI/2){
  c.beginPath();for(let i=0;i<points*2;i++){const a=rotation+i*Math.PI/points,r=i%2?inner:outer;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();c.fillStyle=color;c.fill();
}
function orbit(c,rx,ry,angle,color,width=1.5){ellipse(c,0,0,rx,ry,angle,null,color,width);}
function iron(c,time){
  glow(c,0,0,49,'#b1ccff63');
  const g=c.createRadialGradient(-15,-19,1,10,10,51);g.addColorStop(0,'#e8effb');g.addColorStop(.48,'#9daec8');g.addColorStop(1,'#384d72');circle(c,0,0,37,g,'#bfdbef',1.7);
  for(let i=0;i<3;i++)ellipse(c,0,-12+i*12,34,8,0,null,i%2?'#4e6585':'#d6e7f15c',1.6);
  circle(c,-14,-15,5,'#e7f5ff43');text(c,'Fe',0,0,26,'#f7fcff');
  for(let i=0;i<5;i++){const a=i*TAU/5+time*.1;circle(c,Math.cos(a)*43,Math.sin(a)*43,1.8,'#c3e1ff');}
}

/** Draw a stage inside its collision radius; every call preserves the Canvas state. */
export function drawScience(c,level,x,y,r,angle=0,alpha=1,time=0){
  const stage=SCIENCE_STAGES[level];if(!stage||!Number.isFinite(r)||r<=0)return;
  const callerFill=c.fillStyle;c.save();c.translate(x,y);c.rotate(angle);c.scale(r/50,r/50);c.globalAlpha*=Math.max(0,Math.min(1,alpha));c.lineCap='round';c.lineJoin='round';
  if(level===0||level===1){
    const isH=level===0;glow(c,0,0,49,isH?'#a4e0ff48':'#ff849540');ball(c,0,0,41,isH?H:O,isH?'H':'O');
    ellipse(c,0,0,47,15,-.48,null,isH?'#b9e8ffad':'#ffc0cc9c',1.5);const a=time*.65+(isH?.8:2.2);ellipse(c,Math.cos(a)*44,Math.sin(a)*15,2.5,2.5,0,'#f4fbff');
  }else if(level===2){
    bond(c,-20,0,20,0);ball(c,-21,0,23,H,'H');ball(c,21,0,23,H,'H');text(c,'H₂',0,37,11,'#effaff');
  }else if(level===3){
    bond(c,-14,0,28,0);ball(c,-14,0,29,O,'O');ball(c,29,0,16,H,'H');text(c,'OH',0,39,11,'#ffe4e8');
  }else if(level===4){
    // H–O–H uses a bent geometry (~104.5°), with two hydrogen balls and one oxygen.
    bond(c,0,8,-31,-16);bond(c,0,8,31,-16);ball(c,0,8,26,O,'O');ball(c,-31,-16,15,H,'H');ball(c,31,-16,15,H,'H');text(c,'H₂O',0,43,11,'#d8f5ff');
  }else if(level===5){
    glow(c,0,5,48,'#67c8ff36');c.beginPath();c.moveTo(0,-46);c.bezierCurveTo(-7,-30,-34,-6,-32,16);c.bezierCurveTo(-28,54,31,53,33,15);c.bezierCurveTo(34,-6,8,-29,0,-46);c.closePath();
    const g=c.createLinearGradient(-24,-23,28,39);g.addColorStop(0,'#d6f7ff');g.addColorStop(.44,'#64c4ec');g.addColorStop(1,'#256dba');c.fillStyle=g;c.fill();c.strokeStyle='#bbebfa';c.lineWidth=1.8;c.stroke();ellipse(c,-12,5,5,13,.25,'#eafcffb0');ellipse(c,9,30,13,3,-.3,'#a7eaff77');
  }else if(level===6){
    glow(c,0,2,49,'#9fd3f736');ellipse(c,0,34,33,5,0,'#598dbd3b');
    for(const [cx,cy,rr]of[[-27,7,18],[-12,-6,24],[14,-8,26],[31,8,16],[4,17,28]])ball(c,cx,cy,rr,['#ffffff','#d6e7f1','#8bb0cb']);
    for(let i=0;i<3;i++){c.strokeStyle='#8fd3f0';c.lineWidth=2;c.beginPath();c.moveTo(-16+i*17,35);c.lineTo(-20+i*17,42);c.stroke();}
  }else if(level===7){
    const colors=['#6b91dfb0','#a77bdbb0','#df94c5a0','#88d5ddb0'];
    for(let i=0;i<9;i++){const a=i*2.4+time*.04,rad=12+(i%3)*8;glow(c,Math.cos(a)*rad,Math.sin(a)*rad*.8,27,colors[i%4]);}
    for(let i=0;i<15;i++){const a=i*2.39,rr=7+(i*13)%34;star(c,Math.cos(a)*rr,Math.sin(a)*rr,1.2+(i%3)*.6,.5,4,i%2?'#eff4ff':'#ffe0ee');}
    orbit(c,39,19,-.4,'#cca5f27c',1.1);
  }else if(level===8){
    glow(c,0,0,49,'#edb06c66');ellipse(c,0,3,47,14,-.31,'#c185615c','#f2c492b0',1.1);ellipse(c,0,2,44,7,-.31,null,'#f6d7a9',2.4);
    ball(c,0,0,23,['#fff9d5','#f4bc72','#b86442']);glow(c,0,0,30,'#ffedac5c');
    for(let i=0;i<6;i++){const a=i*TAU/6+time*.2;circle(c,Math.cos(a)*43,Math.sin(a)*13-1,1.2,'#ffe6b6');}
  }else if(level===9){
    glow(c,0,0,50,'#7fcfff7a');for(let i=0;i<12;i++){const a=i*TAU/12+time*.03;star(c,Math.cos(a)*35,Math.sin(a)*35,6,1.6,4,'#a5e1ffb0',a);}
    ball(c,0,0,31,['#ffffff','#c3eeff','#5698d3']);circle(c,-8,-11,8,'#f8ffff5c');orbit(c,42,42,0,'#91ceef65',1);
  }else if(level===10){
    glow(c,0,0,49,'#ed8a5569');star(c,0,0,47,35,18,'#f5aa596d',time*.06);ball(c,0,0,38,['#ffe2a0','#ef9255','#a53e3e']);
    for(let i=0;i<10;i++){const a=i*2.4+time*.025,rr=10+(i*7)%22;ellipse(c,Math.cos(a)*rr,Math.sin(a)*rr,4+i%3,2+i%2,a,'#b9553f45');}ellipse(c,-13,-17,11,5,-.6,'#ffe8ad63');
  }else if(level===11){iron(c,time);
  }else if(level===12){
    glow(c,0,0,49,'#9a88ec63');orbit(c,44,18,-.4,'#b3caff9c',2);orbit(c,40,16,.55,'#b494e988',1.5);
    ball(c,0,0,20,['#ffffff','#b5a9f1','#5e548f']);circle(c,0,0,9,'#f4f1ff');
    for(let i=0;i<6;i++){const a=i*TAU/6+time*.04,px=Math.cos(a)*37,py=Math.sin(a)*37;c.save();c.translate(px,py);c.rotate(a);c.strokeStyle='#a6e9ff';c.lineWidth=2;c.beginPath();c.moveTo(4,0);c.lineTo(-9,0);c.moveTo(-9,0);c.lineTo(-4,-4);c.moveTo(-9,0);c.lineTo(-4,4);c.stroke();c.restore();}
  }else{
    glow(c,0,0,50,'#f1b7a487');star(c,0,0,48,19,12,'#9fdaf29c',time*.015);star(c,0,0,43,16,9,'#ffc184dc',-.3);star(c,0,0,34,12,7,'#ffebbe');glow(c,0,0,29,'#fff5dc');circle(c,0,0,13,'#fffdf1');
    for(let i=0;i<9;i++){const a=i*2.4;circle(c,Math.cos(a)*43,Math.sin(a)*43,1.4+i%2,'#d0f4ff');}
  }
  c.restore();c.fillStyle=callerFill;
}

/** A quiet space/lab field, kept deterministic for screenshots and seeded rounds. */
export function drawScienceBackground(c,width,height,time=0){
  const callerFill=c.fillStyle;c.save();const sky=c.createLinearGradient(0,0,width*.45,height);sky.addColorStop(0,'#172941');sky.addColorStop(.6,'#1f354d');sky.addColorStop(1,'#253b50');c.fillStyle=sky;c.fillRect(0,0,width,height);
  const haze=c.createRadialGradient(width*.8,height*.2,1,width*.8,height*.2,width*.65);haze.addColorStop(0,'#7d74bd1f');haze.addColorStop(1,'#00000000');c.fillStyle=haze;c.fillRect(0,0,width,height);
  c.strokeStyle='#9ad9ed0c';c.lineWidth=1;for(let x=24;x<width;x+=40){c.beginPath();c.moveTo(x,105);c.lineTo(x,height);c.stroke();}for(let y=120;y<height;y+=40){c.beginPath();c.moveTo(10,y);c.lineTo(width-10,y);c.stroke();}
  for(let i=0;i<54;i++){const x=15+(i*137.3)%(width-30),y=108+(i*83.7)%(height-126),r=.6+(i%3)*.35;c.globalAlpha=.32+Math.sin(time*.32+i)*.12;circle(c,x,y,r,i%5?'#b8d4e7':'#d6bfe8');}
  c.globalAlpha=1;const lines=[[.12,.29,.22,.35],[.22,.35,.32,.28],[.7,.7,.78,.77],[.78,.77,.91,.72]];c.strokeStyle='#a8b4db16';for(const [x1,y1,x2,y2]of lines){c.beginPath();c.moveTo(x1*width,y1*height);c.lineTo(x2*width,y2*height);c.stroke();}c.restore();c.fillStyle=callerFill;
}

/** One soft shockwave after a terminal merge; no rapid flashing or repeated strobe. */
export function drawSupernova(c,x,y,age,reduced=false){
  if(!Number.isFinite(age)||age<0||age>=2.5)return;const t=age/2.5,fade=Math.max(0,1-t),callerFill=c.fillStyle;c.save();
  if(reduced){glow(c,x,y,155,'#ffcfa85c',fade*.75);star(c,x,y,52,18,10,'#fff0bd70');c.restore();c.fillStyle=callerFill;return;}
  const expand=1-(1-t)**3,r=35+expand*390;
  glow(c,x,y,90+expand*155,'#f5c89a50',fade);c.globalAlpha=fade*.46;
  circle(c,x,y,r,null,'#a8e8f4',Math.max(1,9*(1-t)));circle(c,x,y,r*.82,null,'#f7c292',Math.max(1,4*(1-t)));
  for(let i=0;i<18;i++){const a=i*TAU/18+Math.sin(i*2.3)*.1,inner=20+expand*65,outer=inner+fade*85+expand*115;c.strokeStyle=i%3?'#ffe0b0':'#bce9ff';c.lineWidth=1.5+(i%3);c.beginPath();c.moveTo(x+Math.cos(a)*inner,y+Math.sin(a)*inner);c.lineTo(x+Math.cos(a)*outer,y+Math.sin(a)*outer);c.stroke();}
  c.globalAlpha=fade*.8;star(c,x,y,24+expand*24,8,8,'#fff2cb');c.restore();c.fillStyle=callerFill;
}
