import {ECONOMY_KEY,GAME_KEYS} from './economy.js';
import {normalizeGameRecord} from './save-state.js';

export const PLAYER_KEY='garden-player-v1',CLOUD_META='garden-cloud-meta-v1',PENDING_RESTORE='garden-cloud-pending-v1';
export const DEVICE_KEYS=[ECONOMY_KEY,'suika-garden-run-v1','suika-garden-preferences-v1','suika-garden-best','suika-garden-secret','garden-buddy-comments',...Object.values(GAME_KEYS)];
const BACKUP_KEY='garden-device-backup-v1';
const parse=(text,fallback=null)=>{try{return JSON.parse(text)||fallback;}catch{return fallback;}};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
function safeJson(value,depth=0){if(depth>32)throw Error('저장 기록이 너무 복잡해요.');if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('올바르지 않은 저장 기록이에요.');safeJson(item,depth+1);}}
export function validateDevice(snapshot){
 if(!object(snapshot)||snapshot.version!==1||!object(snapshot.values)||Object.keys(snapshot.values).some(key=>!DEVICE_KEYS.includes(key)))throw Error('저장 기록을 읽지 못했어요.');
 const values={};for(const key of DEVICE_KEYS){const value=snapshot.values[key]??null;if(value!==null&&typeof value!=='string')throw Error('올바르지 않은 저장 기록이에요.');values[key]=value;}
 const root=parse(values[ECONOMY_KEY]);safeJson(root);
 if(!object(root)||root.version!==1||!Number.isSafeInteger(root.gems)||root.gems<0||!object(root.records))throw Error('게임 지갑 정보가 올바르지 않아요.');
 for(const key of Object.values(GAME_KEYS)){const record=root.records[key];if(!object(record)||!Number.isSafeInteger(record.coins)||record.coins<0)throw Error('게임별 기록을 읽지 못했어요.');}
 if(values['suika-garden-run-v1'])normalizeGameRecord(parse(values['suika-garden-run-v1']));
 if(values['suika-garden-preferences-v1']){const prefs=parse(values['suika-garden-preferences-v1']);if(!object(prefs))throw Error('설정 정보를 읽지 못했어요.');safeJson(prefs);}
 if(new TextEncoder().encode(JSON.stringify(values)).length>460000)throw Error('기록이 너무 커서 서버에 저장하지 못했어요. 기기 기록은 유지돼요.');
 return {version:1,values};
}
export function captureDevice(storage=globalThis.localStorage){return validateDevice({version:1,values:Object.fromEntries(DEVICE_KEYS.map(key=>[key,storage.getItem(key)]))});}
export function restoreDevice(snapshot,storage=globalThis.localStorage){
 const next=validateDevice(snapshot),previous=Object.fromEntries(DEVICE_KEYS.map(key=>[key,storage.getItem(key)]));
 // A durable local backup must succeed before replacing any progress.
 storage.setItem(BACKUP_KEY,JSON.stringify({at:Date.now(),values:previous}));
 const write=values=>{for(const key of DEVICE_KEYS){const value=values[key];if(value===null||value===undefined)storage.removeItem(key);else storage.setItem(key,value);}};
 try{write(next.values);}catch(error){try{for(const key of DEVICE_KEYS)storage.removeItem(key);write(previous);}catch{}throw error;}
 return next;
}
export function applyPendingRestore(storage){
 try{storage??=globalThis.localStorage;const pending=parse(storage.getItem(PENDING_RESTORE));if(!pending)return null;restoreDevice(pending.snapshot,storage);storage.setItem(CLOUD_META,JSON.stringify(pending.meta));storage.removeItem(PENDING_RESTORE);return {restored:true,notice:pending.meta?.notice};}
 catch(error){return {restored:false,error};}
}
function snapshotHash(snapshot){
 const values={...snapshot.values},root=parse(values[ECONOMY_KEY]);if(root){delete root.revision;delete root.recordVersions;values[ECONOMY_KEY]=JSON.stringify(root);}
 const board=parse(values['suika-garden-run-v1']);if(board){delete board.savedAt;values['suika-garden-run-v1']=JSON.stringify(board);}
 let h=2166136261;for(const c of JSON.stringify(values))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);
}
export function localScores(storage=globalThis.localStorage){const root=parse(storage.getItem(ECONOMY_KEY)),records=root?.records||{};return Object.fromEntries(['suika','apple','blocks'].map(game=>{const raw=records[GAME_KEYS[game]]||parse(storage.getItem(GAME_KEYS[game]),{}),score=game==='suika'?Math.max(raw.bestScore||0,Number(storage.getItem('suika-garden-best'))||0):raw.best||0;return [game,Math.max(0,Math.min(100000000,Math.floor(score)))];}));}
function newKey(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}

