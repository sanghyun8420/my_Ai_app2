import {GameEconomy,RACING_KEY} from './economy.js';
import {referenceCars} from './racing-reference.js';

// Vehicle roster and tuning values supplied for the garden's top-down racer.
const roster=[
 ['c_class','벤츠 C클래스','C-Class','sedan',0,'#cbd5e1','#38bdf8',null,215,10.2,.085,1.35,'기본 세단'],
 ['3_series','BMW 3시리즈','3 Series','sedan',250,'#079cae','#8fd5db',null,230,10.9,.094,1.38,'스포츠 세단'],
 ['a5','아우디 A5','A5','coupe',450,'#e2e6eb','#f8fafc',null,242,11.4,.098,1.42,'스포트백 쿠페'],
 ['glc','벤츠 GLC','GLC','suv',650,'#334155','#94a3b8',null,238,11.3,.088,1.45,'도심형 SUV'],
 ['e_class','벤츠 E클래스','E-Class','sedan',850,'#0f766e','#5eead4',null,252,11.9,.098,1.46,'비즈니스 세단'],
 ['5_series','BMW 5시리즈','5 Series','sedan',1050,'#0c8ba6','#a2def0',null,260,12.3,.104,1.48,'다이나믹 세단'],
 ['a6','아우디 A6','A6','sedan',1250,'#73716b','#d4cebf',null,266,12.6,.108,1.5,'콰트로 세단'],
 ['x5','BMW X5','X5','suv',1500,'#e2e8f0','#3b82f6','#1e293b',264,12.5,.098,1.54,'퍼포먼스 SUV'],
 ['a7','아우디 A7','A7','coupe',1750,'#f1f5f9','#f43f5e','#0f172a',278,13.1,.112,1.54,'패스트백 GT'],
 ['q8','아우디 Q8','Q8','suv',2050,'#b9a480','#e3cda7',null,276,13,.104,1.58,'플래그십 SUV'],
 ['s_class','벤츠 S클래스','S-Class','sedan',2400,'#161a22','#c5c8ce',null,288,13.6,.114,1.58,'럭셔리 플래그십'],
 ['rs6','아우디 RS6','RS6','supercar',3000,'#4b555d','#a5afb7',null,315,14.8,.122,1.62,'슈퍼 왜건'],
 ['x6m','BMW X6M','X6M','suv',3600,'#aeb8c1','#d5e4ef',null,312,14.7,.116,1.66,'M 하이퍼 SUV'],
 ['rs7','아우디 RS7','RS7','supercar',4300,'#94a3b8','#ef4444','#111827',332,15.6,.128,1.66,'V8 트윈터보 GT'],
 ['xm','BMW XM','XM','suv',5000,'#222d55','#8493bc',null,330,15.5,.120,1.72,'M 플래그십 괴물'],
 ['m8','BMW M8','M8','supercar',5800,'#214c91','#83a2d9',null,348,16.3,.134,1.70,'M 컴페티션 쿠페'],
 ['amg_gt','벤츠 AMG GT','AMG GT','supercar',6800,'#a2b6c2','#e4f3fa',null,362,17,.138,1.74,'트랙 몬스터'],
 ['r8','아우디 R8','R8 V10','supercar',8000,'#1766a1','#8bbfdf',null,378,17.8,.144,1.78,'미드십 V10 슈퍼카']
];
export const CARS=Object.freeze(roster.map((r,i)=>Object.freeze(Object.fromEntries([...['id','name','shortBadge','bodyType','price','bodyColor','accentColor','stripeColor','maxSpeed','scrollSpeed','handling','nitroPower','tag'].map((k,j)=>[k,r[j]]),['category',i<11?'luxury':'supercar']]))));
export const DIFFICULTIES=Object.freeze({
 easy:{id:'easy',label:'🟢 쉬움',length:6500,curve:0,ids:['3_series','a5','glc','e_class','5_series','a6'],speeds:[9.8,10.1,10.4,10.7,11,11.3],traffic:115,trafficMin:3.5,trafficMax:5,coin:52,ramp:260,nitro:210,police:3200,reward:450,road:'#1e293b',curb:'#10b981',scenery:'#064e3b'},
 hard:{id:'hard',label:'🟠 보통',length:9000,curve:36,ids:['a6','x5','a7','q8','s_class','rs6'],speeds:[12,12.4,12.8,13.1,13.5,13.9],traffic:82,trafficMin:5,trafficMax:7.2,coin:46,ramp:240,nitro:230,police:2800,reward:1200,road:'#1c1917',curb:'#f59e0b',scenery:'#451a03'},
 hell:{id:'hell',label:'🔥 어려움',length:12500,curve:90,ids:['rs6','x6m','rs7','xm','m8','amg_gt'],speeds:[14.6,15.1,15.6,16.1,16.7,17.3],traffic:58,trafficMin:6.8,trafficMax:9.8,coin:40,ramp:220,nitro:250,police:2500,reward:3000,road:'#180c12',curb:'#e11d48',scenery:'#3b0712'}
});
export const WORLD_TRAVEL_SCALE=.45;
export const UPGRADE_COSTS=[0,200,450,800,1300];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),whole=(n,d=0)=>Number.isSafeInteger(n)&&n>=0?n:d,clone=v=>JSON.parse(JSON.stringify(v));
export const carById=id=>CARS.find(c=>c.id===id)||CARS[0];
export const PLAYER_Y = 533;
export const ROAD_HALF_WIDTH = 220;
export const ROAD_LANES = Object.freeze([-.68, -.23, .23, .68]);
const ROAD_PIXELS_PER_UNIT = 1.45;
const MAX_STEERING_LANE = .78;
const CLEARANCE = 3;
const CONTACT_CLEARANCE = 9;

