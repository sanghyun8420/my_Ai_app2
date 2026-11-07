import { GameEconomy } from './economy.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const whole=(n,fallback=0,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(Number(n))?Math.max(0,Math.min(max,Math.floor(Number(n)))):fallback;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const DIFFICULTIES=['쉬움','보통','어려움','매우 어려움','지옥'];
export const BOSS_NAMES=['곰팡이 수박왕','시큼 자몽대장','철껍질 파인','어둠씨앗 용과','포도 군주'];
export const HEROES=[{id:'moa',name:'모아',role:'사과 기사',color:'#d9786c'},{id:'poli',name:'포리',role:'배 마법사',color:'#c4ae67'},{id:'lumi',name:'루미',role:'이슬 궁수',color:'#7eb8b7'}];
export const GEAR=[
 {id:'fork',name:'가시 포크',rarity:0,slot:'weapon',attack:7,hp:0,regen:0,icon:'fork'},
 {id:'shell',name:'도토리 방패',rarity:0,slot:'charm',attack:0,hp:24,regen:0,icon:'shield'},
 {id:'honey',name:'꿀단지',rarity:0,slot:'charm',attack:0,hp:8,regen:.8,icon:'jar'},
 {id:'hammer',name:'당근 망치',rarity:1,slot:'weapon',attack:14,hp:0,regen:0,icon:'hammer'},
 {id:'dew',name:'이슬 목걸이',rarity:1,slot:'charm',attack:0,hp:58,regen:1,icon:'drop'},
 {id:'staff',name:'별씨 지팡이',rarity:2,slot:'weapon',attack:28,hp:10,regen:0,icon:'star'},
 {id:'leaf',name:'숲의 심장',rarity:2,slot:'charm',attack:7,hp:95,regen:1.5,icon:'leaf'},
 {id:'sun',name:'태양의 창',rarity:3,slot:'weapon',attack:52,hp:30,regen:1,icon:'sun'},
 {id:'moon',name:'달빛 호신부',rarity:3,slot:'charm',attack:14,hp:180,regen:3,icon:'moon'},
 {id:'sling',name:'씨앗 새총',rarity:0,slot:'weapon',attack:6,hp:6,regen:0,icon:'sling'},
 {id:'bell',name:'새싹 방울',rarity:0,slot:'charm',attack:0,hp:14,regen:.5,icon:'bell'},
 {id:'cap',name:'버섯 모자',rarity:0,slot:'charm',attack:0,hp:30,regen:0,icon:'cap'},
 {id:'bow',name:'완두콩 활',rarity:1,slot:'weapon',attack:12,hp:0,regen:.4,icon:'bow'},
 {id:'berry',name:'산딸기 반지',rarity:1,slot:'charm',attack:3,hp:32,regen:0,icon:'berry'},
 {id:'umbrella',name:'잎새 우산',rarity:1,slot:'charm',attack:0,hp:48,regen:1.2,icon:'umbrella'},
 {id:'frost',name:'서리 낫',rarity:2,slot:'weapon',attack:25,hp:30,regen:.25,icon:'frost'},
 {id:'lantern',name:'반딧불 랜턴',rarity:2,slot:'charm',attack:4,hp:65,regen:2.5,icon:'lantern'},
 {id:'orb',name:'비구름 수정',rarity:2,slot:'weapon',attack:22,hp:0,regen:2,icon:'orb'},
 {id:'comet',name:'혜성 대검',rarity:3,slot:'weapon',attack:58,hp:0,regen:0,icon:'comet'},
 {id:'crown',name:'정원 왕관',rarity:3,slot:'charm',attack:20,hp:110,regen:2,icon:'crown'},
 {id:'phoenix',name:'불사조 깃털',rarity:3,slot:'charm',attack:8,hp:135,regen:5,icon:'phoenix'},
];
export const RARITIES=['일반','희귀','영웅','전설'];
export const ROLL_ODDS=[60,28,10,2];
export const VARIETIES=[
 {id:'red',name:'홍옥',color:'#df6e64',duration:100,value:32,cost:0,currency:'coins',description:'빨갛게 익는 첫 사과'},
 {id:'green',name:'초록사과',color:'#a8bd67',duration:135,value:58,cost:120,currency:'coins',description:'아삭한 잎빛 사과'},
 {id:'gold',name:'황금사과',color:'#e3b65a',duration:185,value:105,cost:420,currency:'coins',description:'햇살을 닮은 달콤함'},
 {id:'rose',name:'장미사과',color:'#ca80a7',duration:210,value:145,cost:600,currency:'coins',description:'분홍빛 꽃향기가 은은해요'},
 {id:'star',name:'별빛사과',color:'#879fc9',duration:260,value:220,cost:1400,currency:'coins',description:'밤하늘 조각을 품은 사과'},
];

