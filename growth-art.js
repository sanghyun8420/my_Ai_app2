import { GEAR, HEROES, DIFFICULTIES, stageName } from './growth-models.js';
const TAU=Math.PI*2;
const wrap=(value,span)=>((value%span)+span)%span;
const oval=(c,x,y,rx,ry,fill,stroke=null,width=2)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
function shape(c,points,fill,stroke='#354f49',width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function round(c,x,y,w,h,r,fill,stroke){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function label(c,words,x,y,size=16,color='#334d45',align='center'){c.fillStyle=color;c.font=`700 ${size}px "Noto Sans KR",system-ui,sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillText(words,x,y);}
function leaf(c,x,y,size=1,angle=0,color='#82aa6e'){c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(1,-22,24,-20);c.quadraticCurveTo(25,-1,0,0);c.fillStyle=color;c.fill();c.strokeStyle='#456950';c.lineWidth=1.2;c.stroke();c.beginPath();c.moveTo(1,-1);c.lineTo(18,-15);c.stroke();c.restore();}
function sparkle(c,x,y,r=6,color='#f5d89b'){shape(c,[[x,y-r],[x+r*.25,y-r*.25],[x+r,y],[x+r*.25,y+r*.25],[x,y+r],[x-r*.25,y+r*.25],[x-r,y],[x-r*.25,y-r*.25]],color,null);}

export function drawGear(c,id,x,y,size=32){
 const gear=GEAR.find(g=>g.id===id);c.save();c.translate(x,y);c.scale(size/40,size/40);c.strokeStyle='#4a5b50';c.lineWidth=3;c.lineCap='round';c.lineJoin='round';
 const icon=gear?.icon||'leaf';
 if(icon==='fork'){c.strokeStyle='#a17b4a';c.lineWidth=5;c.beginPath();c.moveTo(0,20);c.lineTo(0,-6);c.stroke();c.strokeStyle='#cbbd94';c.lineWidth=3;for(const x of [-9,0,9]){c.beginPath();c.moveTo(x,-20);c.lineTo(x,-5);c.quadraticCurveTo(x,-1,0,-1);c.stroke();}}
 else if(icon==='shield'){shape(c,[[-16,-15],[0,-21],[16,-15],[13,9],[0,22],[-13,9]],'#b78e61');oval(c,0,-8,14,8,'#785b42');leaf(c,0,6,.5,-.8);}
 else if(icon==='jar'){round(c,-15,-10,30,29,8,'#ddb45b','#6c6a45');round(c,-17,-17,34,9,3,'#e6e1b5','#6c6a45');label(c,'♥',0,5,17,'#b67c42');}
 else if(icon==='hammer'){c.strokeStyle='#7b9c60';c.lineWidth=6;c.beginPath();c.moveTo(0,22);c.lineTo(0,-10);c.stroke();shape(c,[[-21,-12],[-13,-22],[22,-12],[17,1]],'#db955d');leaf(c,-17,-18,.5,-1);}
 else if(icon==='drop'){oval(c,0,0,17,20,null,'#c3ae75',2);c.beginPath();c.moveTo(0,-15);c.bezierCurveTo(-21,4,-13,21,0,21);c.bezierCurveTo(16,21,18,3,0,-15);c.fillStyle='#85c6d0';c.fill();oval(c,-5,6,3,5,'#eef8e9');}
 else if(icon==='star'||icon==='sun'){c.strokeStyle='#8a704d';c.lineWidth=5;c.beginPath();c.moveTo(-9,22);c.lineTo(4,-13);c.stroke();if(icon==='sun'){oval(c,4,-13,12,12,'#ebc563','#96673a');for(let i=0;i<8;i++){const a=i*TAU/8;c.strokeStyle='#dca84e';c.lineWidth=2;c.beginPath();c.moveTo(4+Math.cos(a)*15,-13+Math.sin(a)*15);c.lineTo(4+Math.cos(a)*20,-13+Math.sin(a)*20);c.stroke();}}else sparkle(c,4,-13,18,'#cfb2d4');}
 else if(icon==='moon'){oval(c,0,0,19,21,'#90accc','#536b88');oval(c,7,-7,14,15,'#e8edc9');oval(c,12,-10,12,14,'#90accc');sparkle(c,-9,9,5,'#fff1be');}
 else{leaf(c,-12,16,1.2,-.2,'#81b88d');oval(c,2,4,4,4,'#ebd99b');}
 c.restore();
}

export function drawHero(c,index,x,y,scale=1,time=0,gear='fork',attack=false,charm=null,pose={}){
 const hero=HEROES[index],walk=pose.reduced?0:Math.max(0,Math.min(1,pose.walk??(pose.active?1:0))),moving=walk>0,beat=(pose.stride??time*7)+index*1.9;
 const strike=typeof attack==='number'?attack:attack?(Math.sin(time*10)+1)*.5:0;
 const hop=pose.celebrate&&!pose.reduced?Math.max(0,Math.sin(time*8+index*1.8))*12:0;
 const bob=Math.abs(Math.sin(beat))*3*walk+Math.sin(time*2.8+index)*1.7*(1-walk)-hop;
 const push=pose.reduced?0:strike*[22,-5,-7][index],lean=pose.reduced?0:strike*[.16,-.09,-.12][index];
 c.save();c.translate(x,y);c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';
 oval(c,0,45,34-hop*.5,6,'#244f3828');c.translate(push,bob-(index===1?strike*9:0));c.rotate(lean-(pose.hurt||0)*.08);
 const sway=Math.sin(time*5+index)*4;
 shape(c,[[-20,-2],[-35-sway,29],[-17-sway,40],[12,34],[22,5]],['#ce584c','#9d8acc','#5aaba1'][index],'#485c48',1.8);
 for(const [lx,phase]of[[-11,0],[11,Math.PI]]){const step=moving?Math.sin(beat+phase)*8*walk:0;c.strokeStyle='#485a43';c.lineWidth=6;c.beginPath();c.moveTo(lx,27);c.lineTo(lx+step,39-Math.max(0,step)*.35);c.lineTo(lx+8+step,43-Math.max(0,step)*.35);c.stroke();}
 round(c,-21,-2,42,37,12,'#fff3d5','#4d624c');c.strokeStyle=hero.color;c.lineWidth=8;c.beginPath();c.moveTo(-16,7);c.lineTo(14,7);c.stroke();
 shape(c,[[-16,7],[-29-sway,9],[-19-sway,17],[-14,12]],hero.color,null);
 if(index===0){c.beginPath();c.moveTo(0,-43);c.bezierCurveTo(-35,-59,-45,-19,-23,-8);c.quadraticCurveTo(0,5,25,-8);c.bezierCurveTo(45,-21,31,-58,0,-43);c.fillStyle='#ee8270';c.fill();c.strokeStyle='#855444';c.lineWidth=2;c.stroke();oval(c,-18,-36,6,9,'#ffb69a');leaf(c,0,-45,.7,.2+Math.sin(time*4)*.1);}
 else if(index===1){c.beginPath();c.moveTo(-9,-51);c.bezierCurveTo(-22,-47,-14,-36,-29,-25);c.bezierCurveTo(-42,-6,29,10,31,-19);c.quadraticCurveTo(13,-33,13,-45);c.quadraticCurveTo(9,-55,-9,-51);c.fillStyle='#e6cf73';c.fill();c.strokeStyle='#8b8051';c.lineWidth=2;c.stroke();oval(c,-14,-29,5,8,'#fff0aa');leaf(c,0,-48,.6,-.4);}
 else{c.beginPath();c.moveTo(0,-55);c.bezierCurveTo(-9,-42,-36,-31,-29,-12);c.bezierCurveTo(-22,7,24,5,31,-14);c.bezierCurveTo(34,-32,11,-43,0,-55);c.fillStyle='#7fc9c2';c.fill();c.strokeStyle='#437b72';c.lineWidth=2;c.stroke();oval(c,-16,-26,5,8,'#b6eee0');leaf(c,6,-41,.55,.65+Math.sin(time*4)*.1,'#b6d0a1');}
 oval(c,0,-20,24,20,'#fff9e1','#7b795c',1.3);
 const blink=Math.sin(time*1.25+index*2)>.995;
 if(blink||pose.celebrate){c.strokeStyle='#40513d';c.lineWidth=2;for(const ex of [-8,9]){c.beginPath();c.moveTo(ex-3,-22);c.quadraticCurveTo(ex,-25,ex+3,-22);c.stroke();}}
 else{oval(c,-8,-22,2.3,3.3,'#3e5140');oval(c,9,-22,2.3,3.3,'#3e5140');}
 oval(c,-16,-15,4,2,'#efa99c');oval(c,16,-15,4,2,'#efa99c');c.strokeStyle='#53604d';c.lineWidth=1.7;c.beginPath();c.moveTo(-3,-15);c.quadraticCurveTo(2,strike>.4?-7:-10,6,-15);c.stroke();
 // Each role has a distinct wind-up and follow-through, even with its own equipped tool.
 c.save();c.translate(18,8);c.rotate(-.4+strike*[1.1,-.85,-.35][index]);c.strokeStyle='#fff4d9';c.lineWidth=9;c.beginPath();c.moveTo(0,0);c.lineTo(16+strike*7,9);c.stroke();
 if(gear)drawGear(c,gear,27+strike*7,0,34);
 else if(index===2){c.strokeStyle='#8a7950';c.lineWidth=3;c.beginPath();c.moveTo(23,-21);c.quadraticCurveTo(51,0,23,25);c.stroke();c.strokeStyle='#e3e5bd';c.lineWidth=1.3;c.beginPath();c.moveTo(23,-21);c.lineTo(18-strike*10,0);c.lineTo(23,25);c.stroke();leaf(c,25,-19,.35,-.6);}
 else{c.strokeStyle='#987545';c.lineWidth=4;c.beginPath();c.moveTo(26,20);c.lineTo(26,-22);c.stroke();leaf(c,25,-22,.65,-.6);if(index===1)sparkle(c,29,-26,4+strike*5,'#fff0b2');}
 c.restore();oval(c,0,24,4,4,'#e6be6b','#b49b62',1);if(charm)drawGear(c,charm,-26,23,18);c.restore();
}

function rotten(c,enemy,time,reduced=false){
 const {kind,boss}=enemy,r=boss?79:35,walking=enemy.x>(boss?331:214),beat=time*(boss?5:9)+enemy.id*1.8;
 const hit=enemy.hit>0?Math.min(1,enemy.hit/.16):0,hop=reduced?0:Math.abs(Math.sin(beat))*(walking?7:3);
 const lunge=reduced?0:Math.max(0,1-enemy.cooldown/.2)*10;
 c.save();c.translate(enemy.x,enemy.y);oval(c,0,r*.88,r*.9-hop*.45,r*.16,'#244c382b');
 c.translate(hit*(boss?8:17)-lunge,-hop);c.rotate(reduced?0:Math.sin(beat)*.055-hit*.16);
 c.scale(r/30*(1+hit*.13),r/30*(1-hit*.12));
 if(boss&&enemy.hp/enemy.maxHp<.35){c.save();c.globalAlpha=.15+(reduced?0:Math.sin(time*9)*.06);oval(c,0,0,36,35,'#ed8b62');c.restore();}
 c.strokeStyle='#536448';c.lineWidth=4;c.lineCap='round';
 for(const side of [-1,1]){c.beginPath();c.moveTo(side*12,21);c.lineTo(side*17+Math.sin(beat+(side===1?Math.PI:0))*(walking&&!reduced?5:0),32);c.lineTo(side*22,33);c.stroke();c.beginPath();c.moveTo(side*25,5);c.quadraticCurveTo(side*35,11,side*31,16-Math.sin(beat)*3);c.stroke();}
 const colors=['#91a85c','#b0788b','#c69b54','#728f63','#9480ad'];
 c.beginPath();if(kind===1){c.moveTo(0,-28);c.bezierCurveTo(-35,-40,-42,-7,-25,19);c.quadraticCurveTo(0,40,26,18);c.bezierCurveTo(45,-6,31,-40,0,-28);}else c.ellipse(0,0,30,28,0,0,TAU);
 c.fillStyle=colors[kind%5];c.fill();c.strokeStyle='#465a3d';c.lineWidth=2;c.stroke();
 oval(c,-12,-14,8,4,'#ffffff26');for(let i=0;i<6;i++){const a=i*2.39;oval(c,Math.cos(a)*21,Math.sin(a)*20,3+(i%3),2+(i%2),i%2?'#ddd99b':'#4b6147');}
 if(kind===0||boss){c.strokeStyle='#456c4b';c.lineWidth=3;for(let i=-1;i<2;i++){c.beginPath();c.moveTo(i*12,-25);c.bezierCurveTo(i*17,-9,i*15,10,i*11,24);c.stroke();}}
 leaf(c,0,-25,.55,-.2+Math.sin(time*5+kind)*.12,'#628447');c.strokeStyle='#293e30';c.lineWidth=2.2;c.beginPath();c.moveTo(-15,-10);c.lineTo(-5,-7);c.moveTo(6,-7);c.lineTo(17,-11);c.stroke();
 if(hit||enemy.defeated){for(const x of [-9,10]){c.beginPath();c.moveTo(x-3,-5);c.lineTo(x+2,-1);c.lineTo(x-3,3);c.stroke();}}
 else{oval(c,-9,-2,2.6,3.7,'#253d33');oval(c,10,-2,2.6,3.7,'#253d33');}
 c.beginPath();c.moveTo(-10,13);c.quadraticCurveTo(0,5,12,12);c.stroke();shape(c,[[-3,10],[1,16],[5,10]],'#f6e9bd',null);
 if(boss){shape(c,[[-18,-24],[-22,-40],[-8,-34],[0,-46],[10,-34],[24,-40],[19,-23]],'#e6bf5c','#806132',1.4);oval(c,0,-33,3,4,'#eb8273');}
 if(hit){c.globalAlpha=hit*.35;oval(c,0,0,30,28,'#fff5cc');}c.restore();
}
function cloud(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);for(const [cx,cy,rx,ry]of[[-29,5,30,13],[0,-4,31,21],[29,4,33,15]])oval(c,cx,cy,rx,ry,'#fff9dcbe');c.restore();}
function forest(c,time,camera=0){
 const sky=c.createLinearGradient(0,0,0,510);sky.addColorStop(0,'#91c9bb');sky.addColorStop(.6,'#d4e7bd');sky.addColorStop(1,'#f0e6ad');c.fillStyle=sky;c.fillRect(0,0,600,510);
 const glow=c.createRadialGradient(476,83,8,476,83,170);glow.addColorStop(0,'#fff5bb9c');glow.addColorStop(1,'#fff5bb00');c.fillStyle=glow;c.fillRect(300,0,300,255);oval(c,476,83,37,37,'#ffe7a0');
 cloud(c,wrap(time*5+160-camera*.05,780)-90,66,.8);cloud(c,wrap(time*3+390-camera*.03,780)-90,129,.58);cloud(c,wrap(time*4+650-camera*.04,780)-90,45,.65);
 for(let layer=0;layer<3;layer++){c.fillStyle=['#abc9a5','#80b38f','#60977c'][layer];c.beginPath();c.moveTo(0,270+layer*18);for(let x=0;x<=620;x+=20)c.lineTo(x,209+layer*25+Math.sin((x+camera*(.12+layer*.075))*.016+layer*3)*30+Math.sin((x+camera*(.12+layer*.075))*.037)*13);c.lineTo(600,510);c.lineTo(0,510);c.fill();}
 for(let i=0;i<3;i++){const x=wrap(time*17+i*179-camera*.08,740)-70,y=119+i*12+Math.sin(time*1.8+i)*5,wing=Math.sin(time*8+i)*4;c.strokeStyle='#698d76';c.lineWidth=1.8;c.beginPath();c.moveTo(x-6,y-wing);c.quadraticCurveTo(x-3,y-3,x,y);c.quadraticCurveTo(x+3,y-3,x+6,y-wing);c.stroke();}
 for(const [baseX,y,s]of[[12,250,1.2],[541,243,1.2],[469,250,.7],[732,330,1.4],[207,290,.9]]){const x=wrap(baseX-camera*.52+130,860)-130;c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#82744b';round(c,-5,-19,10,69,3,c.fillStyle);c.translate(Math.sin(time*1.3+x)*2,0);oval(c,0,-47,37,43,'#4d8b68');oval(c,-23,-34,25,30,'#599a70');oval(c,20,-35,25,32,'#67a573');oval(c,-7,-64,26,28,'#77b47d');c.restore();}
 c.fillStyle='#a0be76';c.beginPath();c.moveTo(0,280);c.quadraticCurveTo(190,246,600,266);c.lineTo(600,510);c.lineTo(0,510);c.fill();
 c.fillStyle='#d8c99b';c.beginPath();c.moveTo(45,510);c.quadraticCurveTo(290,355,600,332);c.lineTo(600,421);c.quadraticCurveTo(347,392,281,510);c.fill();
 for(let i=0;i<18;i++){const x=wrap(260+(i*61)%335-camera,660)-30,y=357+(i*27)%135;oval(c,x,y,2+i%3,1,'#b4a78465');}
 for(let i=0;i<38;i++){const x=wrap((i*137+31)%648-camera*1.12+24,648)-24,y=358+(i*43)%145,sway=Math.sin(time*2.4+i)*3;c.strokeStyle='#668d50aa';c.lineWidth=1.4;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-2,y-6,x-4+sway,y-9);c.moveTo(x,y);c.quadraticCurveTo(x+3,y-4,x+5+sway,y-7);c.stroke();if(i%4===0){for(let p=0;p<4;p++){const a=p*TAU/4;oval(c,x+5+sway+Math.cos(a)*2,y-8+Math.sin(a)*2,2,2,i%8?'#f7e9ae':'#eab9a8');}oval(c,x+5+sway,y-8,1.6,1.6,'#d6a44f');}}
 for(let i=0;i<7;i++){const x=wrap(time*10+i*103-camera*.7,690)-45,y=133+(i*49)%280+Math.sin(time+i)*12;leaf(c,x,y,.18+(i%3)*.04,Math.sin(time+i), '#ecdfa3b0');}
 for(let i=0;i<2;i++){const x=wrap(325+i*180+Math.sin(time*.6+i)*28-camera*.35+35,670)-35,y=194+i*190+Math.sin(time*1.7+i)*11,wing=.4+Math.abs(Math.sin(time*12))*1.8;c.save();c.translate(x,y);c.rotate(Math.sin(time+i)*.2);oval(c,-wing*3,0,wing*3,5,i?'#f4d08d':'#f5bcab');oval(c,wing*3,0,wing*3,5,i?'#f4d08d':'#f5bcab');oval(c,0,1,1,4,'#69784d');c.restore();}
}
const heroPlaces=[[171,286],[82,344],[157,402]];
const projectileColors=['#ffe2a1','#d8b8f1','#bcf3d2'];
function damage(c,words,x,y,size,color){c.font=`900 ${size}px "Noto Sans KR",system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=3;c.strokeStyle='#3a5039b8';c.strokeText(words,x,y);c.fillStyle=color;c.fillText(words,x,y);}
function projectile(c,hero,x,y,angle,t){c.save();c.translate(x,y);c.rotate(angle);const color=projectileColors[hero];
 if(hero===0){c.strokeStyle='#fff7cf';c.lineWidth=4;c.beginPath();c.moveTo(-18,-11);c.quadraticCurveTo(13,0,-18,11);c.stroke();c.strokeStyle='#efad62';c.lineWidth=2;c.beginPath();c.moveTo(-21,-15);c.quadraticCurveTo(23,0,-21,15);c.stroke();}
 else if(hero===1){for(let j=3;j>0;j--)oval(c,-j*7,0,7-j,7-j,color+'88');oval(c,0,0,8,8,'#aa82c5');oval(c,-2,-2,4,4,'#fbe6ff');sparkle(c,0,0,10+Math.sin(t*20)*2,'#fff2cf');}
 else{c.strokeStyle='#dff9ce';c.lineWidth=3;c.beginPath();c.moveTo(-24,0);c.lineTo(8,0);c.stroke();shape(c,[[10,0],[-2,-5],[-2,5]],'#fcf4c4',null);shape(c,[[-16,0],[-23,-5],[-20,0],[-23,5]],'#68a985',null);}
 c.restore();}
function combatEffects(c,effects,reduced,places=heroPlaces){
 for(const fx of effects){const t=Math.max(0,Math.min(1,fx.age/fx.life));c.save();
  if(fx.type==='shot'){
   const p=places[fx.hero],delay=fx.hero*.045,fly=Math.max(0,Math.min(1,(fx.age-delay)/.23));
   if(fly>0&&fly<1){const sx=p[0]+34,sy=p[1]-15,x=sx+(fx.x-sx)*fly,y=sy+(fx.y-sy)*fly-Math.sin(fly*Math.PI)*18;projectile(c,fx.hero,x,y,Math.atan2(fx.y-sy,fx.x-sx),t);}
   if(fx.hero===0&&fx.age<.28){c.globalAlpha=Math.sin(fx.age/.28*Math.PI)*.8;c.strokeStyle='#fff0bc';c.lineWidth=6;c.beginPath();c.arc(p[0]+42,p[1]-6,34,-1.8,.7);c.stroke();}
  }else if(fx.type==='hit'||fx.type==='tap'){
   const spread=Math.min(1,fx.age/.22),burst=Math.max(0,1-fx.age/.3);c.globalAlpha=burst;
   for(let i=0;i<(reduced?3:7);i++){const a=i*2.4+(fx.hero||0),dist=8+spread*24;c.strokeStyle=i%2?'#fff1b4':'#f3b770';c.lineWidth=3;c.beginPath();c.moveTo(fx.x+Math.cos(a)*dist*.55,fx.y+Math.sin(a)*dist*.55);c.lineTo(fx.x+Math.cos(a)*dist,fx.y+Math.sin(a)*dist);c.stroke();}
   if(fx.type==='hit'){c.globalAlpha=Math.min(1,(1-t)*2);const lane=(fx.hero??1)-1;damage(c,String(fx.amount),fx.x+lane*22,fx.y-36-(reduced?8:t*38)-Math.sin(t*Math.PI)*7,fx.boss?22:19,'#fff7c9');}
  }else if(fx.type==='hurt'){
   c.globalAlpha=1-t;const p=places[fx.hero??0];damage(c,'−'+fx.amount,p[0],p[1]-48-(reduced?5:t*33),19,'#ffbbb0');
  }else if(fx.type==='coin'||fx.type==='victory'){
   const victory=fx.type==='victory',x=fx.x??350,y=fx.y??270,count=reduced?4:victory?24:10;
   if(!victory&&fx.kind!==undefined&&t<.42){c.save();c.globalAlpha=1-t/.42;c.translate(x,y-(reduced?0:Math.sin(t/.42*Math.PI)*21));c.rotate(reduced?0:t*2.4);const shrink=1-t*1.4;c.scale(shrink,shrink);rotten(c,{id:fx.enemyId||0,kind:fx.kind,x:0,y:0,hit:0,cooldown:1,hp:0,maxHp:1,defeated:true},0,true);c.restore();}
   for(let i=0;i<count;i++){const a=i*2.399,dist=(victory?150:64)*(1-(1-t)**3),px=x+Math.cos(a)*dist,py=y+Math.sin(a)*dist*.6+t*t*48;c.globalAlpha=Math.max(0,1-t);if(i%3===0){const turn=.3+Math.abs(Math.cos(t*9+i))*.7;oval(c,px,py,5*turn,6,'#f7cc64','#be913f',1);c.fillStyle='#fff0af';c.fillRect(px-1,py-3,1.5,5);}else sparkle(c,px,py,(victory?5:4)*(1-t)+1,i%2?'#fff1b8':'#b7e5b1');}
   if(!victory){c.globalAlpha=1-t;damage(c,'+'+fx.amount,x,y-48-t*36,18,'#ffe29a');}
  }else if(fx.type==='boss'){
   c.globalAlpha=Math.min(1,(1-t)*3,t*10);const slide=reduced?0:Math.max(0,.18-t)*220;
   round(c,175+slide,127,250,45,15,'#594a3de8','#e5bc6b');label(c,'⚔  보스가 나타났다!',300+slide,150,20,'#ffebbb');
  }
  c.restore();
 }
}
export function drawExpeditionScene(c,model,time=0,effects=[],drawHUD=true,options={}){
 const reduced=!!options.reducedMotion,boss=model.enemies.find(e=>e.boss),active=['waves','boss'].includes(model.phase);
 const journey=options.journey,camera=reduced?0:journey?.distance||0,lead=reduced?0:journey?.lead||0;
 const places=heroPlaces.map(([x,y])=>[x+lead,y]);
 const viewEffects=reduced?effects:effects.map(fx=>Number.isFinite(fx.worldX)?{...fx,x:fx.worldX-camera}:fx);
 c.save();c.beginPath();c.rect(0,0,600,510);c.clip();forest(c,reduced?0:time,camera);
 const impact=effects.find(f=>f.type==='hurt'&&f.age<.18),punch=impact&&!reduced?(1-impact.age/.18)*(boss?3:1.5):0;
 c.save();if(punch)c.translate(Math.sin(time*95)*punch,Math.cos(time*81)*punch*.6);
 const actors=places.map(([x,y],i)=>({y:y+44,draw:()=>{
  const shot=[...effects].reverse().find(f=>f.type==='shot'&&f.hero===i&&f.age<.55),age=shot?Math.max(0,shot.age-i*.045):0;
  const strike=shot?Math.sin(Math.min(1,age/.48)*Math.PI):0;
  drawHero(c,i,x,y,1.04,reduced?0:time,model.data.equipped[i].weapon,strike,model.data.equipped[i].charm,{active:!journey&&active,walk:journey?(active?journey.walk:0):undefined,stride:journey?journey.distance*.15:undefined,hurt:impact?1-impact.age/.18:0,celebrate:model.phase==='victory',reduced});
 }}));
 for(const raw of model.enemies){const enemy=journey&&!reduced?{...raw,x:journey.project(raw)}:raw;actors.push({y:enemy.y+(enemy.boss?79:35),draw:()=>{rotten(c,enemy,reduced?0:time,reduced);if(!enemy.boss){const x=enemy.x,y=enemy.y-49;round(c,x-25,y,50,6,3,'#42613e65');round(c,x-25,y,50*Math.max(0,enemy.hp/enemy.maxHp),6,3,'#f3db8d');}}});}
 actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());combatEffects(c,viewEffects,reduced,places);
 if(journey?.walk&&!reduced&&active){for(const [i,[x,y]]of places.entries())for(let j=0;j<3;j++){const t=wrap(journey.distance*.02+j/3+i*.2,1);oval(c,x-15-t*35,y+46-t*7,2+t*4,1.5+t*2,`rgba(244,225,179,${(1-t)*.36*journey.walk})`);}}c.restore();
 if(model.phase==='camp'){
  // A sign planted in the scene keeps the camp lively without a large blocking card.
  c.fillStyle='#9f8051';round(c,407,223,8,85,3,c.fillStyle);shape(c,[[329,170],[492,170],[507,192],[492,216],[329,216]],'#fbebc7','#967e51',2);label(c,'숲길 원정 준비!',415,188,17,'#6a6744');label(c,'아래에서 모험 시작',415,205,10,'#8a8058');
 }
 const hp=model.stats().maxHp,ratio=Math.max(0,model.hp/hp);round(c,18,461,219,30,13,'#fff5dce6','#6e8872');round(c,24,467,207*ratio,18,8,ratio<.3?'#cf8970':'#7fba7c');label(c,`♥ ${Math.ceil(Math.max(0,model.hp))} / ${Math.round(hp)}`,127,477,15,'#344f3d');
 if(drawHUD){if(boss){round(c,263,35,313,48,14,'#fff3d9ee','#8e765c');round(c,271,61,297*Math.max(0,boss.hp/boss.maxHp),13,6,'#c57a70');label(c,`${boss.name} · ${Math.ceil(model.bossLeft)}초`,418,49,13,'#594637');}
 else{round(c,302,38,274,33,13,'#fff4d7d9');label(c,`${DIFFICULTIES[model.data.tier]} ${stageName(model.index)} · 처치 ${model.data.waveKills}/10`,439,55,13,'#405b4c');}}
 if(boss&&boss.hp/boss.maxHp<.35){round(c,449,98,117,25,10,'#936048db');label(c,'보스가 분노했어요!',507,111,10,'#fff0bd');}
 c.restore();
}

function apple(c,x,y,r,color,face=false,time=0){c.save();c.translate(x,y);c.scale(r/30,r/30);const g=c.createRadialGradient(-12,-14,2,9,12,48);g.addColorStop(0,'#ffe5b9');g.addColorStop(.35,color);g.addColorStop(1,'#76494b');c.beginPath();c.moveTo(0,-23);c.bezierCurveTo(-28,-40,-42,-4,-26,18);c.quadraticCurveTo(-10,35,0,28);c.quadraticCurveTo(18,34,30,10);c.bezierCurveTo(40,-11,21,-39,0,-23);c.fillStyle=g;c.fill();c.strokeStyle='#755849';c.lineWidth=1.4;c.stroke();leaf(c,0,-24,.55,.1);c.strokeStyle='#6a6243';c.lineWidth=2;c.beginPath();c.moveTo(0,-23);c.quadraticCurveTo(-3,-34,4,-38);c.stroke();oval(c,-14,-12,4,8,'#fff9e45c');if(face){oval(c,-8,2,1.9,2.8,'#543e37');oval(c,8,2,1.9,2.8,'#543e37');c.strokeStyle='#543e37';c.lineWidth=1.4;c.beginPath();c.moveTo(-3,9);c.quadraticCurveTo(0,13,4,8);c.stroke();oval(c,-15,8,3,1.5,'#e0a392');oval(c,15,8,3,1.5,'#e0a392');}c.restore();}
export function drawOrchardScene(c,model,time=0,effects=[]){
 c.save();const p=model.data,stage=model.stage,sun=model.now()<p.sunUntil;
 const sky=c.createLinearGradient(0,0,0,510);sky.addColorStop(0,'#e8d8bf');sky.addColorStop(1,'#f6edce');c.fillStyle=sky;c.fillRect(0,0,600,510);oval(c,487,80,sun?49:39,sun?49:39,sun?'#f1d58a':'#eee1af');for(const [x,y,s]of[[90,76,1],[371,126,.7]]){c.save();c.translate(x+Math.sin(time*.1)*3,y);c.scale(s,s);for(let i=0;i<3;i++)oval(c,(i-1)*28,0,30,13,'#faf4e1');c.restore();}
 c.fillStyle='#b9c5a1';c.beginPath();c.moveTo(0,300);c.quadraticCurveTo(190,250,330,309);c.quadraticCurveTo(475,257,600,285);c.lineTo(600,510);c.lineTo(0,510);c.fill();c.fillStyle='#d6d7ad';c.fillRect(0,357,600,153);
 for(let i=0;i<15;i++){const x=i*46;c.fillStyle='#e6d7b8';round(c,x,325,8,68,3,c.fillStyle);c.fillStyle='#e8dbbc';c.fillRect(x,342,48,6);c.fillRect(x,364,48,6);}
 oval(c,300,442,126,24,'#6c81532a');const pot=['#bc8267','#ba8c69','#aa946b','#ba9b6a'][Math.min(3,Math.floor(p.upgrades.basket/8))];shape(c,[[226,378],[374,378],[358,450],[242,450]],pot,'#866d50',2);round(c,217,370,166,25,9,'#d3a080','#8f7558');oval(c,300,373,74,13,'#6d6047');label(c,'APPLE GARDEN',300,418,10,'#f3dfb8');
 if(stage===0){oval(c,300,358,7+Math.min(p.growth,19)*.35,7,'#9e7754');leaf(c,298,354,.3+p.growth*.025,-.2);}
 else{
  const height=68+Math.min(stage,4)*34;c.strokeStyle='#897047';c.lineWidth=7+stage*1.7;c.lineCap='round';c.beginPath();c.moveTo(300,370);c.bezierCurveTo(292,320,310,300,300,370-height);c.stroke();
  const branches=stage===1?[[300,320,-.5],[301,303,.9]]:[[295,302,-1],[306,280,.1],[289,258,-1.8],[305,231,.8],[300,204,-.5]];
  for(let i=0;i<branches.length;i++){const [x,y,a]=branches[i];if(y<370-height+10)continue;c.strokeStyle='#88764c';c.lineWidth=3;c.beginPath();c.moveTo(300,y+19);c.lineTo(x+(i%2?52:-53),y);c.stroke();for(let j=0;j<3;j++)leaf(c,x+(i%2?30:-60)+j*12,y+(j%2)*7,.9+stage*.08,a+Math.sin(time*.7+i)*.05,'#91ae71');}
  if(stage>=3){const points=[[247,264],[351,259],[285,207],[237,321],[355,324]];for(let i=0;i<points.length;i++){const [x,y]=points[i],bob=Math.sin(time*1.8+i)*1.4;if(stage===3){for(let j=0;j<5;j++){const a=j*TAU/5;oval(c,x+Math.cos(a)*7,y+Math.sin(a)*7,5,5,'#f0b8b6');}oval(c,x,y,3,3,'#dcc578');}else apple(c,x,y+bob,stage===5?30:20+(p.growth-80)*.45,stage===5?model.variety.color:'#aabc76',i===2,time);}}
 }
 if(p.bug){const x=396+Math.sin(time*4)*7,y=183+Math.cos(time*3)*5;oval(c,x-7,y-7,9,6,'#fff9e1cc');oval(c,x+7,y-7,9,6,'#fff9e1cc');oval(c,x,y,7,9,'#98768c');oval(c,x-2,y-3,1.2,1.2,'#2a4440');oval(c,x+3,y-3,1.2,1.2,'#2a4440');}
 round(c,133,463,334,28,12,'#f9f1d6','#b2b491');label(c,model.mood,300,478,12,'#5e7556');
 for(const fx of effects){const t=fx.age/fx.life;c.save();c.globalAlpha=1-t;if(fx.type==='water'){for(let i=0;i<12;i++)oval(c,250+(i*19)%94,170+t*180+(i%3)*19,2.5,5,'#7dbbc5');}else if(fx.type==='harvest'){for(let i=0;i<7;i++){const a=i*TAU/7;apple(c,300+Math.cos(a)*t*170,260+Math.sin(a)*t*110+t*90,13,model.variety.color);}}else if(fx.type==='care')sparkle(c,300+Math.sin(t*8)*40,260-t*70,7,'#fff5ce');c.restore();}
 c.restore();
}
