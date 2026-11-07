// Scene movement follows confirmed kills. Combat and saved wallets stay in the model.
export class ExpeditionJourney {
 constructor(){this.distance=0;this.target=0;this.speed=0;this.origins=new Map();this.enemies=new Map();}
 // A new encounter starts at the current scenery, without inheriting an old march.
 reset(){this.target=this.distance;this.speed=0;this.origins.clear();this.enemies.clear();}
 track(enemies){for(const enemy of enemies){if(!this.origins.has(enemy.id))this.origins.set(enemy.id,this.distance);this.enemies.set(enemy.id,enemy);}}
 trim(enemies){const alive=new Set(enemies.map(enemy=>enemy.id));for(const id of this.origins.keys())if(!alive.has(id)){this.origins.delete(id);this.enemies.delete(id);}}
 project(enemy){
  const front=enemy.boss?330:213,travel=Math.max(0,this.distance-(this.origins.get(enemy.id)??this.distance));
  // Compress the approach rather than parking a monster at the frontline before
  // its combat position arrives. It keeps walking until the encounter is in range.
  return front+Math.max(0,enemy.x-front)/(1+travel/180);
 }
 effect(event){
  if(!Number.isFinite(event.x))return {...event};
  const target=this.enemies.get(event.enemyId);
  const x=Number.isFinite(event.enemyId)?this.project({...event,id:event.enemyId,boss:target?.boss??event.boss}):event.x;
  return {...event,worldX:x+this.distance};
 }
 projectEffect(effect,reduced=false){
  if(reduced)return effect;
  const target=this.enemies.get(effect.enemyId);
  if(['hit','shot','tap'].includes(effect.type)&&target&&(target.hp===undefined||target.hp>0))return {...effect,x:this.project(target)};
  return Number.isFinite(effect.worldX)?{...effect,x:effect.worldX-this.distance}:effect;
 }
 advance(boss=false){this.target+=boss?160:96;}
 tick(seconds,phase,reduced=false){
  if(!Number.isFinite(seconds)||seconds<=0)return;
  if(!['waves','victory'].includes(phase)){this.target=this.distance;this.speed=0;return;}
  if(reduced){this.distance=this.target;this.speed=0;return;}
  const dt=Math.min(.1,seconds),remaining=Math.max(0,this.target-this.distance);
  const wanted=Math.min(132,remaining*5);
  this.speed+=(wanted-this.speed)*(1-Math.exp(-12*dt));
  this.distance+=Math.min(remaining,this.speed*dt);
  if(this.target-this.distance<.025&&this.speed<.3){this.distance=this.target;this.speed=0;}
 }
 get walk(){return Math.min(1,this.speed/35);}
 get lead(){return this.speed/132*14;}
}
