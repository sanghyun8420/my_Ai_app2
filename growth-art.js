import { GEAR, HEROES, DIFFICULTIES, stageName } from './growth-models.js';
const TAU=Math.PI*2;
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

export function drawHero(c,index,x,y,scale=1,time=0,gear='fork',attack=false,charm=null){
 const hero=HEROES[index],bob=Math.sin(time*3+index*1.7)*1.5,swing=attack?Math.sin(time*28)*.25:Math.sin(time*2)*.05;
 c.save();c.translate(x,y+bob);c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';oval(c,0,45,35,7,'#203b3424');
 shape(c,[[-20,-2],[-34,30],[-13,39],[15,34],[23,5]],index===0?'#c0a97a':index===1?'#a6b39b':'#91b7bd','#4f6c66',1.8);
 for(const [lx,phase]of[[-10,0],[10,1]]){c.strokeStyle='#465c51';c.lineWidth=5;c.beginPath();c.moveTo(lx,29);c.lineTo(lx+Math.sin(time*3+phase)*2,43);c.lineTo(lx+8,44);c.stroke();}
 round(c,-20,-2,40,36,12,'#fff4d9','#4b665a');c.strokeStyle=hero.color;c.lineWidth=7;c.beginPath();c.moveTo(-15,8);c.lineTo(14,8);c.stroke();
 if(index===0){c.beginPath();c.moveTo(0,-43);c.bezierCurveTo(-35,-59,-45,-19,-23,-8);c.quadraticCurveTo(0,5,25,-8);c.bezierCurveTo(45,-21,31,-58,0,-43);c.fillStyle='#dc7d6d';c.fill();c.strokeStyle='#65594c';c.lineWidth=2;c.stroke();leaf(c,0,-45,.7,.2);}
 else if(index===1){c.beginPath();c.moveTo(-9,-51);c.bezierCurveTo(-22,-47,-14,-36,-29,-25);c.bezierCurveTo(-42,-6,29,10,31,-19);c.quadraticCurveTo(13,-33,13,-45);c.quadraticCurveTo(9,-55,-9,-51);c.fillStyle='#d8c982';c.fill();c.strokeStyle='#6e704c';c.lineWidth=2;c.stroke();leaf(c,0,-48,.6,-.4);}
 else{c.beginPath();c.moveTo(0,-55);c.bezierCurveTo(-9,-42,-36,-31,-29,-12);c.bezierCurveTo(-22,7,24,5,31,-14);c.bezierCurveTo(34,-32,11,-43,0,-55);c.fillStyle='#90c2c3';c.fill();c.strokeStyle='#4b797e';c.lineWidth=2;c.stroke();leaf(c,6,-41,.55,.65,'#b6d0a1');}
 oval(c,0,-20,24,20,'#fff9df','#67715d',1.3);oval(c,-8,-22,2.3,3.3,'#3e5148');oval(c,9,-22,2.3,3.3,'#3e5148');oval(c,-16,-15,4,2,'#e5a89a');oval(c,16,-15,4,2,'#e5a89a');c.strokeStyle='#53604d';c.lineWidth=1.7;c.beginPath();c.moveTo(-3,-15);c.quadraticCurveTo(2,-10,6,-15);c.stroke();
 c.save();c.translate(18,8);c.rotate(-.4+swing);c.strokeStyle='#fff4d9';c.lineWidth=9;c.beginPath();c.moveTo(0,0);c.lineTo(16,9);c.stroke();drawGear(c,gear||'sprout',25,0,33);c.restore();
 c.fillStyle='#e5c985';oval(c,0,23,4,4,c.fillStyle,'#b49b62',1);if(charm)drawGear(c,charm,-26,23,18);c.restore();
}

