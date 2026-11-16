import {GameEconomy,RACING_KEY} from './economy.js';

// Vehicle roster and tuning values supplied for the garden's top-down racer.
const roster=[
 ['c_class','벤츠 C클래스','C-Class','sedan',0,'#cbd5e1','#38bdf8',null,215,10.2,.085,1.35,'기본 세단'],
 ['3_series','BMW 3시리즈','3 Series','sedan',250,'#f8fafc','#2563eb','#1d4ed8',230,10.9,.094,1.38,'스포츠 세단'],
 ['a5','아우디 A5','A5','coupe',450,'#ef4444','#fca5a5','#1e293b',242,11.4,.098,1.42,'스포트백 쿠페'],
 ['glc','벤츠 GLC','GLC','suv',650,'#334155','#94a3b8',null,238,11.3,.088,1.45,'도심형 SUV'],
 ['e_class','벤츠 E클래스','E-Class','sedan',850,'#0f766e','#5eead4',null,252,11.9,.098,1.46,'비즈니스 세단'],
 ['5_series','BMW 5시리즈','5 Series','sedan',1050,'#1d4ed8','#93c5fd','#e2e8f0',260,12.3,.104,1.48,'다이나믹 세단'],
 ['a6','아우디 A6','A6','sedan',1250,'#1e293b','#cbd5e1','#64748b',266,12.6,.108,1.5,'콰트로 세단'],
 ['x5','BMW X5','X5','suv',1500,'#e2e8f0','#3b82f6','#1e293b',264,12.5,.098,1.54,'퍼포먼스 SUV'],
 ['a7','아우디 A7','A7','coupe',1750,'#f1f5f9','#f43f5e','#0f172a',278,13.1,.112,1.54,'패스트백 GT'],
 ['q8','아우디 Q8','Q8','suv',2050,'#ea580c','#fed7aa','#18181b',276,13,.104,1.58,'플래그십 SUV'],
 ['s_class','벤츠 S클래스','S-Class','sedan',2400,'#b45309','#fde68a','#fef3c7',288,13.6,.114,1.58,'럭셔리 플래그십'],
 ['rs6','아우디 RS6','RS6','supercar',3000,'#64748b','#f43f5e','#09090b',315,14.8,.122,1.62,'슈퍼 왜건'],
 ['x6m','BMW X6M','X6M','suv',3600,'#0284c7','#7dd3fc','#0f172a',312,14.7,.116,1.66,'M 하이퍼 SUV'],
 ['rs7','아우디 RS7','RS7','supercar',4300,'#94a3b8','#ef4444','#111827',332,15.6,.128,1.66,'V8 트윈터보 GT'],
 ['xm','BMW XM','XM','suv',5000,'#18181b','#eab308','#facc15',330,15.5,.120,1.72,'M 플래그십 괴물'],
 ['m8','BMW M8','M8','supercar',5800,'#059669','#6ee7b7','#064e3b',348,16.3,.134,1.70,'M 컴페티션 쿠페'],
 ['amg_gt','벤츠 AMG GT','AMG GT','supercar',6800,'#eab308','#fef08a','#09090b',362,17,.138,1.74,'트랙 몬스터'],
 ['r8','아우디 R8','R8 V10','supercar',8000,'#dc2626','#fde047','#fef08a',378,17.8,.144,1.78,'미드십 V10 슈퍼카']
];
export const CARS=Object.freeze(roster.map((r,i)=>Object.freeze(Object.fromEntries([...['id','name','shortBadge','bodyType','price','bodyColor','accentColor','stripeColor','maxSpeed','scrollSpeed','handling','nitroPower','tag'].map((k,j)=>[k,r[j]]),['category',i<11?'luxury':'supercar']]))));
export const DIFFICULTIES=Object.freeze({
 easy:{id:'easy',label:'🟢 쉬움',length:6500,curve:95,ids:['3_series','a5','glc','e_class','5_series','a6'],speeds:[9.8,10.1,10.4,10.7,11,11.3],traffic:115,trafficMin:3.5,trafficMax:5,coin:52,ramp:260,nitro:210,police:3200,reward:450,road:'#1e293b',curb:'#10b981',scenery:'#064e3b'},
 hard:{id:'hard',label:'🟠 어려움',length:9000,curve:155,ids:['a6','x5','a7','q8','s_class','rs6'],speeds:[12,12.4,12.8,13.1,13.5,13.9],traffic:82,trafficMin:5,trafficMax:7.2,coin:46,ramp:240,nitro:230,police:2800,reward:1200,road:'#1c1917',curb:'#f59e0b',scenery:'#451a03'},
 hell:{id:'hell',label:'🔥 지옥',length:12500,curve:215,ids:['rs6','x6m','rs7','xm','m8','amg_gt'],speeds:[14.6,15.1,15.6,16.1,16.7,17.3],traffic:58,trafficMin:6.8,trafficMax:9.8,coin:40,ramp:220,nitro:250,police:2500,reward:3000,road:'#180c12',curb:'#e11d48',scenery:'#3b0712'}
});
export const UPGRADE_COSTS=[0,200,450,800,1300];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),whole=(n,d=0)=>Number.isSafeInteger(n)&&n>=0?n:d,clone=v=>JSON.parse(JSON.stringify(v));
export const carById=id=>CARS.find(c=>c.id===id)||CARS[0];
export function effectiveCar(car,upgrades={speed:1,handling:1,nitro:1}){
 const s=clamp(upgrades.speed||1,1,5)-1,h=clamp(upgrades.handling||1,1,5)-1,n=clamp(upgrades.nitro||1,1,5)-1;
 return {...car,maxSpeed:car.maxSpeed+s*11,scrollSpeed:car.scrollSpeed+s*.5,handling:car.handling+h*.009,nitroPower:1.14+(car.nitroPower-1.35)*.25+n*.045,nitroDrainRate:Math.max(.55,1.35-n*.18),nitroPadGain:1.3+n*.35};
}
export class RacingGarage {
 constructor({storage=globalThis.localStorage}={}){
  this.economy=new GameEconomy(storage,RACING_KEY);const old=this.economy.read();
  const unlockedCars=[...new Set(['c_class',...(Array.isArray(old.unlockedCars)?old.unlockedCars.filter(id=>CARS.some(c=>c.id===id)):[])])];
  this.data=this.economy.bind({coins:whole(old.coins,500),stage:Math.max(1,whole(old.stage,1)),unlockedCars,selectedCarId:unlockedCars.includes(old.selectedCarId)?old.selectedCarId:'c_class',selectedCategory:['all','luxury','supercar'].includes(old.selectedCategory)?old.selectedCategory:'all',selectedDifficulty:DIFFICULTIES[old.selectedDifficulty]?old.selectedDifficulty:'easy',upgrades:Object.fromEntries(CARS.map(car=>[car.id,Object.fromEntries(['speed','handling','nitro'].map(k=>[k,clamp(whole(old.upgrades?.[car.id]?.[k],1),1,5)]))])),completedRaces:whole(old.completedRaces),wins:whole(old.wins),earnedCoins:whole(old.earnedCoins),seconds:whole(old.seconds),bestRank:clamp(whole(old.bestRank,7),1,7),receipts:Array.isArray(old.receipts)?old.receipts.filter(id=>typeof id==='string').slice(0,32):[],activeRace:RaceSimulation.restore(old.activeRace)?.serialize()||null});
 }
 get car(){return effectiveCar(carById(this.data.selectedCarId),this.data.upgrades[this.data.selectedCarId]);}
 save(){this.economy.commit(this.data);}
 transaction(change){const before=clone(this.data),delta=this.economy.delta;try{const value=change();this.save();return value;}catch(error){this.data=this.economy.restore(before,delta);throw error;}}
 chooseCar(id){const car=CARS.find(c=>c.id===id);if(!car)throw Error('차량을 확인해 주세요.');return this.transaction(()=>{if(!this.data.unlockedCars.includes(id)){if(this.data.coins<car.price)throw Error(`레이싱 동전 ${(car.price-this.data.coins).toLocaleString()}개가 부족해요.`);this.data.coins-=car.price;this.data.unlockedCars.push(id);}this.data.selectedCarId=id;});}
 upgrade(key){if(!['speed','handling','nitro'].includes(key))throw Error('튜닝 항목을 확인해 주세요.');return this.transaction(()=>{const u=this.data.upgrades[this.data.selectedCarId],level=u[key];if(level>=5)throw Error('이미 최고 레벨이에요.');const price=UPGRADE_COSTS[level];if(this.data.coins<price)throw Error('레이싱 동전이 부족해요.');this.data.coins-=price;u[key]++;});}
 select(key,value){if(key==='selectedDifficulty'&&!DIFFICULTIES[value]||key==='selectedCategory'&&!['all','luxury','supercar'].includes(value)||!['selectedDifficulty','selectedCategory'].includes(key))throw Error('선택을 확인해 주세요.');this.transaction(()=>{this.data[key]=value;});}
 checkpoint(race){this.transaction(()=>{this.data.activeRace=race&&['countdown','racing'].includes(race.phase)?race.serialize():null;});}
 finish(result){
  if(!result||typeof result.id!=='string'||!DIFFICULTIES[result.difficulty]||!Number.isSafeInteger(result.stage)||result.stage<1||!Number.isInteger(result.rank)||result.rank<1||result.rank>7||!Number.isSafeInteger(result.trackCoins)||result.trackCoins<0||!Number.isFinite(result.seconds)||result.seconds<0)throw Error('레이스 결과를 확인해 주세요.');
  if(this.data.receipts.includes(result.id))return {awarded:false,total:0};
  if(this.data.activeRace?.id!==result.id)throw Error('진행 중인 레이스의 기록을 확인해 주세요.');
  const bonus=Math.round(DIFFICULTIES[result.difficulty].reward*(1+(result.stage-1)*.15)*[0,1,.7,.5,.35,.25,.2,.15][result.rank]),total=result.trackCoins+bonus;
  return this.transaction(()=>{if(!Number.isSafeInteger(total)||!Number.isSafeInteger(this.data.coins+total))throw Error('동전 한도를 확인해 주세요.');this.data.coins+=total;this.data.earnedCoins+=total;this.data.completedRaces++;if(result.rank===1)this.data.wins++;this.data.seconds+=Math.floor(result.seconds);this.data.bestRank=Math.min(this.data.bestRank,result.rank);this.data.stage=Math.max(this.data.stage,result.stage+1);this.data.receipts.unshift(result.id);this.data.receipts.length=Math.min(32,this.data.receipts.length);this.data.activeRace=null;return {awarded:true,total,bonus};});
 }
}
export class RaceSimulation {
 constructor({car=CARS[0],difficulty='easy',stage=1,random=Math.random,id}={}){
  this.id=id||`race-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;this.car=car.nitroDrainRate?{...car}:effectiveCar(car);this.difficulty=DIFFICULTIES[difficulty]?difficulty:'easy';this.stage=Math.max(1,whole(stage,1));this.phase='countdown';this.countdown=2.25;this.elapsed=0;this.tick=0;this.distance=0;this.speed=0;this.x=-.72;this.tilt=0;this.jump=0;this.jumpVelocity=0;this.nitro=55;this.boosting=false;this.invulnerable=0;this.trackCoins=0;this.policeLeft=0;this.nextPolice=this.diff.police;this.traffic=[];this.coins=[];this.ramps=[];this.zones=[];this.police=[];this.events=[];this.accumulator=0;this.random=random;
  this.rivals=this.diff.ids.map((id,i)=>({id,lane:[-.44,-.15,.15,.44,.72,-.72][i],target:[-.44,-.15,.15,.44,.72,-.72][i],distance:(i+1)*7,speed:this.diff.speeds[i]*(1+(this.stage-1)*.065),phase:i*1.45}));
 }
 get diff(){return DIFFICULTIES[this.difficulty];}
 get length(){return Math.round(this.diff.length*(1+(this.stage-1)*.1));}
 get rank(){return 1+this.rivals.filter(r=>r.distance>this.distance).length;}
 curve(distance){const amp=this.diff.curve*(1+(this.stage-1)*.08);return Math.sin(distance*.0018)*amp+Math.sin(distance*.0044)*amp*.42;}
 screenX(lane,y){return 300+this.curve(this.distance+(533-y)/1.45)-this.curve(this.distance)+lane*220;}
 emit(type,extra={}){this.events.push({type,...extra});}
 update(dt,input={}){if(!Number.isFinite(dt)||dt<=0||this.phase==='finished')return;this.accumulator+=Math.min(.25,dt);while(this.accumulator>=1/60){this.accumulator-=1/60;this.step(input);if(this.phase==='finished')break;}}
 step(input){
  if(this.phase==='countdown'){this.countdown-=1/60;if(this.countdown<=0){this.phase='racing';this.emit('go');}return;}
  if(this.phase!=='racing')return;this.tick++;this.elapsed+=1/60;const car=this.car,d=this.diff;
  this.boosting=!!(input.nitro&&this.nitro>1&&this.speed>3);this.nitro=clamp(this.nitro+(this.boosting?-car.nitroDrainRate:.04),0,100);
  const top=car.scrollSpeed*(this.boosting?car.nitroPower:1);
  if(input.brake)this.speed=Math.max(0,this.speed-.36);else if(input.accel||this.boosting)this.speed+=(top-this.speed)*(this.boosting?.24:.14);else this.speed=this.speed<.05?0:this.speed*.985;
  if(this.invulnerable>0){this.invulnerable--;this.speed=Math.min(this.speed,car.scrollSpeed*.52);}
  this.distance+=this.speed;const ratio=this.speed/car.scrollSpeed,delta=(this.curve(this.distance+45)-this.curve(this.distance))/45;
  if(this.jump===0&&this.speed>4)this.x-=delta*ratio*.032;
  const steering=car.handling*.25*clamp(ratio,.35,1.15);
  if(input.left&&!input.right){this.x-=steering;this.tilt=Math.max(-.22,this.tilt-.035);}else if(input.right&&!input.left){this.x+=steering;this.tilt=Math.min(.22,this.tilt+.035);}else this.tilt*=.8;
  if(Math.abs(this.x)>.78){this.x=Math.sign(this.x)*.78;this.speed*=.975;}
  if(this.jump>0||this.jumpVelocity>0){this.jump+=this.jumpVelocity;this.jumpVelocity-=.44;if(this.jump<=0){this.jump=0;this.jumpVelocity=0;this.emit('land');}}
  this.rivals.forEach((r,i)=>{r.distance+=r.speed+Math.sin(this.tick*.03+r.phase)*.65;if((this.tick+i*29)%105===0)r.target=[-.68,-.35,0,.35,.68][Math.floor(this.random()*5)];r.lane+=(r.target-r.lane)*.04;});
  const lane=()=>[-.68,-.23,.23,.68][Math.floor(this.random()*4)],spawn=(array,e)=>{if(array.length<60)array.push(e);};
  if(this.speed>.6){
   if(this.tick%Math.max(36,Math.round(d.traffic*Math.max(.68,1-(this.stage-1)*.05)))===0)spawn(this.traffic,{lane:lane(),y:-90,speed:d.trafficMin+this.random()*(d.trafficMax-d.trafficMin),color:['#64748b','#0ea5e9','#10b981','#eab308','#ec4899'][Math.floor(this.random()*5)]});
   if(this.tick%d.coin===0)spawn(this.coins,{lane:lane(),y:-40,value:this.difficulty==='hell'?35:this.difficulty==='hard'?22:12});
   if(this.tick%d.ramp===0)spawn(this.ramps,{lane:lane(),y:-80});if(this.tick%d.nitro===0)spawn(this.zones,{lane:lane(),y:-110});
  }
  const touching=(e,width,height)=>Math.abs(this.screenX(e.lane,e.y)-(300+this.x*220))<width&&Math.abs(e.y-533)<height;
  for(const z of this.zones){z.y+=this.speed*1.45;if(!this.jump&&touching(z,34,55)){this.nitro=clamp(this.nitro+car.nitroPadGain,0,100);if(this.tick%12===0)this.emit('charge');}}
  for(const r of this.ramps){r.y+=this.speed*1.45;if(!r.used&&!this.jump&&this.speed>4&&touching(r,34,36)){r.used=true;this.jump=1;this.jumpVelocity=9.8;this.speed+=2.2;this.trackCoins+=15;this.emit('jump');}}
  const collide=()=>{this.invulnerable=42;this.speed*=.45;this.emit('hit');};
  for(const t of this.traffic){t.y+=(this.speed-t.speed)*1.45;if(this.jump<12&&!this.invulnerable&&touching(t,28,52))collide();}
  this.coins=this.coins.filter(c=>{c.y+=this.speed*1.45;if(touching(c,34,46)){this.trackCoins+=c.value;this.emit('coin');return false;}return c.y<840;});
  if(!this.policeLeft&&this.distance>=this.nextPolice&&this.distance<this.length-900){this.policeLeft=540;this.nextPolice+=d.police;this.police=[{lane:-.4,y:810},{lane:.4,y:-110}];this.emit('police');}
  if(this.policeLeft){this.policeLeft--;this.police.forEach((p,i)=>{p.y+=((i?408:621)-p.y)*.04+Math.sin(this.tick*.08+i*2.1)*2.2;p.lane+=(this.x-p.lane)*.024;if(this.jump<14&&!this.invulnerable&&touching(p,30,52)){collide();this.trackCoins=Math.max(0,this.trackCoins-30);this.emit('fine');}});if(!this.policeLeft){this.police=[];this.trackCoins+=150;this.emit('escaped');}}
  for(const key of ['traffic','ramps','zones'])this[key]=this[key].filter(e=>e.y>-280&&e.y<850);
  if(this.distance>=this.length){this.phase='finished';this.boosting=false;this.result={id:this.id,stage:this.stage,difficulty:this.difficulty,rank:this.rank,seconds:this.elapsed,trackCoins:this.trackCoins};this.emit('finish');}
 }
 serialize(){const {random,events,accumulator,...state}=this;return clone({version:1,...state});}
 static restore(value){
  try{if(!value||value.version!==1||typeof value.id!=='string'||value.id.length>100||!['countdown','racing'].includes(value.phase)||!DIFFICULTIES[value.difficulty]||!Number.isSafeInteger(value.stage)||value.stage<1||value.stage>100000)return null;
   for(const k of ['countdown','elapsed','tick','distance','speed','x','tilt','jump','jumpVelocity','nitro','invulnerable','trackCoins','policeLeft','nextPolice'])if(!Number.isFinite(value[k])||Math.abs(value[k])>1e12)return null;
   if(!CARS.some(c=>c.id===value.car?.id)||!['scrollSpeed','handling','maxSpeed','nitroPower','nitroDrainRate','nitroPadGain'].every(k=>Number.isFinite(value.car[k])&&value.car[k]>0)||value.nitro<0||value.nitro>100||value.trackCoins<0)return null;
   for(const k of ['rivals','traffic','coins','ramps','zones','police']){if(!Array.isArray(value[k])||value[k].length>60)return null;for(const e of value[k]){if(!e||typeof e!=='object'||!Number.isFinite(e.lane)||Math.abs(e.lane)>2)return null;for(const [key,n]of Object.entries(e))if(typeof n==='number'&&(!Number.isFinite(n)||Math.abs(n)>1e12))return null;}}
   if(value.rivals.length!==6||value.rivals.some(r=>!CARS.some(c=>c.id===r.id)||!['target','distance','speed','phase'].every(k=>Number.isFinite(r[k])))||value.police.length>2||value.traffic.some(e=>!Number.isFinite(e.y)||!Number.isFinite(e.speed))||[...value.coins,...value.ramps,...value.zones,...value.police].some(e=>!Number.isFinite(e.y))||value.coins.some(e=>!Number.isSafeInteger(e.value)||e.value<0))return null;
   const race=new RaceSimulation({car:effectiveCar(CARS[0]),difficulty:value.difficulty,stage:value.stage,id:value.id});const allowed=Object.keys(race.serialize());for(const key of allowed)if(Object.hasOwn(value,key))race[key]=clone(value[key]);race.random=Math.random;race.events=[];race.accumulator=0;return race;
  }catch{return null;}
 }
}