export function vehicleProfile(car = {}) {
 if (car.id === 'rs6') return { type: 'wagon', width: 1.06, length: 1.09 };
 if (car.bodyType === 'suv') return { type: 'suv', width: 1.15, length: 1.08 };
 if (car.bodyType === 'supercar') return { type: 'supercar', width: 1.09, length: .94 };
 if (car.bodyType === 'coupe') return { type: 'coupe', width: 1.04, length: .98 };
 return { type: 'sedan', width: 1, length: 1 };
}

export function vehicleDimensions(config, width, length) {
 const profile = vehicleProfile(config);
 const bodyWidth = width * profile.width;
 const bodyLength = length * profile.length;
 const sprite = Object.hasOwn(referenceCars, config.id) ? referenceCars[config.id].top : null;
 if (!sprite) return { type: profile.type, width: bodyWidth, length: bodyLength };
 const ratio = sprite[2] / sprite[3];
 // Keep the photo and physical footprint in the same proportions.
 const fittedLength = Math.min(bodyLength, bodyWidth / ratio);
 return { type: profile.type, width: fittedLength * ratio, length: fittedLength };
}

function trafficCar(color, spriteIndex) {
 const bodyType = color === '#64748b' || color === '#10b981' ? 'suv' : color === '#ec4899' ? 'coupe' : 'sedan';
 const fallback = { '#64748b': 0, '#0ea5e9': 1, '#10b981': 2, '#eab308': 5, '#ec4899': 7 };
 return { bodyType, npcIndex: Number.isInteger(spriteIndex) ? spriteIndex : (fallback[color] ?? 0),
  bodyColor: color, accentColor: '#cbd5e1' };
}

function policeCar(kind) {
 const heavy = kind === 'armored' || kind === 'tank';
 return {
  npcIndex: kind === 'tank' ? undefined : kind === 'armored' ? 11 : 4,
  bodyType: heavy ? 'suv' : 'sedan',
  bodyColor: kind === 'tank' ? '#566745' : heavy ? '#293d4d' : '#edf3f6',
  accentColor: heavy ? '#adbec6' : '#12599a'
 };
}

export function vehicleBoundsIntersect(a, b, padding = 0) {
 return Math.abs(a.y - b.y) < a.halfLength + b.halfLength + padding
  && Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth + padding;
}

