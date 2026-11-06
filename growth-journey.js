// Scene movement follows confirmed kills. Combat and saved wallets stay in the model.
export class ExpeditionJourney {
 constructor(){this.distance=0;this.target=0;this.speed=0;this.origins=new Map();}
 track(enemies){for(const enemy of enemies)if(!this.origins.has(enemy.id))this.origins.set(enemy.id,this.distance);}
 trim(enemies){const alive=new Set(enemies.map(enemy=>enemy.id));for(const id of this.origins.keys())if(!alive.has(id))this.origins.delete(id);}
 project(enemy){return Math.max(enemy.boss?330:213,enemy.x+(this.origins.get(enemy.id)??this.distance)-this.distance);}
 effect(event){
  if(!Number.isFinite(event.x))return {...event};
  const x=Number.isFinite(event.enemyId)?this.project({id:event.enemyId,x:event.x,boss:event.boss}):event.x;
  return {...event,worldX:x+this.distance};
 }
 advance(boss=false){this.target+=boss?160:96;}
 tick(seconds,phase,reduced=false){
  if(!Number.isFinite(seconds)||seconds<=0)return;
  if(!['waves','victory'].includes(phase)){this.speed=0;return;}
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