/** Automatic private server saves; accounts and recoverable guest identities share one backend. */
export class PlayerCloud {
 constructor({social,storage,document:doc=globalThis.document,openDialog,beforeCapture=()=>{},reload=()=>globalThis.location.reload(),onError=()=>{},autoGuest=true,autoRestore=true,intervalMs=5000,clock=()=>Date.now()}={}){
  this.social=social;try{this.storage=storage??globalThis.localStorage;}catch{this.storage=null;}this.document=doc;this.openDialog=openDialog;this.beforeCapture=beforeCapture;this.reload=reload;this.onError=onError;this.autoGuest=autoGuest;this.autoRestore=autoRestore;this.intervalMs=intervalMs;this.clock=clock;this.capturing=false;this.needsLogin=false;this.lastRemoteCheck=0;
  this.ready=false;this.busy=false;this.conflict=false;this.connected=false;this.restoring=false;this.version=0;this.userId=null;this.lastHash='';this.lastScores='';this.epoch=0;this.timer=null;
  this.build();this.userListener=e=>{if(!this.ready||this.busy)return;if(!e.detail){this.userId=null;this.connected=false;this.status('기기 기록을 보존했어요. 서버 연결을 확인하고 있어요.');return;}if(this.social._authBusy)return;if(e.detail.id!==this.userId)this.connect().catch(error=>this.status(error.message));else this.render();};
  globalThis.addEventListener?.('garden-user',this.userListener);
  this.visibilityListener=()=>{if(this.document?.hidden)this.flush(true);else this.synchronize();};
  this.focusListener=()=>this.synchronize();this.walletListener=()=>{if(!this.capturing)this.scheduleSave();};this.pagehideListener=()=>this.flush(true);
  this.document?.addEventListener('visibilitychange',this.visibilityListener);
  for(const event of ['focus','online'])globalThis.addEventListener?.(event,this.focusListener);
  globalThis.addEventListener?.('garden-wallet-change',this.walletListener);globalThis.addEventListener?.('pagehide',this.pagehideListener);

 }
 $(id){return this.document?.getElementById(id);}
 build(){
  if(!this.document)return;
  const dialog=this.document.createElement('dialog');dialog.id='player-dialog';dialog.className='player-dialog';dialog.setAttribute('aria-labelledby','player-title');
  dialog.innerHTML=`<button class="dialog-close" type="button" aria-label="닫고 기기에서 플레이">×</button><p class="eyebrow">SUIKA GARDEN</p><h2 id="player-title">어떤 이름으로 놀까요?</h2><p class="player-intro">플레이 기록은 서버에 자동으로 저장돼요.<br>다른 기기에서는 같은 계정으로 로그인하면 자동으로 이어가요.</p><form id="player-name-form"><label for="player-name">닉네임</label><div class="player-input-row"><input id="player-name" maxlength="16" autocomplete="nickname" placeholder="1~16자" required><button id="player-submit" class="start-button" type="submit">이 이름으로 시작</button></div></form><p id="player-status" role="status" aria-live="polite"></p><div id="player-save-actions" hidden><button id="player-save" class="secondary-button" type="button">저장 다시 시도</button><button id="player-load" class="secondary-button" type="button">최신 기록 불러오기</button></div><details class="player-recovery"><summary>다른 주소·기기에서 이어하기</summary><p>회원 계정은 로그인만 하면 최신 기록을 불러와요. 게스트 기록을 다른 기기로 옮길 때는 아래 복구 코드를 한 번 입력해 주세요.</p><div id="player-code-row" hidden><small>내 복구 코드 · 이 코드를 아는 사람은 기록을 불러올 수 있어요.</small><code id="player-code"></code><button id="player-copy" class="secondary-button" type="button">복구 코드 복사</button></div><form id="player-restore-form"><label for="player-recovery-code">기존 복구 코드</label><div class="player-input-row"><input id="player-recovery-code" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80" placeholder="기존 기기에서 복사한 코드"><button class="secondary-button" type="submit">이어하기</button></div></form></details><div class="player-footer"><button id="player-practice" class="text-link" type="button">이름 없이 연습하기</button><button id="player-account" class="text-link" type="button">기존 계정 로그인</button></div>`;
  this.document.body.append(dialog);this.dialog=dialog;
  const syncing=this.document.createElement('dialog');syncing.id='sync-dialog';syncing.className='sync-dialog';syncing.setAttribute('aria-labelledby','sync-title');syncing.innerHTML='<p class="eyebrow">SUIKA GARDEN</p><h2 id="sync-title">내 정원을 이어가는 중</h2><p role="status">최신 서버 기록을 불러오고 있어요.</p>';syncing.addEventListener('cancel',event=>event.preventDefault());this.document.body.append(syncing);this.syncDialog=syncing;syncing.addEventListener('close',()=>globalThis.dispatchEvent?.(new CustomEvent('garden-player-close')));
  dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>globalThis.dispatchEvent?.(new CustomEvent('garden-player-close')));
  this.$('player-name-form').onsubmit=e=>{e.preventDefault();this.action(()=>this.join(this.$('player-name').value));};
  this.$('player-restore-form').onsubmit=e=>{e.preventDefault();this.action(()=>this.recover(this.$('player-recovery-code').value));};
  this.$('player-save').onclick=()=>this.action(()=>this.save({force:this.conflict}));this.$('player-load').onclick=()=>this.action(()=>this.load());
  this.$('player-copy').onclick=()=>this.action(async()=>{const identity=this.identity();await globalThis.navigator.clipboard.writeText(identity.key);this.status('복구 코드를 복사했어요. 다른 주소·기기의 이어하기 칸에 붙여 넣어 주세요.');});
  this.$('player-practice').onclick=()=>dialog.close();this.$('player-account').onclick=()=>{dialog.close();this.social.openAccount('login');};
 }
 async capture(){this.capturing=true;try{await this.beforeCapture();return captureDevice(this.storage);}finally{this.capturing=false;}}
 meta(){return parse(this.storage?.getItem(CLOUD_META));}
 writeMeta(hash,pending){this.storage?.setItem(CLOUD_META,JSON.stringify({userId:this.social.user?.id,kind:this.social.user?.isGuest?'guest':'account',version:this.version,hash,...(pending?{pending}:{})}));}
 resetForGuest(){this.epoch++;this.userId=null;this.connected=false;this.conflict=false;this.needsLogin=false;this.storage?.removeItem(PLAYER_KEY);this.storage?.removeItem(CLOUD_META);}
 async ensurePlayer(){
  if(this.social.user||!this.autoGuest||this.needsLogin)return;
  let identity=this.identity();const meta=this.meta();
  if(!identity?.key&&meta?.userId&&meta.kind!=='guest'){this.needsLogin=true;this.status('이전 계정에 로그인하면 최신 서버 기록으로 이어져요. 기기 기록은 보존했어요.');return;}
  if(!identity?.key){const key=newKey();identity={key,userId:null,pending:true,displayName:'정원사 '+crypto.getRandomValues(new Uint16Array(1))[0]};this.storage.setItem(PLAYER_KEY,JSON.stringify(identity));}
  let response;try{response=await this.social._request('/api/guest',{method:'POST',body:{key:identity.key,...(!identity.userId||identity.pending?{displayName:identity.displayName||'정원사'}:{})}});}catch(error){if(error.code==='RECOVERY_NOT_FOUND'&&identity.userId)this.needsLogin=true;throw error;}
  this.storage.setItem(PLAYER_KEY,JSON.stringify({key:identity.key,userId:response.user.id}));this.social._acceptUser(response);return response.user;
 }
 flush(keepalive=false){if(this.ready&&!this.busy&&!this.social._authBusy&&!this.restoring&&this.social.user)this.action(()=>this.save({quiet:true,keepalive}));}
 scheduleSave(){clearTimeout(this.saveTimer);if(this.ready&&!this.restoring)this.saveTimer=setTimeout(()=>this.flush(),1800);this.saveTimer?.unref?.();}
 async synchronize(){
  if(!this.ready||this.busy||this.social._authBusy||this.restoring||this.syncTask)return;
  this.syncTask=this.action(async()=>{if(!this.social.user)await this.ensurePlayer();if(!this.social.user)return;if(!this.connected)await this.connect();else{const remote=await this.social._request('/api/cloud-save');this.lastRemoteCheck=this.clock();if(remote.version!==this.version)await this.adoptRemote(remote);if(!this.restoring&&!this.conflict)await this.save({quiet:true});}}).finally(()=>{this.syncTask=null;});return this.syncTask;
 }
 async adoptRemote(remote,{restore=false}={}){
  const meta=this.meta(),snapshot=await this.capture(),hash=snapshotHash(snapshot);this.version=remote.version;this.connected=true;this.conflict=false;
  if(!remote.snapshot){this.lastHash='';return;}
  let remoteHash;try{remoteHash=snapshotHash(validateDevice(remote.snapshot));}catch(error){this.conflict=true;throw error;}
  const ownPending=meta?.userId===this.social.user.id&&meta.pending?.version+1===remote.version&&meta.pending.hash===remoteHash;
  if(!restore&&(remoteHash===hash||ownPending)){this.lastHash=remoteHash;this.writeMeta(remoteHash);return;}
  if(restore||!meta||meta.userId!==this.social.user.id||meta.version!==remote.version){
   if(this.autoRestore||restore){try{await this.load(remote,{notice:'최신 서버 기록으로 이어가요.'});}catch(error){this.conflict=true;throw error;}return;}
   this.conflict=true;this.status('다른 기기의 서버 기록이 있어요. 최신 기록 불러오기를 선택해 주세요.');this.open();return;
  }
  this.lastHash=meta.hash||'';
 }
 identity(){try{return parse(this.storage?.getItem(PLAYER_KEY));}catch{return null;}}
 status(message){this.message=message;for(const id of ['player-status','server-save-status'])if(this.$(id))this.$(id).textContent=message;}
 render(){const user=this.social.user,identity=this.identity();if(this.$('player-title'))this.$('player-title').textContent=user?'내 이름과 자동 저장':'내 기록과 이름';if(this.$('player-name'))this.$('player-name').value=user?.displayName||this.$('player-name').value||'';if(this.$('player-submit'))this.$('player-submit').textContent=user?'이름 바꾸기':'이 이름으로 시작';if(this.$('player-save-actions'))this.$('player-save-actions').hidden=!user;const ownCode=user?.isGuest&&identity?.userId===user.id&&identity.key;if(this.$('player-code-row'))this.$('player-code-row').hidden=!ownCode;if(this.$('player-code'))this.$('player-code').textContent=ownCode||'';}
 open(){this.render();if(this.openDialog)this.openDialog('player-dialog');else if(this.dialog&&!this.dialog.open)this.dialog.showModal();this.$('player-name')?.focus();}
 expired(error){if(error.status!==401)return;const account=this.social.user&&!this.social.user.isGuest;this.connected=false;this.userId=null;if(account)this.needsLogin=true;this.social.user=null;this.social._renderAccount?.();this.social.onUser?.(null);}
 async action(fn){if(this.busy)return;this.busy=true;if(this.$('player-submit'))this.$('player-submit').disabled=true;try{await fn();}catch(error){this.expired(error);this.status(error.message||'연결이 어려워요. 기기 기록은 그대로예요.');this.onError(error);}finally{this.busy=false;if(this.$('player-submit'))this.$('player-submit').disabled=false;this.render();}}
 async init(){
  this.status('서버에 연결하고 있어요. 기기 기록도 유지돼요.');
  try{if(!this.social.user){const identity=this.identity();if(identity?.key&&!this.autoGuest){const response=await this.social._request('/api/guest',{method:'POST',body:{key:identity.key}});this.social._acceptUser(response);}else await this.ensurePlayer();}this.ready=true;if(this.social.user)await this.connect();}
  catch(error){this.expired(error);this.ready=true;this.status(error.message);}
  if(this.social.user&&!this.conflict&&!this.restoring)await this.social._handlePendingLinks?.();
  this.timer=setInterval(()=>{if(this.document?.hidden)return;if(this.clock()-this.lastRemoteCheck>=15000||!this.social.user||!this.connected)this.synchronize();else this.flush();},this.intervalMs);this.timer.unref?.();return this;
 }
 async join(name){
  this.needsLogin=false;name=String(name).normalize('NFKC').trim();if(!name||[...name].length>16)throw Error('닉네임은 1~16자로 적어 주세요.');
  if(this.social.user){const data=await this.social._request('/api/player/name',{method:'POST',body:{displayName:name}});this.social._acceptUser(data);this.status('이름을 바꿨어요. 순위에도 같은 이름이 표시돼요.');this.dialog?.close();return;}
  const old=this.identity(),key=old?.key||newKey();this.storage.setItem(PLAYER_KEY,JSON.stringify({key,userId:null}));
  const data=await this.social._request('/api/guest',{method:'POST',body:{key,displayName:name}});this.storage.setItem(PLAYER_KEY,JSON.stringify({key,userId:data.user.id}));this.social._acceptUser(data);await this.connect();if(!this.conflict){this.dialog?.close();await this.social._handlePendingLinks?.();}
 }
 async recover(code){
  code=String(code).replace(/\s/g,'');if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error('기존 복구 코드를 빠짐없이 복사해 넣어 주세요.');
  await this.beforeCapture();const local=captureDevice(this.storage);this.storage.setItem(BACKUP_KEY,JSON.stringify({at:Date.now(),values:local.values}));
  const data=await this.social._request('/api/guest',{method:'POST',body:{key:code}});this.storage.setItem(PLAYER_KEY,JSON.stringify({key:code,userId:data.user.id}));this.social._acceptUser(data);await this.connect({restore:true});
 }
 async connect(options={}){
  if(this.connectTask)return this.connectTask;
  this.connectTask=this._connect(options).finally(()=>{this.connectTask=null;});return this.connectTask;
 }
 async _connect({restore=false}={}){
  if(!this.social.user)return;const userId=this.social.user.id,epoch=++this.epoch;this.userId=userId;this.connected=false;this.lastScores='';
  const remote=await this.social._request('/api/cloud-save');if(epoch!==this.epoch||this.social.user?.id!==userId)return;this.lastRemoteCheck=this.clock();
  await this.adoptRemote(remote,{restore});if(this.restoring||this.conflict)return;
  await this.submitScores();await this.save({quiet:true});this.render();
 }
 async submitScores(){if(!this.social.user)return;const scores=localScores(this.storage),encoded=JSON.stringify(scores);if(encoded===this.lastScores)return;await this.social._request('/api/profile/import',{method:'POST',body:{scores}});this.lastScores=encoded;}
 async save(options={}){
  if(!this.social.user||this.restoring)return;
  if(!this.connected){await this.connect();return;}
  if(this.saveTask)return this.saveTask;
  this.saveTask=this._save(options).finally(()=>{this.saveTask=null;});return this.saveTask;
 }
 async _save({force=false,quiet=false,keepalive=false}={}){
  if(!this.social.user||this.restoring)return;const userId=this.social.user.id;if(!this.connected){await this.connect();return;}if(this.conflict&&!force)return;
  if(force){if(typeof globalThis.confirm==='function'&&!globalThis.confirm('서버에 있는 진행을 이 기기의 현재 기록으로 바꿀까요? 기존 서버 기록은 이 브라우저에 백업합니다.'))return;const remote=await this.social._request('/api/cloud-save');this.storage.setItem('garden-cloud-previous-v1',JSON.stringify(remote));this.version=remote.version;}
  const epoch=this.epoch,snapshot=await this.capture();if(this.social.user?.id!==userId||epoch!==this.epoch)return;const hash=snapshotHash(snapshot);if(!keepalive)await this.submitScores();if(this.social.user?.id!==userId||epoch!==this.epoch)return;if(!force&&this.lastHash===hash&&this.version>0){if(!quiet)this.status('최신 기록이 서버에 저장되어 있어요.');return;}
  this.writeMeta(this.lastHash,{version:this.version,hash});
  try{const result=await this.social._request('/api/cloud-save',{method:'POST',body:{version:this.version,snapshot},keepalive});if(this.social.user?.id!==userId||epoch!==this.epoch)return;this.version=result.version;this.lastHash=hash;this.conflict=false;this.writeMeta(hash);this.status('서버 자동 저장됨 · 기기에도 보관 중');}
  catch(error){
   if(error.code==='CLOUD_CONFLICT'){if(this.autoRestore){const remote=await this.social._request('/api/cloud-save');await this.adoptRemote(remote);return;}this.conflict=true;this.status(error.message);}
   this.expired(error);
   throw error;
  }

 }
 async load(remote,{notice}={}){
  if(!this.social.user)return;remote??=await this.social._request('/api/cloud-save');if(!remote.snapshot){this.status('현재 기기의 진행을 서버에 저장하고 있어요.');return;}
  const snapshot=validateDevice(remote.snapshot);
  try{
   if(this.syncDialog&&!this.syncDialog.open){if(this.openDialog)this.openDialog('sync-dialog');else this.syncDialog.showModal();}
   const local=await this.capture();this.storage.setItem(BACKUP_KEY,JSON.stringify({at:this.clock(),values:local.values}));
   this.storage.setItem(PENDING_RESTORE,JSON.stringify({snapshot,meta:{userId:this.social.user.id,kind:this.social.user.isGuest?'guest':'account',version:remote.version,hash:snapshotHash(snapshot),...(notice?{notice}:{})}}));this.restoring=true;this.status('최신 서버 기록을 불러와 이어가요.');this.reload();
  }catch(error){this.restoring=false;this.syncDialog?.close();throw error;}
 }
 dispose(){clearInterval(this.timer);clearTimeout(this.saveTimer);globalThis.removeEventListener?.('garden-user',this.userListener);this.document?.removeEventListener('visibilitychange',this.visibilityListener);for(const event of ['focus','online'])globalThis.removeEventListener?.(event,this.focusListener);globalThis.removeEventListener?.('garden-wallet-change',this.walletListener);globalThis.removeEventListener?.('pagehide',this.pagehideListener);}
}
