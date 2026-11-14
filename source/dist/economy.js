// One atomic record contains the common wallet and the five game profiles.
// Legacy saves are left intact as backups; only this record is authoritative after migration.
export const ECONOMY_KEY='garden-economy-v1';
export const GAME_KEYS={suika:'suika-garden-profile-v3',apple:'garden-arcade-apple-v1',blocks:'garden-arcade-blocks-v1',quest:'garden-expedition-v1',orchard:'garden-orchard-v1'};
export const GEM_INTERVALS={suika:20,apple:20,blocks:16,quest:20,orchard:1};
export const GEM_REWARD=5;
const metric=(game,data)=>integer(game==='suika'?data.mergedFruits:['apple','blocks'].includes(game)?data.totalCleared??data.cleared:game==='quest'?data.stats?.kills:data.stats?.harvests);
const START_COINS={suika:20,apple:10,blocks:16,quest:60,orchard:35};
const integer=(value,fallback=0)=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):fallback;
const copy=value=>JSON.parse(JSON.stringify(value));
const add=(a,b)=>Math.min(Number.MAX_SAFE_INTEGER,a+b);
function parse(value,fallback={}){try{const data=JSON.parse(value);return data&&typeof data==='object'&&!Array.isArray(data)?data:fallback;}catch{return fallback;}}
function migrate(storage){
 const root={version:1,rewardRules:2,gems:0,revision:0,records:{},milestones:{}};
 for(const [game,key]of Object.entries(GAME_KEYS)){
  const old=parse(storage?.getItem?.(key));root.gems=add(root.gems,integer(old.gems));
  if(game==='suika'&&old.migrations?.removedToolsV9!==true){
   for(const [id,price]of Object.entries({magnet:10,swap:6,freeze:8}))root.gems=add(root.gems,Math.min(999,integer(old.inventory?.[id]))*price);
   old.migrations={...old.migrations,removedToolsV9:true};
  }
  if(['apple','blocks'].includes(game)&&Array.isArray(old.owned)&&old.owned.includes('dino')){
   root.gems=add(root.gems,60);old.owned=old.owned.filter(id=>id!=='dino');if(old.skin==='dino')old.skin='classic';
  }
  root.records[key]={...old,coins:integer(old.coins,START_COINS[game]),gems:0};
  root.milestones[game]=Math.floor(metric(game,old)/GEM_INTERVALS[game]);
 }
 return root;
}
export class GameEconomy {
 constructor(storage,key){
  if(!Object.values(GAME_KEYS).includes(key))throw Error('게임 지갑을 확인해 주세요.');
  this.raw=storage;this.key=key;this.delta=0;this.fallback=null;this.expectedRevision=undefined;
  this.storage={getItem:k=>k===key?JSON.stringify(this.read()):this.raw?.getItem?.(k)??null,setItem:(k,value)=>k===key?this.commit(parse(value)):this.raw?.setItem?.(k,value),removeItem:k=>{if(k===key)throw Error('게임 지갑은 삭제할 수 없어요.');return this.raw?.removeItem?.(k);}};
 }
 root(){
  let text;try{text=this.raw?.getItem?.(ECONOMY_KEY);this.unreadable=false;}catch{this.unreadable=true;this.migrationFailed=true;if(!this.fallback)this.fallback=migrate(null);return copy(this.fallback);}
  if(text!==null&&text!==undefined){const root=parse(text,null);if(!root||root.version!==1||!root.records||!Number.isSafeInteger(root.gems)||root.gems<0)throw Error('공용 지갑을 불러오지 못했어요. 기존 저장 데이터를 유지했어요.');
   if(root.rewardRules!==2){root.rewardRules=2;root.milestones=Object.fromEntries(Object.entries(GAME_KEYS).map(([game,key])=>[game,Math.floor(metric(game,root.records[key]||{})/GEM_INTERVALS[game])]));}return root;}
  if(!this.fallback||this.migrationFailed){try{this.fallback=migrate(this.raw);this.migrationFailed=false;}catch{this.unreadable=true;this.migrationFailed=true;this.fallback=migrate(null);}}return copy(this.fallback);
 }
 get gems(){return add(this.root().gems,this.delta);}
 read(){const root=this.root();if(this.unreadable)this.failedRead=true;if(this.expectedRevision===undefined)this.expectedRevision=integer(root.recordVersions?.[this.key]);return {...copy(root.records[this.key]||{}),gems:root.gems};}
 bind(data){
  Object.defineProperty(data,'gems',{enumerable:true,configurable:true,get:()=>this.gems,set:value=>{if(!Number.isSafeInteger(value)||value<0)throw Error('보석 개수를 확인해 주세요.');this.delta+=value-this.gems;}});
  return data;
 }
 restore(data,delta=0){this.delta=delta;return this.bind(data);}
 commit(data){
  if(!this.raw?.setItem)throw Error('이 브라우저에서는 저장을 사용할 수 없어요.');
  const root=this.root();if(this.failedRead)throw Error('기존 기록을 읽지 못했어요. 새로고침한 뒤 다시 시도해 주세요.');if(this.unreadable)throw Error('기존 지갑을 읽을 수 없어 저장하지 않았어요.');
  const recordRevision=integer(root.recordVersions?.[this.key]);if(this.expectedRevision!==undefined&&recordRevision!==this.expectedRevision)throw Error('다른 창에서 게임 기록이 바뀌었어요. 새로고침한 뒤 다시 시도해 주세요.');
  const game=Object.keys(GAME_KEYS).find(game=>GAME_KEYS[game]===this.key),before=integer(root.milestones?.[game]),milestone=Math.max(before,Math.floor(metric(game,data)/GEM_INTERVALS[game]));
  const gems=root.gems+this.delta+(milestone-before)*GEM_REWARD;
  if(!Number.isSafeInteger(gems)||gems<0)throw Error('공용 보석이 부족해요.');
  const next={...root,gems,recordVersions:{...root.recordVersions,[this.key]:recordRevision+1},milestones:{...root.milestones,[game]:milestone},revision:integer(root.revision)+1,records:{...root.records,[this.key]:{...data,gems:0}}};
  this.raw.setItem(ECONOMY_KEY,JSON.stringify(next));this.delta=0;this.fallback=null;this.expectedRevision=recordRevision+1;
  if(typeof globalThis.dispatchEvent==='function'&&typeof globalThis.CustomEvent==='function')globalThis.dispatchEvent(new CustomEvent('garden-wallet-change',{detail:{gems}}));
 }
}
