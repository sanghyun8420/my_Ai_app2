/** One visible board, live polling, and stale-response protection across games/accounts. */
export class LiveLeaderboard {
 constructor({read,render,status=()=>{},sync=async()=>{},context=()=>'',visible=()=>true,intervalMs=5000,setTimer=setInterval,clearTimer=clearInterval}={}){
  Object.assign(this,{read,render,status,sync,context,visible,intervalMs,setTimer,clearTimer});this.epoch=0;this.active=false;
 }
 open(game){this.close();this.active=true;this.game=game;this.timer=this.setTimer(()=>{if(this.visible())this.refresh();},this.intervalMs);this.timer?.unref?.();return this.refresh({sync:true});}
 close(){this.active=false;this.epoch++;this.clearTimer(this.timer);this.timer=null;this.pending=null;}
 refresh({sync=false}={}){
  if(!this.active)return Promise.resolve();const game=this.game,epoch=this.epoch,context=this.context(),current=()=>this.active&&this.epoch===epoch&&this.context()===context;
  if(this.pending?.epoch===epoch&&this.pending.context===context)return this.pending.task;
  const task=(async()=>{
   this.status({loading:true,sync});let warning='';
   if(sync){try{await this.sync();}catch(error){warning=error.message||'기기 기록을 서버로 보내지 못했어요.';}}
   if(!current())return;
   try{const result=await this.read(game);if(!current())return;this.render(result,game);this.status({updatedAt:Date.now(),warning});return result;}
   catch(error){if(current())this.status({error:error.message||'순위를 불러오지 못했어요.'});}
  })().finally(()=>{if(this.pending?.task===task)this.pending=null;});
  this.pending={task,epoch,context};return task;
 }
}