class Ledger {
 constructor(key,storage){this.key=key;let rawStorage;try{rawStorage=storage===undefined?globalThis.localStorage:storage;}catch{rawStorage=null;}this.economy=new GameEconomy(rawStorage,key);this.storage=this.economy.storage;}
 read(){try{const p=JSON.parse(this.storage?.getItem(this.key)||'{}');return p&&typeof p==='object'&&!Array.isArray(p)?p:{};}catch{return {};}}
 save(){if(!this.storage?.setItem)throw Error('저장 공간을 사용할 수 없어요.');this.storage.setItem(this.key,JSON.stringify(this.data));}
 transaction(fn){const before=copy(this.data),delta=this.economy.delta;try{const result=fn(this.data);this.save();return result;}catch(error){this.data=this.economy.restore(before,delta);throw error;}}
 random(){let n=this.data.rng>>>0;n=(Math.imul(n,1664525)+1013904223)>>>0;this.data.rng=n;return n/4294967296;}
}

export function stageName(index){return `${Math.floor(index/5)+1}-${index%5+1}`;}
export class FruitExpedition extends Ledger {
 constructor({storage,seed=Date.now()}={}){
  super('garden-expedition-v1',storage);const p=this.read();
  this.data={coins:whole(p.coins,60),gems:whole(p.gems),rng:whole(p.rng,seed>>>0,4294967295),tier:whole(p.tier,0,4),unlocked:whole(p.unlocked,0,4),progress:Array.from({length:5},(_,i)=>whole(p.progress?.[i],0,15)),upgrades:{attack:whole(p.upgrades?.attack,0,180),health:whole(p.upgrades?.health,0,180),recovery:whole(p.upgrades?.recovery,0,100)},gear:Object.fromEntries(GEAR.map(g=>[g.id,whole(p.gear?.[g.id],g.id==='fork'?1:0)])),equipped:Array.from({length:3},(_,i)=>({weapon:typeof p.equipped?.[i]?.weapon==='string'?p.equipped[i].weapon:p.equipped?.[i]?.weapon===null?null:i===0?'fork':null,charm:typeof p.equipped?.[i]?.charm==='string'?p.equipped[i].charm:null})),pity:whole(p.pity,0,29),pulls:whole(p.pulls),waveKills:whole(p.waveKills,0,10),stats:{kills:whole(p.stats?.kills),bosses:whole(p.stats?.bosses),seconds:whole(p.stats?.seconds)},claims:Array.isArray(p.claims)?p.claims.filter(x=>typeof x==='string').slice(0,40):[]};
  this.data=this.economy.bind(this.data);
  this.data.tier=Math.min(this.data.tier,this.data.unlocked);const used=new Set();for(const hero of this.data.equipped)for(const slot of ['weapon','charm']){const g=GEAR.find(x=>x.id===hero[slot]&&x.slot===slot);if(!g||!this.data.gear[g.id]||used.has(g.id))hero[slot]=null;else used.add(g.id);}
  this.phase='camp';this.enemies=[];this.events=[];this.time=0;this.clock=0;this.attackClock=0;this.spawnClock=0;this.secondClock=0;this.tapReady=0;this.hp=this.stats().maxHp;this.bossLeft=35;this.result=null;
 }
 get index(){return Math.min(14,this.data.progress[this.data.tier]);}
 get ready(){return this.data.waveKills>=10;}
 gearLevel(id){return this.data.gear[id]?1+Math.floor(Math.log2(this.data.gear[id])):0;}
 stats(){let attack=0,hp=0,regen=0;for(const hero of this.data.equipped)for(const id of Object.values(hero)){const g=GEAR.find(x=>x.id===id);if(g){const boost=1+(this.gearLevel(id)-1)*.22;attack+=g.attack*boost;hp+=g.hp*boost;regen+=g.regen*boost;}}const level=this.data.upgrades.attack;return {damage:(6+level*2.2)*(1+level*.025)+attack/3,maxHp:180+this.data.upgrades.health*38+hp,regen:1.2+this.data.upgrades.recovery*.8+regen};}
 cost(kind){const level=this.data.upgrades[kind];if(level===undefined)throw Error('강화 종류를 확인해 주세요.');return Math.ceil(({attack:18,health:16,recovery:24}[kind])*1.09**level);}
 upgrade(kind){if(this.data.upgrades[kind]>=(kind==='recovery'?100:180))throw Error('최고 단계예요.');const cost=this.cost(kind);const old=this.stats().maxHp;this.transaction(p=>{if(p.coins<cost)throw Error('처치 보상을 조금 더 모아주세요.');p.coins-=cost;p.upgrades[kind]++;});this.hp=Math.min(this.stats().maxHp,this.hp+this.stats().maxHp-old);return cost;}
 chooseTier(tier){if(!Number.isInteger(tier)||tier<0||tier>this.data.unlocked)throw Error('앞 난이도의 3-5 보스를 먼저 처치해 주세요.');this.transaction(p=>{p.tier=tier;p.waveKills=0;});this.phase='camp';this.enemies=[];this.hp=this.stats().maxHp;this.result=null;}
 start(){this.phase='waves';this.events=[];this.tapReady=this.clock;this.hp=this.stats().maxHp;this.enemies=[];this.result=null;this.spawnClock=1.6;this.attackClock=.4;}
 challenge(){if(!this.ready)throw Error('썩은 과일 10마리를 물리치면 보스를 부를 수 있어요.');this.phase='boss';this.hp=this.stats().maxHp;this.enemies=[this.makeEnemy(true)];this.bossLeft=35;this.attackClock=.4;this.result=null;this.events.push({type:'boss'});}
 makeEnemy(boss=false){const factor=[1,2.6,6.8,18,48][this.data.tier],index=this.index;const hp=Math.ceil((23+index*8)*factor*(boss?13:1));return {id:++this.time,boss,name:boss?BOSS_NAMES[index%5]:'썩은 과일',hp,maxHp:hp,x:boss?505:550,y:boss?263:237+((this.time*37)%110),kind:boss?index%5:(index+this.time)%5,hit:0,cooldown:boss?1.6:1.3,damage:(boss?8+index*1.5:2.5+index*.6)*Math.sqrt(factor),reward:Math.ceil((8+index*3)*factor*(boss?16:1))};}
 tap(){if(!['waves','boss'].includes(this.phase)||this.clock<this.tapReady)return false;const target=this.enemies.find(e=>e.hp>0);if(!target)return false;this.tapReady=this.clock+.6;this.hurtEnemy(target,this.stats().damage*.85);this.events.push({type:'tap',enemyId:target.id,boss:target.boss,x:target.x,y:target.y});this.collectDefeated();return true;}
 hurtEnemy(enemy,damage,hero=null){enemy.hp=Math.max(0,enemy.hp-damage);enemy.hit=.16;this.events.push({type:'hit',hero,enemyId:enemy.id,boss:enemy.boss,x:enemy.x,y:enemy.y,amount:Math.round(damage)});}
 finishBoss(enemy){const first=this.data.progress[this.data.tier]<15;const tier=this.data.tier,index=this.index;const gems=first?10+Math.floor(index/5)*3+tier*4:0;this.transaction(p=>{p.coins=Math.min(Number.MAX_SAFE_INTEGER,p.coins+enemy.reward);p.gems=Math.min(Number.MAX_SAFE_INTEGER,p.gems+gems);p.stats.bosses++;p.stats.kills++;p.waveKills=0;if(first){p.progress[tier]++;if(p.progress[tier]>=15&&tier<4)p.unlocked=Math.max(p.unlocked,tier+1);}});this.phase='victory';this.result={won:true,coins:enemy.reward,gems,tier,index,complete:this.data.progress[tier]>=15};this.events.push({type:'victory',enemyId:enemy.id,boss:true,x:enemy.x,y:enemy.y,...this.result});this.enemies=[];}
 collectDefeated(){
  const dead=this.enemies.filter(enemy=>enemy.hp<=0),regular=dead.filter(enemy=>!enemy.boss);
  if(regular.length){this.transaction(p=>{for(const enemy of regular){p.coins=Math.min(Number.MAX_SAFE_INTEGER,p.coins+enemy.reward);p.waveKills=Math.min(10,p.waveKills+1);p.stats.kills++;}});for(const enemy of regular)this.events.push({type:'coin',enemyId:enemy.id,kind:enemy.kind,x:enemy.x,y:enemy.y,amount:enemy.reward});}
  const boss=dead.find(enemy=>enemy.boss);if(boss){this.finishBoss(boss);return;}this.enemies=this.enemies.filter(enemy=>enemy.hp>0);
 }
 fail(reason){this.phase='defeat';this.result={won:false,reason};this.enemies=[];this.events.push({type:'defeat',reason});}
 tick(seconds){if(!Number.isFinite(seconds)||seconds<=0||!['waves','boss'].includes(this.phase))return [];const dt=Math.min(.25,seconds);this.events=[];this.collectDefeated();if(!['waves','boss'].includes(this.phase))return this.events;this.clock+=dt;this.secondClock+=dt;while(this.secondClock>=1){this.secondClock--;this.data.stats.seconds++;}const stats=this.stats();this.hp=Math.min(stats.maxHp,this.hp+stats.regen*dt);
  if(this.phase==='boss'){this.bossLeft=Math.max(0,this.bossLeft-dt);if(!this.bossLeft){this.fail('시간 초과');return this.events;}}
  else{this.spawnClock+=dt;if(this.spawnClock>=1.7&&this.enemies.length<6){this.spawnClock=0;this.enemies.push(this.makeEnemy());}}
  for(const enemy of this.enemies){if(enemy.hp<=0)continue;enemy.hit=Math.max(0,enemy.hit-dt);enemy.x=Math.max(enemy.boss?330:213,enemy.x-dt*(enemy.boss?48:23));enemy.cooldown-=dt;if(enemy.cooldown<=0&&(enemy.boss||enemy.x<=215)){enemy.cooldown=enemy.boss?1.35:1.7;this.hp-=enemy.damage;this.events.push({type:'hurt',enemyId:enemy.id,boss:enemy.boss,hero:0,x:enemy.x,y:enemy.y,amount:Math.round(enemy.damage)});if(this.hp<=0)break;}}
  if(this.hp<=0){this.fail('체력 부족');return this.events;}
  this.attackClock+=dt;if(this.attackClock>=.9){this.attackClock=0;for(let i=0;i<3;i++){const enemy=this.enemies.find(e=>e.hp>0);if(enemy){this.hurtEnemy(enemy,stats.damage*(i===1?.95:1),i);this.events.push({type:'shot',hero:i,enemyId:enemy.id,x:enemy.x,y:enemy.y});}}}
  this.collectDefeated();return this.events;
 }
 draw(count=1){if(![1,10].includes(count))throw Error('1회 또는 10회를 골라주세요.');return this.transaction(p=>{if(p.coins<count*60)throw Error('원정 동전이 부족해요. 썩은 과일을 물리쳐 모아주세요.');p.coins-=count*60;const results=[];for(let i=0;i<count;i++){const roll=this.random();let rarity=roll<.6?0:roll<.88?1:roll<.98?2:3;if(p.pity>=29)rarity=Math.max(2,rarity);const pool=GEAR.filter(g=>g.rarity===rarity),gear=pool[Math.floor(this.random()*pool.length)];p.gear[gear.id]++;p.pulls++;p.pity=rarity>=2?0:p.pity+1;results.push({id:gear.id,rarity,level:this.gearLevel(gear.id)});}return results;});}
 equip(heroIndex,id){if(!Number.isInteger(heroIndex)||heroIndex<0||heroIndex>=3)throw Error('동료를 먼저 선택해 주세요.');const gear=GEAR.find(g=>g.id===id);if(!gear||!this.data.gear[id])throw Error('아직 얻지 못한 도구예요.');this.transaction(p=>{for(const hero of p.equipped)if(hero[gear.slot]===id)hero[gear.slot]=null;p.equipped[heroIndex][gear.slot]=id;});this.hp=Math.min(this.hp,this.stats().maxHp);}
 claim(id){const goals={kills100:['kills',100,15],kills1000:['kills',1000,50],boss1:['bosses',1,15],boss10:['bosses',10,45],seconds600:['seconds',600,20]};const goal=goals[id];if(!goal)throw Error('목표를 확인해 주세요.');return this.transaction(p=>{if(p.claims.includes(id)||p.stats[goal[0]]<goal[1])return false;p.claims.push(id);p.gems+=goal[2];return true;});}
}

