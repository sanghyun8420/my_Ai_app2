import {carById} from './racing-model.js';
const box=(c,x,y,w,h,r=8)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
export function drawRaceCar(c,x,y,width,height,angle,config,{boost=false,rival=false,jump=0,police=false,brake=false,time=0}={}){
 c.save();c.translate(x+3+jump*.22,y+5+jump*.28);c.rotate(angle);c.fillStyle='#0006';box(c,-width/2,-height/2,width,height);c.fill();c.restore();
 c.save();c.translate(x,y-jump*.35);c.scale(1+jump*.0065,1+jump*.0065);c.rotate(angle);
 const type=config.bodyType||'sedan',w=width*(type==='suv'?1.12:type==='supercar'?1.08:1),h=height*(type==='suv'?1.04:1);
 if(boost){const len=h*(.44+Math.sin(time*37)*.1);for(const side of [-.26,.26]){const g=c.createLinearGradient(0,h/2,0,h/2+len);g.addColorStop(0,'#fff');g.addColorStop(.35,'#38bdf8');g.addColorStop(1,'#f43f5e00');c.fillStyle=g;c.beginPath();c.moveTo(w*side-4,h/2-2);c.lineTo(w*side+4,h/2-2);c.lineTo(w*side,h/2+len);c.fill();}}
 c.fillStyle='#070b12';for(const sx of [-1,1])for(const sy of [-1,1])c.fillRect(sx*w/2-2,sy*h*.27-h*.1,5,h*.2);
 const g=c.createLinearGradient(-w/2,0,w/2,0);g.addColorStop(0,config.accentColor||'#94a3b8');g.addColorStop(.18,config.bodyColor||'#64748b');g.addColorStop(.8,config.bodyColor||'#64748b');g.addColorStop(1,config.accentColor||'#94a3b8');c.fillStyle=g;box(c,-w/2,-h/2,w,h,type==='suv'?7:10);c.fill();c.strokeStyle=config.accentColor||'#e2e8f0';c.lineWidth=1.4;c.stroke();
 if(config.stripeColor){c.fillStyle=config.stripeColor;c.fillRect(-w*.12,-h/2+2,w*.24,h-4);}if(police){c.fillStyle='#f8fafc';c.fillRect(-w/2+2,-h*.18,w-4,h*.42);}
 c.fillStyle='#071522';box(c,-w*.38,-h*.23,w*.76,h*(type==='suv'?.66:.55),6);c.fill();c.fillStyle=police?'#f8fafc':config.bodyColor;box(c,-w*.28,-h*.06,w*.56,h*(type==='suv'?.38:.26),4);c.fill();
 c.strokeStyle='#c2edff66';c.lineWidth=1;c.beginPath();c.moveTo(-w*.3,-h*.18);c.lineTo(w*.3,-h*.18);c.stroke();
 if(type==='supercar'){c.fillStyle='#09090b';box(c,-w*.49,h/2-6,w*.98,5,2);c.fill();}
 if(police){const flash=Math.floor(time*9)%2;c.fillStyle=flash?'#ef4444':'#1e293b';c.fillRect(-w*.32,-2,w*.32,5);c.fillStyle=flash?'#1e293b':'#3b82f6';c.fillRect(0,-2,w*.32,5);}
 c.fillStyle=rival?'#fb7185':'#fff5b5';for(const sx of [-1,1])c.fillRect(sx*w*.32-3,-h/2+2,6,3);
 c.fillStyle=brake?'#ff2350':'#d83141';c.fillRect(-w/2+3,h/2-4,w-6,brake?4:2);c.restore();
}
export function drawRaceScene(c,race,time=0,input={}){
 const d=race.diff;c.save();c.fillStyle=d.scenery;c.fillRect(0,0,600,720);
 const curve=y=>race.curve(race.distance+(533-y)/1.45)-race.curve(race.distance),left=y=>80+curve(y),scroll=race.distance*1.45;
 for(let y=0;y<720;y+=8){const x=left(y),stripe=Math.floor((y-scroll)/40)%2===0;c.fillStyle=d.road;c.fillRect(x,y,440,9);c.fillStyle=stripe?d.curb:'#e9ede9';c.fillRect(x-12,y,12,9);c.fillRect(x+440,y,12,9);if((((y-scroll)%80)+80)%80<42){c.fillStyle='#ffffff55';for(let i=1;i<4;i++)c.fillRect(x+110*i-2,y,4,9);}}
 for(let i=0;i<10;i++){const y=((i*117+scroll*.55)%1050)-130;for(const x of [left(y)-40,left(y)+480]){c.fillStyle='#0002';c.beginPath();c.ellipse(x+3,y+5,17,24,0,0,Math.PI*2);c.fill();c.fillStyle='#72ad5766';c.beginPath();c.arc(x,y,16,0,Math.PI*2);c.fill();}}
 const remaining=race.length-race.distance;if(remaining<520){const y=533-remaining*1.45;for(let r=0;r<2;r++)for(let i=0;i<28;i++){c.fillStyle=(i+r)%2?'#0b1220':'#fff';c.fillRect(left(y)+i*16,y+r*16,16,16);}}
 for(const z of race.zones){const x=race.screenX(z.lane,z.y);c.fillStyle='#0ea5e950';box(c,x-20,z.y-45,40,90);c.fill();c.strokeStyle='#7dd3fc';c.stroke();c.fillStyle='#baf3ff';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('⚡',x,z.y+4);}
 for(const r of race.ramps){const x=race.screenX(r.lane,r.y),g=c.createLinearGradient(0,r.y+26,0,r.y-26);g.addColorStop(0,'#d97706');g.addColorStop(1,'#fde047');c.fillStyle=g;box(c,x-22,r.y-26,44,52,6);c.fill();c.fillStyle='#2a1b09';c.textAlign='center';c.font='bold 11px sans-serif';c.fillText('▲ JUMP',x,r.y+4);}
 for(const coin of race.coins){const x=race.screenX(coin.lane,coin.y);c.save();c.translate(x,coin.y);c.scale(Math.max(.3,Math.abs(Math.cos(time*6+coin.y*.02))),1);c.fillStyle='#facc15';c.strokeStyle='#fef08a';c.lineWidth=2;c.beginPath();c.arc(0,0,12,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#854d0e';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('₩',0,5);c.restore();}
 for(const t of race.traffic)drawRaceCar(c,race.screenX(t.lane,t.y),t.y,32,60,0,{bodyColor:t.color,accentColor:'#cbd5e1'},{time});
 for(const r of race.rivals){const y=533-(r.distance-race.distance)*1.45;if(y< -120||y>840)continue;const x=race.screenX(r.lane,y),car=carById(r.id);drawRaceCar(c,x,y,34,64,0,car,{boost:race.difficulty==='hell',rival:true,time});c.fillStyle='#0f172ae8';box(c,x-30,y-52,60,16,5);c.fill();c.fillStyle='#fda4af';c.font='bold 9px sans-serif';c.textAlign='center';c.fillText(car.shortBadge,x,y-40);}
 for(const p of race.police)drawRaceCar(c,race.screenX(p.lane,p.y),p.y,35,66,0,{bodyType:'sedan',bodyColor:'#0f172a',accentColor:'#38bdf8'},{boost:true,rival:true,police:true,time});
 if(!race.invulnerable||Math.floor(race.invulnerable/4)%2===0)drawRaceCar(c,300+race.x*220,533,36,68,race.tilt,race.car,{jump:race.jump,boost:race.boosting,brake:input.brake,time});
 if(race.boosting){c.strokeStyle='#bfedff55';c.lineWidth=2;for(let i=0;i<7;i++){const x=(i*97+time*13)%600,y=(i*233+time*1100)%720;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+48);c.stroke();}}
 c.restore();
}
