const CANCELLED=Symbol('closed leaderboard');
/** Public rows load immediately; score uploads never hold the visible board hostage. */
export class LiveLeaderboard {
 constructor({read,render,status=()=>{},sync=async()=>{},context=()=>'',visible=()=>true,intervalMs=5000,syncTimeoutMs=8000,readTimeoutMs=12000,setTimer=setInterval,clearTimer=clearInterval,setDeadline=setTimeout,clearDeadline=clearTimeout}={}){
  Object.assign(this,{read,render,status,sync,context,visible,intervalMs,syncTimeoutMs,readTimeoutMs,setTimer,clearTimer,setDeadline,clearDeadline});this.epoch=0;this.active=false;
 }
 limit(run,ms,message){
  let timer,cancel;const cancelled=new Promise(resolve=>{cancel=()=>{this.clearDeadline(timer);resolve(CANCELLED);};});
  const timeout=new Promise((_,reject)=>{timer=this.setDeadline(()=>reject(Error(message)),ms);});
  return {cancel,promise:Promise.race([Promise.resolve().then(run),timeout,cancelled]).finally(()=>this.clearDeadline(timer))};
 }
 open(game){this.close();this.active=true;this.game=game;this.timer=this.setTimer(()=>{if(this.visible())this.refresh();},this.intervalMs);this.timer?.unref?.();const first=this.refresh();this.synchronize();return first;}
 close(){this.active=false;this.epoch++;this.clearTimer(this.timer);this.timer=null;this.pending?.cancel();this.pending=null;this.syncOperation?.cancel();this.syncOperation=null;}
 refresh({sync=false}={}){
  if(sync){const first=this.refresh();return Promise.all([first,this.synchronize()]).then(([result])=>result);}
  if(!this.active)return Promise.resolve();const game=this.game,epoch=this.epoch,context=this.context(),current=()=>this.active&&this.epoch===epoch&&this.context()===context;
  if(this.pending?.epoch===epoch&&this.pending.context===context)return this.pending.task;
  const operation=this.limit(()=>this.read(game),this.readTimeoutMs,'순위 연결이 늦어지고 있어요. 새로고침을 눌러 다시 불러올 수 있어요.');
  this.status({loading:true,error:''});
  const task=(async()=>{
   try{const result=await operation.promise;if(result===CANCELLED||!current())return;if(!result||!Array.isArray(result.scores))throw Error('서버 순위를 읽지 못했어요. 다시 불러와 주세요.');this.render(result,game);this.status({loading:false,updatedAt:Date.now(),error:''});return result;}
   catch(error){if(current())this.status({loading:false,error:error.message||'순위를 불러오지 못했어요.'});}
  })().finally(()=>{if(this.pending?.task===task)this.pending=null;});
  this.pending={task,epoch,context,cancel:operation.cancel};return task;
 }
 synchronize(){
  if(!this.active)return Promise.resolve();const epoch=this.epoch,context=this.context(),current=()=>this.active&&this.epoch===epoch&&this.context()===context;
  if(this.syncOperation?.epoch===epoch&&this.syncOperation.context===context)return this.syncOperation.task;
  const operation=this.limit(()=>this.sync(),this.syncTimeoutMs,'점수 전송이 늦어지고 있어요. 기기 기록은 유지돼요.');
  this.status({syncing:true,warning:''});
  const task=(async()=>{try{const result=await operation.promise;if(result===CANCELLED||!current())return;this.status({syncing:false});await this.pending?.task;if(current())await this.refresh();}catch(error){if(current())this.status({syncing:false,warning:error.message||'점수 전송을 다시 시도해 주세요.'});}finally{if(this.syncOperation?.task===task)this.syncOperation=null;}})();
  this.syncOperation={epoch,context,task,cancel:operation.cancel};return task;
 }
}