function rotten(c,kind,x,y,r,time,hit=false,boss=false){
 c.save();c.translate(x,y+Math.sin(time*4+kind)*2);const squish=hit?.92:1;c.scale(r/30/squish,r/30*squish);oval(c,0,27,28,5,'#1b34392a');const colors=['#7d8760','#8b7180','#a77c58','#697e6d','#7b6e91'];
 c.beginPath();if(kind===1){c.moveTo(0,-28);c.bezierCurveTo(-35,-40,-42,-7,-25,19);c.quadraticCurveTo(0,40,26,18);c.bezierCurveTo(45,-6,31,-40,0,-28);}else c.ellipse(0,0,30,28,0,0,TAU);c.fillStyle=colors[kind%5];c.fill();c.strokeStyle='#3f5550';c.lineWidth=2;c.stroke();
 for(let i=0;i<6;i++){const a=i*2.39;oval(c,Math.cos(a)*21,Math.sin(a)*20,3+(i%3),2+(i%2),i%2?'#c9c99c':'#4e6552');}
 if(kind===0||boss){c.strokeStyle='#3c6757';c.lineWidth=3;for(let i=-1;i<2;i++){c.beginPath();c.moveTo(i*12,-25);c.bezierCurveTo(i*17,-9,i*15,10,i*11,24);c.stroke();}}
 leaf(c,0,-25,.55,-.2,'#55764b');c.strokeStyle='#293e37';c.lineWidth=2.2;c.beginPath();c.moveTo(-15,-10);c.lineTo(-5,-7);c.moveTo(6,-7);c.lineTo(17,-11);c.stroke();oval(c,-9,-2,2.6,3.7,'#253d33');oval(c,10,-2,2.6,3.7,'#253d33');c.beginPath();c.moveTo(-10,13);c.quadraticCurveTo(0,5,12,12);c.stroke();shape(c,[[-3,10],[1,16],[5,10]],'#e6dfba',null);
 if(boss){shape(c,[[-18,-24],[-22,-40],[-8,-34],[0,-46],[10,-34],[24,-40],[19,-23]],'#b8a36d','#665e44',1.4);oval(c,0,-33,3,4,'#c56e72');}
 if(hit){c.globalAlpha=.22;oval(c,0,0,30,28,'#fff5cc');}c.restore();
}
function forest(c,time){
 const sky=c.createLinearGradient(0,0,0,510);sky.addColorStop(0,'#9eb5b3');sky.addColorStop(.6,'#b7cac0');sky.addColorStop(1,'#dce0c9');c.fillStyle=sky;c.fillRect(0,0,600,510);oval(c,490,82,42,42,'#f1e6b5');
 for(let layer=0;layer<3;layer++){c.fillStyle=['#8eaaa8','#728f8c','#587c78'][layer];c.beginPath();c.moveTo(0,270+layer*18);for(let x=0;x<=620;x+=20)c.lineTo(x,205+layer*25+Math.sin(x*.016+layer*3)*30+Math.sin(x*.037)*13);c.lineTo(600,510);c.lineTo(0,510);c.fill();}
 for(const [x,y,s]of[[20,245,1.2],[535,226,1.4],[460,252,.8],[570,310,1.5],[44,325,.9]]){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#4e716d';c.fillRect(-4,-5,8,57);shape(c,[[-32,15],[0,-80],[33,15]],'#547873',null);shape(c,[[-24,-12],[0,-96],[25,-12]],'#65867d',null);c.restore();}
 c.fillStyle='#9cae8b';c.beginPath();c.moveTo(0,340);c.quadraticCurveTo(190,297,600,331);c.lineTo(600,510);c.lineTo(0,510);c.fill();c.fillStyle='#c4c39b';c.beginPath();c.moveTo(70,510);c.quadraticCurveTo(335,354,600,341);c.lineTo(600,413);c.quadraticCurveTo(341,391,288,510);c.fill();
 for(let i=0;i<27;i++){const x=(i*137+31)%600,y=359+(i*43)%145;c.strokeStyle='#66836066';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y-5);c.moveTo(x,y);c.lineTo(x+3,y-4);c.stroke();if(i%5===0){oval(c,x+5,y-3,2,2,'#eee1b2');}}
 for(let i=0;i<5;i++)leaf(c,((time*8+i*127)%650)-25,80+i*49,.28,Math.sin(time+i), '#d1d6ae99');
}
const heroPlaces=[[90,294],[165,349],[71,402]];
export function drawExpeditionScene(c,model,time=0,effects=[]){
 c.save();forest(c,time);const boss=model.enemies.find(e=>e.boss),attacking=['waves','boss'].includes(model.phase);
 for(let i=0;i<3;i++){const [x,y]=heroPlaces[i];drawHero(c,i,x,y,.8,time,model.data.equipped[i].weapon,attacking&&model.attackClock<.2,model.data.equipped[i].charm);}
 for(const enemy of [...model.enemies].sort((a,b)=>a.y-b.y)){rotten(c,enemy.kind,enemy.x,enemy.y,enemy.boss?70:28,time,enemy.hit>0,enemy.boss);if(!enemy.boss){round(c,enemy.x-25,enemy.y-39,50,5,2,'#355a4659');round(c,enemy.x-25,enemy.y-39,50*Math.max(0,enemy.hp/enemy.maxHp),5,2,'#dcc990');}}
 if(!model.enemies.length&&['camp','victory','defeat'].includes(model.phase)){round(c,280,203,265,70,18,'#f7f0d5e6','#b1b99e');label(c,model.phase==='camp'?'숲길 너머, 무슨 일이?':model.phase==='victory'?'정원이 조금 더 안전해졌어요':'숨을 고르고 다시 출발해요',412,229,14);label(c,'모아 · 포리 · 루미',412,255,11,'#7a896d');}
 const hp=model.stats().maxHp;round(c,19,461,195,29,12,'#f9f1d8','#6e8872');round(c,25,467,183*Math.max(0,model.hp/hp),17,7,'#7f9f76');label(c,`체력 ${Math.ceil(Math.max(0,model.hp))} / ${Math.round(hp)}`,117,477,11,'#334d3f');
 if(boss){round(c,274,47,300,36,14,'#fcf1d6','#8e765c');round(c,280,53,288*Math.max(0,boss.hp/boss.maxHp),24,10,'#bd7772');label(c,`${boss.name} · ${Math.ceil(model.bossLeft)}초`,424,65,12,'#533f3e');}
 else{round(c,270,52,296,32,13,'#f3ecd6cc');label(c,`${DIFFICULTIES[model.data.tier]} ${stageName(model.index)} · ${model.data.waveKills}/10`,418,68,12,'#405b4c');}
 for(const fx of effects){const t=fx.age/fx.life;c.save();c.globalAlpha=Math.max(0,1-t);if(fx.type==='shot'){const p=heroPlaces[fx.hero];const x=p[0]+35+(fx.x-p[0]-35)*Math.min(1,t*1.8),y=p[1]-25+(fx.y-p[1]+25)*Math.min(1,t*1.8)-Math.sin(t*Math.PI)*35;oval(c,x,y,5,5,['#f3d291','#c4a3c9','#c2e2dd'][fx.hero]);sparkle(c,x,y,7,'#fff1bf');}else if(fx.type==='hit'||fx.type==='hurt')label(c,String(fx.amount),fx.x,fx.y-32-t*29,fx.type==='hurt'?14:17,fx.type==='hurt'?'#9a3e45':'#fff9df');else if(fx.type==='coin')label(c,'+'+fx.amount,fx.x,fx.y-20-t*45,16,'#f8dd91');else if(fx.type==='victory'){for(let i=0;i<15;i++)sparkle(c,(i*97)%600,70+(i*43)%300+t*50,5,'#f4e2a4');}c.restore();}
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