export function effectiveCar(car,upgrades={speed:1,handling:1,nitro:1}){
 const s=clamp(upgrades.speed||1,1,5)-1,h=clamp(upgrades.handling||1,1,5)-1,n=clamp(upgrades.nitro||1,1,5)-1;
 return {...car,maxSpeed:car.maxSpeed+s*11,scrollSpeed:car.scrollSpeed+s*.5,handling:car.handling+h*.009,nitroPower:1.14+(car.nitroPower-1.35)*.25+n*.045,nitroDrainRate:Math.max(.55,1.35-n*.18),nitroPadGain:1.3+n*.35};
}
/** Displayed automatic transmission; RPM is a game simulation, independent of rewards. */
export function raceTelemetry(race){
 const speed=Math.max(0,Math.round(race.speed/race.car.scrollSpeed*race.car.maxSpeed)),ratio=speed/race.car.maxSpeed,bands=[0,.14,.28,.44,.62,.82,1.02,1.3];
 let gear=1;while(gear<7&&ratio>bands[gear])gear++;
 const fraction=clamp((ratio-bands[gear-1])/(bands[gear]-bands[gear-1]),0,1);
 return {speed,gear,rpm:Math.round((speed<2?850:1500+fraction*5200+(race.boosting?400:0))/50)*50};
}
export class RacingGarage {
 constructor({storage=globalThis.localStorage}={}){
  this.economy=new GameEconomy(storage,RACING_KEY);const old=this.economy.read();
  const unlockedCars=[...new Set(['c_class',...(Array.isArray(old.unlockedCars)?old.unlockedCars.filter(id=>CARS.some(c=>c.id===id)):[])])];
  this.data=this.economy.bind({coins:whole(old.coins,500),stage:Math.max(1,whole(old.stage,1)),unlockedCars,selectedDriveMode:old.selectedDriveMode==='drive'?'drive':'race',selectedDriveScenario:['endless','hard','police'].includes(old.selectedDriveScenario)?old.selectedDriveScenario:'endless',completedDrives:whole(old.completedDrives),selectedCarId:unlockedCars.includes(old.selectedCarId)?old.selectedCarId:'c_class',selectedCategory:['all','luxury','supercar'].includes(old.selectedCategory)?old.selectedCategory:'all',selectedDifficulty:old.selectedDifficulty==='hell'?'hell':'easy',upgrades:Object.fromEntries(CARS.map(car=>[car.id,Object.fromEntries(['speed','handling','nitro'].map(k=>[k,clamp(whole(old.upgrades?.[car.id]?.[k],1),1,5)]))])),mediumPodiums:whole(old.easyPodiums,whole(old.mediumPodiums)),hardUnlocked:old.hardUnlocked===true||old.hardUnlocked===undefined&&(old.selectedDifficulty==='hell'||old.activeRace?.difficulty==='hell'),completedRaces:whole(old.completedRaces),wins:whole(old.wins),earnedCoins:whole(old.earnedCoins),seconds:whole(old.seconds),bestRank:clamp(whole(old.bestRank,7),1,7),receipts:Array.isArray(old.receipts)?old.receipts.filter(id=>typeof id==='string').slice(0,32):[],activeRace:RaceSimulation.restore(old.activeRace)?.serialize()||null});
 }
 get hardUnlocked(){return this.data.hardUnlocked||this.data.mediumPodiums>=3;}
 get car(){return effectiveCar(carById(this.data.selectedCarId),this.data.upgrades[this.data.selectedCarId]);}
 save(){this.economy.commit(this.data);}
 transaction(change){const before=clone(this.data),delta=this.economy.delta;try{const value=change();this.save();return value;}catch(error){this.data=this.economy.restore(before,delta);throw error;}}
 chooseCar(id){const car=CARS.find(c=>c.id===id);if(!car)throw Error('차량을 확인해 주세요.');return this.transaction(()=>{if(!this.data.unlockedCars.includes(id)){if(this.data.coins<car.price)throw Error(`레이싱 동전 ${(car.price-this.data.coins).toLocaleString()}개가 부족해요.`);this.data.coins-=car.price;this.data.unlockedCars.push(id);}this.data.selectedCarId=id;});}
 upgrade(key){if(!['speed','handling','nitro'].includes(key))throw Error('튜닝 항목을 확인해 주세요.');return this.transaction(()=>{const u=this.data.upgrades[this.data.selectedCarId],level=u[key];if(level>=5)throw Error('이미 최고 레벨이에요.');const price=UPGRADE_COSTS[level];if(this.data.coins<price)throw Error('레이싱 동전이 부족해요.');this.data.coins-=price;u[key]++;});}
 select(key,value){if(key==='selectedDifficulty'&&!DIFFICULTIES[value]||key==='selectedCategory'&&!['all','luxury','supercar'].includes(value)||key==='selectedDriveMode'&&!['drive','race'].includes(value)||!['selectedDifficulty','selectedCategory','selectedDriveMode','selectedDriveScenario'].includes(key))throw Error('선택을 확인해 주세요.');if(key==='selectedDriveScenario'&&!['endless','hard','police'].includes(value))throw Error('주행 모드를 확인해 주세요.');if(key==='selectedDifficulty'&&value==='hell'&&!this.hardUnlocked)throw Error('쉬움 레이싱에서3위 이내로3회 완주하면 어려움이 열려요.');this.transaction(()=>{this.data[key]=value;});}
 checkpoint(race){this.transaction(()=>{this.data.activeRace=race&&['countdown','racing'].includes(race.phase)?race.serialize():null;});}
 finish(result){
  if(!result||typeof result.id!=='string'||!DIFFICULTIES[result.difficulty]||!Number.isSafeInteger(result.stage)||result.stage<1||!Number.isInteger(result.rank)||result.rank<1||result.rank>7||!Number.isSafeInteger(result.trackCoins)||result.trackCoins<0||!Number.isFinite(result.seconds)||result.seconds<0)throw Error('레이스 결과를 확인해 주세요.');
  if(this.data.receipts.includes(result.id))return {awarded:false,total:0};
  if(this.data.activeRace?.id!==result.id)throw Error('진행 중인 레이스의 기록을 확인해 주세요.');
  if(result.difficulty!==this.data.activeRace.difficulty)throw Error('진행한 난이도를 확인해 주세요.');
  const driving=result.mode==='drive';if((this.data.activeRace.mode==='drive')!==driving)throw Error('주행 종류를 확인해 주세요.');
  const bonus=driving?0:Math.round(DIFFICULTIES[result.difficulty].reward*(1+(result.stage-1)*.15)*[0,1,.7,.5,.35,.25,.2,.15][result.rank]),total=result.trackCoins+bonus;
  return this.transaction(()=>{if(!Number.isSafeInteger(total)||!Number.isSafeInteger(this.data.coins+total))throw Error('동전 한도를 확인해 주세요.');this.data.coins+=total;this.data.earnedCoins+=total;if(driving)this.data.completedDrives++;else{this.data.completedRaces++;if(result.rank===1)this.data.wins++;if(result.difficulty==='easy'&&result.rank<=3){this.data.mediumPodiums++;if(this.data.mediumPodiums>=3)this.data.hardUnlocked=true;}this.data.bestRank=Math.min(this.data.bestRank,result.rank);if(result.rank<=3)this.data.stage=Math.max(this.data.stage,result.stage+1);}this.data.seconds+=Math.floor(result.seconds);this.data.receipts.unshift(result.id);this.data.receipts.length=Math.min(32,this.data.receipts.length);this.data.activeRace=null;return {awarded:true,total,bonus,qualified:!driving&&result.rank<=3,nextStage:this.data.stage};});
 }
}
export class RaceSimulation {
 constructor({car=CARS[0],difficulty='easy',stage=1,mode='race',scenario='endless',random=Math.random,id}={}){
  this.id=id||`race-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;this.car=car.nitroDrainRate?{...car}:effectiveCar(car);this.difficulty=DIFFICULTIES[difficulty]?difficulty:'easy';this.stage=Math.max(1,whole(stage,1));this.phase='countdown';this.countdown=2.25;this.elapsed=0;this.tick=0;this.distance=0;this.speed=0;this.x=-.72;this.tilt=0;this.jump=0;this.jumpVelocity=0;this.nitro=55;this.boosting=false;this.invulnerable=0;this.trackCoins=0;this.policeLeft=0;this.nextPolice=this.diff.police;this.traffic=[];this.coins=[];this.ramps=[];this.zones=[];this.police=[];this.events=[];this.accumulator=0;this.random=random;
  this.mode=mode==='drive'?'drive':'race';this.x=0;this.nitroActive=false;this.nitroHeld=false;
  this.scenario=['endless','hard','police'].includes(scenario)?scenario:'endless';this.scenerySeed=Math.floor(this.random()*1000000);this.hp=100;this.wanted=0;this.roadblocks=[];this.viewTop=0;this.viewBottom=720;this.collisions=0;this.boostLeft=0;this.driftLeft=0;this.driftCooldown=0;this.driftSign=1;
  this.rivals = this.mode === 'drive' ? [] : this.diff.ids.map((id, i) => {
   const lane = ROAD_LANES[i % ROAD_LANES.length];
   return { id, lane, target: lane, distance: 22 + Math.floor(i / ROAD_LANES.length) * 60,
    speed: this.diff.speeds[i] * (1 + (this.stage - 1) * .065), phase: i * 1.45 };
  });
 }
 get diff(){return DIFFICULTIES[this.difficulty];}
 get length(){return Math.round(this.diff.length*(1+(this.stage-1)*.1));}
 get rank(){return 1+this.rivals.filter(r=>r.distance>this.distance).length;}
 setViewport(height, playerBottom = 187) {
  if (!Number.isFinite(height) || !Number.isFinite(playerBottom)) return;
  this.viewBottom = PLAYER_Y + clamp(playerBottom, 100, 600);
  this.viewTop = this.viewBottom - clamp(height, 350, 2400);
 }
 curve(distance){
  if(this.difficulty==='easy')return 0;
  if(this.difficulty==='hard')return Math.sin(distance*.0013)*36+Math.sin(distance*.0032)*12;
  const t=((distance%2600)+2600)%2600,amp=90*Math.min(1.3,1+(this.stage-1)*.015),ease=x=>{const v=clamp(x,0,1);return v*v*(3-2*v);};
  return amp*(ease((t-700)/400)-2*ease((t-1400)/400)+ease((t-1900)/400));
 }
 roadAngle(lane,y){return Math.atan2(this.screenX(lane,y-12)-this.screenX(lane,y+12),24);}
 get driftAvailable(){return false;}
 requestDrift(){return false;}
 // Legacy entry point remains inert for old callers; road pads are the only boost source.
 requestNitro(){return false;}
 finishDrive(crashed=false){if(this.mode!=='drive'||this.phase==='finished')return false;this.phase='finished';this.boosting=false;this.nitroActive=false;this.result={id:this.id,mode:'drive',crashed,collisions:this.collisions,hp:this.hp,scenario:this.scenario,wanted:this.wanted,stage:this.stage,difficulty:this.difficulty,rank:1,seconds:this.elapsed,trackCoins:this.trackCoins};this.emit('finish');return true;}
 screenX(lane, y) {
  const roadDistance = this.distance + (PLAYER_Y - y) / ROAD_PIXELS_PER_UNIT;
  return 300 + this.curve(roadDistance) - this.curve(this.distance) + lane * ROAD_HALF_WIDTH;
 }
 vehiclePosition(role, vehicle = this, lane = role === 'player' ? this.x : vehicle.lane) {
  const isPlayer = role === 'player';
  let y = vehicle.y;
  let width = 32;
  let length = 60;
  let config;
  if (isPlayer) {
   y = PLAYER_Y;
   width = 36;
   length = 68;
   config = this.car;
  } else if (role === 'rival') {
   y = PLAYER_Y - (vehicle.distance - this.distance) * ROAD_PIXELS_PER_UNIT;
   width = 34;
   length = 64;
   config = carById(vehicle.id);
  } else if (role === 'police') {
   width = vehicle.kind === 'tank' ? 46 : 35;
   length = vehicle.kind === 'tank' ? 76 : 66;
   config = policeCar(vehicle.kind);
  } else {
   config = trafficCar(vehicle.color, vehicle.spriteIndex);
  }
  const angle = this.roadAngle(lane, y) + (isPlayer ? this.tilt : 0);
  const size = vehicleDimensions(config, width, length);
  // Include mirrors and the rotated body outline in the space occupied by the car.
  const halfWidth = size.width * .55;
  const halfLength = size.length * .52;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  return { role, vehicle, config, lane, x: this.screenX(lane, y), y, angle, width, length,
   halfWidth: halfWidth * cos + halfLength * sin, halfLength: halfLength * cos + halfWidth * sin };
 }
 groundVehicles() {
  return [
   ...this.rivals.map(car => this.vehiclePosition('rival', car)),
   ...this.traffic.map(car => this.vehiclePosition('traffic', car)),
   ...this.police.filter(car => car.kind !== 'helicopter').map(car => this.vehiclePosition('police', car))
  ];
 }
 advanceRivals() {
  const nearby = this.groundVehicles();
  for (const [i, rival] of this.rivals.entries()) {
   if ((this.tick + i * 29) % 105 === 0) {
    rival.target = ROAD_LANES[Math.floor(this.random() * ROAD_LANES.length)];
   }
   const nextLane = rival.lane + (rival.target - rival.lane) * .04;
   const position = this.vehiclePosition('rival', rival, nextLane);
   const laneIsClear = nearby.every(other =>
    other.vehicle === rival || !vehicleBoundsIntersect(position, other, 20));
   if (laneIsClear) rival.lane = nextLane;
   const entry = nearby.find(other => other.vehicle === rival);
   const current = this.vehiclePosition('rival', rival);
   const leader = nearby.some(other => other.vehicle !== rival && other.y < current.y
    && vehicleBoundsIntersect(current, other, 14));
   const speed = rival.speed + Math.sin(this.tick * .03 + rival.phase) * .65;
   rival.distance += speed * (leader ? .8 : 1) * WORLD_TRAVEL_SCALE;
   Object.assign(entry, this.vehiclePosition('rival', rival));
  }
 }
 spawnTraffic(y, start) {
  if (this.traffic.length >= 60) return;
  const vehicles = this.groundVehicles();
  const speed = this.diff.trafficMin + this.random() * (this.diff.trafficMax - this.diff.trafficMin);
  const colors = ['#64748b', '#0ea5e9', '#10b981', '#eab308', '#ec4899'];
  const color = colors[Math.floor(this.random() * colors.length)];
  const sprites = [0, 1, 2, 5, 6, 7, 9, 10, 11];
  const spriteIndex = sprites[Math.floor(this.random() * sprites.length)];
  for (let i = 0; i < ROAD_LANES.length; i++) {
   const car = { lane: ROAD_LANES[(start + i) % ROAD_LANES.length], y, speed, color, spriteIndex };
   const position = this.vehiclePosition('traffic', car);
   if (vehicles.every(other => !vehicleBoundsIntersect(position, other, 16))) {
    this.traffic.push(car);
    return;
   }
  }
 }
 setVehicleY(position, y) {
  if (position.role === 'rival') {
   position.vehicle.distance = this.distance + (PLAYER_Y - y) / ROAD_PIXELS_PER_UNIT;
  } else {
   position.vehicle.y = y;
  }
  return this.vehiclePosition(position.role, position.vehicle);
 }
 resolveVehicleSpacing(onContact) {
  const player = this.vehiclePosition('player');
  const grounded = this.jump < 12;
  const cars = this.groundVehicles().sort((a, b) => Math.abs(a.y - PLAYER_Y) - Math.abs(b.y - PLAYER_Y));
  const placed = grounded ? [player] : [];
  for (let position of cars) {
   const { role, vehicle } = position;
   if (grounded && vehicleBoundsIntersect(player, position)) {
    if (!vehicle.contact && !(role === 'traffic' && vehicle.hit) && onContact?.(position)) {
     vehicle.contact = true;
     if (role === 'traffic') vehicle.hit = true;
    }
   } else if (!vehicleBoundsIntersect(player, position, CONTACT_CLEARANCE)) {
    delete vehicle.contact;
   }
   // Pack cars from nearest outward, with the player as a fixed bumper when grounded.
   // The movement is monotonic away from the player, so each placed car can be cleared once.
   const direction = position.y <= PLAYER_Y ? -1 : 1;
   for (let pass = 0; pass <= placed.length; pass++) {
    const blocker = placed.find(other => vehicleBoundsIntersect(other, position, CLEARANCE));
    if (!blocker) break;
    const gap = position.halfLength + blocker.halfLength + CLEARANCE + 1;
    position = this.setVehicleY(position, blocker.y + direction * gap);
   }
   placed.push(position);
  }
 }

 emit(type,extra={}){this.events.push({type,...extra});}
 update(dt,input={}){if(!Number.isFinite(dt)||dt<=0||this.phase==='finished')return;this.accumulator+=Math.min(.25,dt);while(this.accumulator>=1/60){this.accumulator-=1/60;this.step(input);if(this.phase==='finished')break;}}
 step(input){
  if(this.phase==='countdown'){this.countdown-=1/60;if(this.countdown<=0){this.phase='racing';this.emit('go');}return;}
  if(this.phase!=='racing')return;this.tick++;this.elapsed+=1/60;const car=this.car,d=this.diff;if(this.mode==='drive'&&this.scenario==='police')this.wanted=Math.min(6,1+Math.floor(this.elapsed/20));
  if(this.boostLeft>0)this.boostLeft--;if(this.driftLeft>0)this.driftLeft--;if(this.driftCooldown>0)this.driftCooldown--;this.boosting=this.boostLeft>0;
  const top=car.scrollSpeed*(this.boosting?Math.max(1.3,car.nitroPower):1);
  if(input.accel||this.boosting)this.speed+=(top-this.speed)*(this.boosting?.055:.035);else this.speed=this.speed<.05?0:this.speed*.985;
  if(this.invulnerable>0){this.invulnerable--;if(this.invulnerable>60)this.speed=Math.min(this.speed,car.scrollSpeed*.52);}
  this.distance+=this.speed*WORLD_TRAVEL_SCALE;const ratio=this.speed/car.scrollSpeed,delta=(this.curve(this.distance+45)-this.curve(this.distance))/45;
  if(this.jump===0&&this.speed>4){this.x-=delta*ratio*.032;if(this.difficulty==='hell'&&Math.abs(delta)>.3)this.speed*=.99;}
  const steering=car.handling*.25*clamp(ratio,.35,1.15);
  if(input.left&&!input.right){this.x-=steering;this.tilt=Math.max(-.22,this.tilt-.035);}else if(input.right&&!input.left){this.x+=steering;this.tilt=Math.min(.22,this.tilt+.035);}else this.tilt*=.8;
  if(Math.abs(this.x)>MAX_STEERING_LANE){this.x=clamp(this.x,-MAX_STEERING_LANE,MAX_STEERING_LANE);this.speed*=.975;}
  if(this.jump>0||this.jumpVelocity>0){this.jump+=this.jumpVelocity;this.jumpVelocity-=.44;if(this.jump<=0){this.jump=0;this.jumpVelocity=0;this.emit('land');}}
  if (this.rivals.length) this.advanceRivals();
  const lane=()=>ROAD_LANES[Math.floor(this.random()*ROAD_LANES.length)],spawn=(array,e)=>{if(array.length<60)array.push(e);};
  if(this.speed>.6){
   if(this.tick%Math.max(36,Math.round(d.traffic*2*Math.max(.68,1-(this.stage-1)*.05)))===0)this.spawnTraffic(this.viewTop-100, Math.floor(this.random()*ROAD_LANES.length));
   if(this.tick%d.coin===0)spawn(this.coins,{lane:lane(),y:this.viewTop-40,value:this.difficulty==='hell'?35:this.difficulty==='hard'?22:12});
   if(this.tick%d.ramp===0)spawn(this.ramps,{lane:lane(),y:this.viewTop-80});if(this.tick%d.nitro===0)spawn(this.zones,{lane:lane(),y:this.viewTop-110});
  }
  const touching=(e,width,height)=>Math.abs(this.screenX(e.lane,e.y)-(300+this.x*220))<width&&Math.abs(e.y-533)<height;
  for(const z of this.zones){z.y+=this.speed*1.45*WORLD_TRAVEL_SCALE;if(!z.used&&!this.jump&&touching(z,58,48)){z.used=true;this.boostLeft=120+Math.round((car.nitroPadGain-1.3)*35);this.boosting=true;this.speed=Math.max(this.speed,car.scrollSpeed*.7);this.emit('boost');}}
  for(const r of this.ramps){r.y+=this.speed*1.45*WORLD_TRAVEL_SCALE;if(!r.used&&!this.jump&&this.speed>4&&touching(r,34,36)){r.used=true;this.jump=1;this.jumpVelocity=9.8;this.speed+=2.2;this.trackCoins+=15;this.emit('jump');}}
  const collide=(damage=25)=>{this.invulnerable=75;this.speed*=.65;this.collisions++;if(this.mode==='drive'){this.hp=Math.max(0,this.hp-(this.scenario==='hard'?Math.max(damage,40):damage));}this.emit('hit',{collisions:this.collisions,hp:this.hp});if(this.mode==='drive'&&this.hp<=0)this.finishDrive(true);};
  for (const car of this.traffic) car.y += (this.speed - car.speed) * ROAD_PIXELS_PER_UNIT * WORLD_TRAVEL_SCALE;
  this.coins=this.coins.filter(c=>{c.y+=this.speed*1.45*WORLD_TRAVEL_SCALE;if(touching(c,34,46)){this.trackCoins+=c.value;this.emit('coin');return false;}return c.y<840;});
  // Police pursue only in the dedicated endless-drive mode.
  if(this.mode==='drive'&&this.scenario==='police'){
   const count=this.wanted<2?1:this.wanted<3?2:4;
   const types=Array(count).fill('patrol');if(this.wanted>=5)types.push('armored','helicopter');if(this.wanted>=6)types.push('tank');
   while (this.police.length < types.length) {
    const i = this.police.length;
    this.police.push({ lane: ROAD_LANES[i % ROAD_LANES.length], y: this.viewBottom + 120 + i * 90, kind: types[i] });
   }
   this.police.forEach((car, i) => {
    car.kind = types[i];
    const spacing = i === 0 ? 43 : 50 + i * 16;
    const targetY = PLAYER_Y + spacing + Math.sin(this.tick * .017 + i * 1.9) * 25;
    car.y += clamp((targetY - car.y) * .018, -3.8, 2);
    // Chase from different directions instead of following the same center line.
    const offset = [0, -.46, .46, -.23, .23, .5, -.55][i];
    const chaseLane = clamp(this.x + offset, -MAX_STEERING_LANE, MAX_STEERING_LANE);
    car.lane += (chaseLane - car.lane) * .012;
    if (car.kind === 'helicopter' && this.jump < 14 && !this.invulnerable && touching(car, 30, 46)) collide(12);
   });
   if(this.wanted>=4&&this.tick%420===0&&this.roadblocks.length<8)this.roadblocks.push({lane:lane(),y:this.viewTop-100});
   for(const block of this.roadblocks){block.y+=this.speed*1.45*WORLD_TRAVEL_SCALE;if(!block.used&&this.jump<12&&!this.invulnerable&&touching(block,42,34)){block.used=true;collide(30);}}
   this.roadblocks=this.roadblocks.filter(b=>b.y<1100);
  }else this.police=[];
  this.resolveVehicleSpacing(({ role, vehicle }) => {
   if (this.phase !== 'racing' || this.invulnerable) return false;
   const kind = role === 'police' ? vehicle.kind : undefined;
   collide(kind === 'tank' ? 40 : kind === 'armored' ? 30 : kind === 'patrol' ? 20 : 25);
   return true;
  });
  for(const key of ['traffic','ramps','zones'])this[key]=this[key].filter(e=>e.y>Math.min(-280,this.viewTop-280)&&e.y<1100);
  if(this.phase==='racing'&&this.mode!=='drive'&&this.distance>=this.length){this.phase='finished';this.boosting=false;this.result={id:this.id,mode:'race',stage:this.stage,difficulty:this.difficulty,rank:this.rank,seconds:this.elapsed,trackCoins:this.trackCoins};this.emit('finish');}
 }
 serialize(){const {random,events,accumulator,viewTop,viewBottom,...state}=this;return clone({version:1,...state});}
 static restore(value){
  try{if(!value||value.version!==1||typeof value.id!=='string'||value.id.length>100||!['countdown','racing'].includes(value.phase)||!DIFFICULTIES[value.difficulty]||!Number.isSafeInteger(value.stage)||value.stage<1||value.stage>100000)return null;
   for(const k of ['countdown','elapsed','tick','distance','speed','x','tilt','jump','jumpVelocity','nitro','invulnerable','trackCoins','policeLeft','nextPolice'])if(!Number.isFinite(value[k])||Math.abs(value[k])>1e12)return null;
   if(value.elapsed<0)return null;
   if(!CARS.some(c=>c.id===value.car?.id)||!['scrollSpeed','handling','maxSpeed','nitroPower','nitroDrainRate','nitroPadGain'].every(k=>Number.isFinite(value.car[k])&&value.car[k]>0)||value.nitro<0||value.nitro>100||value.trackCoins<0)return null;
   for(const k of ['rivals','traffic','coins','ramps','zones','police']){if(!Array.isArray(value[k])||value[k].length>60)return null;for(const e of value[k]){if(!e||typeof e!=='object'||!Number.isFinite(e.lane)||Math.abs(e.lane)>2)return null;for(const [key,n]of Object.entries(e))if(typeof n==='number'&&(!Number.isFinite(n)||Math.abs(n)>1e12))return null;}}
   for(const k of ['boostLeft','driftLeft','driftCooldown'])if(value[k]!==undefined&&(!Number.isInteger(value[k])||value[k]<0||value[k]>600))return null;
   if(value.driftSign!==undefined&&![-1,1].includes(value.driftSign))return null;
   if(value.scenerySeed!==undefined&&(!Number.isInteger(value.scenerySeed)||value.scenerySeed<0||value.scenerySeed>=1000000))return null;
   if(value.wanted!==undefined&&(!Number.isInteger(value.wanted)||value.wanted<0||value.wanted>6))return null;
   if(value.hp!==undefined&&(!Number.isFinite(value.hp)||value.hp<0||value.hp>100))return null;
   if(value.scenario!==undefined&&!['endless','hard','police'].includes(value.scenario))return null;
   if(value.roadblocks!==undefined&&(!Array.isArray(value.roadblocks)||value.roadblocks.length>8||value.roadblocks.some(e=>!e||!Number.isFinite(e.lane)||Math.abs(e.lane)>2||!Number.isFinite(e.y))))return null;
   if(value.collisions!==undefined&&(!Number.isInteger(value.collisions)||value.collisions<0||value.collisions>100000))return null;
   if(value.mode!==undefined&&!['race','drive'].includes(value.mode)||value.nitroActive!==undefined&&typeof value.nitroActive!=='boolean'||value.nitroHeld!==undefined&&typeof value.nitroHeld!=='boolean')return null;
   if(value.rivals.length!==(value.mode==='drive'?0:6)||value.rivals.some(r=>!CARS.some(c=>c.id===r.id)||!['target','distance','speed','phase'].every(k=>Number.isFinite(r[k])))||value.police.length>7||value.traffic.some(e=>!Number.isFinite(e.y)||!Number.isFinite(e.speed))||[...value.coins,...value.ramps,...value.zones,...value.police].some(e=>!Number.isFinite(e.y))||value.coins.some(e=>!Number.isSafeInteger(e.value)||e.value<0))return null;
   const race=new RaceSimulation({car:effectiveCar(CARS[0]),difficulty:value.difficulty,stage:value.stage,id:value.id});const allowed=Object.keys(race.serialize());for(const key of allowed)if(Object.hasOwn(value,key))race[key]=clone(value[key]);for(const key of ['bodyColor','accentColor','stripeColor','bodyType'])race.car[key]=carById(race.car.id)[key];if(value.hp===undefined)race.hp=Math.max(1,100-(value.collisions||0)*25);if(value.scenario===undefined)race.scenario='endless';if(value.roadblocks===undefined)race.roadblocks=[];race.driftLeft=0;race.driftCooldown=0;race.nitroActive=false;race.nitroHeld=false;race.boosting=race.boostLeft>0;race.random=Math.random;race.events=[];race.accumulator=0;
   // Legacy checkpoints can contain cars already inside one another. Resolve
   // those positions before the first frame without charging a new collision.
   for (const car of [...race.rivals, ...race.traffic, ...race.police]) {
    car.lane = clamp(car.lane, -MAX_STEERING_LANE, MAX_STEERING_LANE);
   }
   race.x = clamp(race.x, -MAX_STEERING_LANE, MAX_STEERING_LANE);
   // Older police saves approached from the front. Move that patrol to the rear.
   if (race.mode === 'drive' && race.scenario === 'police') {
    race.police.forEach((car, i) => {
     if (car.y < PLAYER_Y) car.y = race.viewBottom + 120 + i * 90;
    });
   } else {
    race.police = [];
   }
   race.resolveVehicleSpacing();
   return race;
  }catch{return null;}
 }
}