export class AppleOrchard extends Ledger {
 constructor({storage,now=()=>Date.now()}={}){
  super('garden-orchard-v1',storage);this.now=now;const p=this.read();const owned=['red',...(Array.isArray(p.owned)?p.owned.filter(id=>VARIETIES.some(v=>v.id===id)):[])];
  this.data={coins:whole(p.coins,35),gems:whole(p.gems),owned:[...new Set(owned)],variety:owned.includes(p.variety)?p.variety:'red',growth:clamp(Number(p.growth)||0,0,100),water:clamp(p.water===undefined?70:Number(p.water)||0,0,100),nutrition:clamp(p.nutrition===undefined?65:Number(p.nutrition)||0,0,100),care:Math.max(0,Number(p.care)||0),growing:Math.max(0,Number(p.growing)||0),sunUntil:whole(p.sunUntil),nextWater:whole(p.nextWater),nextFeed:whole(p.nextFeed),nextSun:whole(p.nextSun),nextPat:whole(p.nextPat),lastAt:whole(p.lastAt,now()),bug:!!p.bug,upgrades:{soil:whole(p.upgrades?.soil,0,30),can:whole(p.upgrades?.can,0,30),basket:whole(p.upgrades?.basket,0,30)},stats:{harvests:whole(p.stats?.harvests),apples:whole(p.stats?.apples),waterings:whole(p.stats?.waterings),bugs:whole(p.stats?.bugs),seconds:whole(p.stats?.seconds)},claims:Array.isArray(p.claims)?p.claims.filter(x=>typeof x==='string').slice(0,40):[]};
  this.data=this.economy.bind(this.data);this.bugClock=0;this.catchUp();
 }
 get variety(){return VARIETIES.find(v=>v.id===this.data.variety)||VARIETIES[0];}
 get stage(){return this.data.growth>=100?5:Math.min(4,Math.floor(this.data.growth/20));}
 get mood(){return this.data.growth>=100?'수확할 준비가 됐어요!':this.data.water<15?'목이 말라요':this.data.nutrition<15?'영양이 조금 부족해요':this.data.bug?'작은 벌레가 찾아왔어요':'기분 좋게 자라는 중';}
 advance(dt,active=false,at=this.now()){if(this.data.growth>=100)return;const p=this.data;const condition=p.water<=0?0:(.3+.5*Math.min(p.water/65,1)+.3*Math.min(p.nutrition/60,1))*(p.bug?.7:1);const sun=at<p.sunUntil?1.45:1;const gain=dt*100/this.variety.duration*condition*(1+p.upgrades.soil*.11)*sun;p.growth=Math.min(100,p.growth+gain);p.water=Math.max(0,p.water-dt*.18);p.nutrition=Math.max(0,p.nutrition-dt*.09);p.care+=condition*dt;p.growing+=dt;if(active)p.stats.seconds+=dt;}
 catchUp(){const now=this.now(),elapsed=clamp((now-this.data.lastAt)/1000,0,8*3600);for(let left=elapsed;left>0;left-=5){const dt=Math.min(5,left);this.advance(dt,false,this.data.lastAt+(elapsed-left+dt)*1000);}this.data.lastAt=now;return elapsed;}
 tick(dt){if(!Number.isFinite(dt)||dt<=0)return;this.advance(Math.min(.25,dt),true);this.data.lastAt=this.now();this.bugClock+=dt;if(this.bugClock>=34&&this.data.growth<100){this.bugClock=0;this.data.bug=true;}}
 water(){if(this.now()<this.data.nextWater)throw Error('물뿌리개를 채우는 중이에요.');this.transaction(p=>{p.water=Math.min(100,p.water+32+p.upgrades.can*3);p.nextWater=this.now()+3000;p.stats.waterings++;p.lastAt=this.now();});}
 feed(){if(this.now()<this.data.nextFeed)throw Error('영양을 흡수하는 중이에요.');this.transaction(p=>{if(p.coins<5)throw Error('영양제는 동전 5개예요. 벌레를 잡거나 수확해 모아주세요.');p.coins-=5;p.nutrition=Math.min(100,p.nutrition+40);p.nextFeed=this.now()+8000;p.lastAt=this.now();});}
 sunlight(){if(this.now()<this.data.nextSun)throw Error('잠깐 그늘에서 쉬고 있어요.');this.transaction(p=>{p.sunUntil=this.now()+22000;p.nextSun=this.now()+35000;p.lastAt=this.now();});}
 touch(){if(this.data.growth>=100)return this.harvest();if(this.now()<this.data.nextPat)return null;return this.transaction(p=>{p.nextPat=this.now()+1800;p.lastAt=this.now();if(p.bug){p.bug=false;p.stats.bugs++;p.coins+=4;p.growth=Math.min(100,p.growth+3);return {bug:true,coins:4};}p.growth=Math.min(100,p.growth+.35);return {pat:true};});}
 harvest(){if(this.data.growth<100)throw Error('사과가 더 익을 때까지 기다려 주세요.');return this.transaction(p=>{const quality=clamp(p.care/Math.max(1,p.growing),.35,1.1),stars=quality>.95?3:quality>.7?2:1,apples=3+stars+Math.floor(p.upgrades.basket/3),coins=Math.round(this.variety.value*(.7+quality*.5)*(1+p.upgrades.basket*.13));p.coins=Math.min(Number.MAX_SAFE_INTEGER,p.coins+coins);p.stats.harvests++;p.stats.apples+=apples;p.growth=0;p.care=0;p.growing=0;p.bug=false;p.water=Math.max(p.water,40);p.nutrition=Math.max(p.nutrition,35);p.lastAt=this.now();return {coins,gems:0,apples,stars};});}
 upgrade(kind){if(!['soil','can','basket'].includes(kind))throw Error('정원 도구를 골라주세요.');const price=this.cost(kind);this.transaction(p=>{if(p.upgrades[kind]>=30)throw Error('정원 도구가 최고 단계예요.');if(p.coins<price)throw Error('수확 동전을 조금 더 모아주세요.');p.coins-=price;p.upgrades[kind]++;p.lastAt=this.now();});}
 cost(kind){return Math.ceil(35*1.4**this.data.upgrades[kind]);}
 buyVariety(id){const variety=VARIETIES.find(v=>v.id===id);if(!variety)throw Error('품종을 확인해 주세요.');this.transaction(p=>{if(!p.owned.includes(id)){if(p[variety.currency]<variety.cost)throw Error(`${variety.currency==='gems'?'정원 보석':'수확 동전'}이 부족해요.`);p[variety.currency]-=variety.cost;p.owned.push(id);}p.lastAt=this.now();});}
 plant(id){if(!this.data.owned.includes(id))throw Error('먼저 씨앗을 구해 주세요.');this.transaction(p=>{p.variety=id;p.growth=0;p.water=Math.max(p.water,60);p.nutrition=Math.max(p.nutrition,45);p.care=0;p.growing=0;p.bug=false;p.lastAt=this.now();});}
 claim(id){const goals={harvest1:['harvests',1,5],harvest10:['harvests',10,15],harvest50:['harvests',50,40],water20:['waterings',20,10],bugs10:['bugs',10,10]};const goal=goals[id];if(!goal)throw Error('목표를 확인해 주세요.');return this.transaction(p=>{if(p.claims.includes(id)||p.stats[goal[0]]<goal[1])return false;p.claims.push(id);p.gems+=goal[2];p.lastAt=this.now();return true;});}
}
