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
function snapshotHash(snapshot){let h=2166136261;for(const c of JSON.stringify(snapshot))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);}
export function localScores(storage=globalThis.localStorage){const root=parse(storage.getItem(ECONOMY_KEY)),records=root?.records||{};return Object.fromEntries(['suika','apple','blocks'].map(game=>{const raw=records[GAME_KEYS[game]]||parse(storage.getItem(GAME_KEYS[game]),{}),score=game==='suika'?Math.max(raw.bestScore||0,Number(storage.getItem('suika-garden-best'))||0):raw.best||0;return [game,Math.max(0,Math.min(100000000,Math.floor(score)))];}));}
function newKey(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}

/** Nickname entry and private server saves; no password or public-name lookup. */
export class PlayerCloud {
 constructor({social,storage,document:doc=globalThis.document,openDialog,beforeCapture=()=>{},reload=()=>globalThis.location.reload(),onError=()=>{}}={}){
  this.social=social;try{this.storage=storage??globalThis.localStorage;}catch{this.storage=null;}this.document=doc;this.openDialog=openDialog;this.beforeCapture=beforeCapture;this.reload=reload;this.onError=onError;
  this.ready=false;this.busy=false;this.conflict=false;this.connected=false;this.restoring=false;this.version=0;this.userId=null;this.lastHash='';this.lastScores='';this.epoch=0;this.timer=null;
  this.build();this.userListener=e=>{if(!this.ready||this.busy)return;if(!e.detail){this.userId=null;this.connected=false;this.storage?.removeItem(PLAYER_KEY);this.status('이 기기에 저장 중 · 이름을 정하면 순위에 참여해요.');return;}if(this.social._authBusy)return;if(e.detail.id!==this.userId)this.connect().catch(error=>this.status(error.message));else this.render();};
  globalThis.addEventListener?.('garden-user',this.userListener);
  this.visibilityListener=()=>{if(this.document?.hidden&&this.ready&&!this.busy&&!this.social._authBusy&&!this.conflict)this.action(()=>this.save({quiet:true}));};
  this.document?.addEventListener('visibilitychange',this.visibilityListener);
 }
 $(id){return this.document?.getElementById(id);}
 build(){
  if(!this.document)return;
  const dialog=this.document.createElement('dialog');dialog.id='player-dialog';dialog.className='player-dialog';dialog.setAttribute('aria-labelledby','player-title');
  dialog.innerHTML=`<button class="dialog-close" type="button" aria-label="닫고 기기에서 플레이">×</button><p class="eyebrow">SUIKA GARDEN</p><h2 id="player-title">어떤 이름으로 놀까요?</h2><p class="player-intro">회원가입 없이 이름만 정하면 순위에 참여해요.<br>이 브라우저에 남아 있는 예전 최고점수도 함께 올려요.</p><form id="player-name-form"><label for="player-name">닉네임</label><div class="player-input-row"><input id="player-name" maxlength="16" autocomplete="nickname" placeholder="1~16자" required><button id="player-submit" class="start-button" type="submit">이 이름으로 시작</button></div></form><p id="player-status" role="status" aria-live="polite"></p><div id="player-save-actions" hidden><button id="player-save" class="secondary-button" type="button">지금 서버에 저장</button><button id="player-load" class="secondary-button" type="button">서버 기록 불러오기</button></div><details class="player-recovery"><summary>다른 주소·기기에서 이어하기</summary><p>같은 이름을 적는 것만으로는 다른 사람의 기록을 불러오지 않아요. 아래 복구 코드를 한 번 입력하면 같은 기록을 이어갈 수 있어요.</p><div id="player-code-row" hidden><small>내 복구 코드 · 이 코드를 아는 사람은 기록을 불러올 수 있어요.</small><code id="player-code"></code><button id="player-copy" class="secondary-button" type="button">복구 코드 복사</button></div><form id="player-restore-form"><label for="player-recovery-code">기존 복구 코드</label><div class="player-input-row"><input id="player-recovery-code" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80" placeholder="기존 기기에서 복사한 코드"><button class="secondary-button" type="submit">이어하기</button></div></form></details><div class="player-footer"><button id="player-practice" class="text-link" type="button">이름 없이 연습하기</button><button id="player-account" class="text-link" type="button">기존 계정 로그인</button></div>`;
  this.document.body.append(dialog);this.dialog=dialog;dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>globalThis.dispatchEvent?.(new CustomEvent('garden-player-close')));
  this.$('player-name-form').onsubmit=e=>{e.preventDefault();this.action(()=>this.join(this.$('player-name').value));};
  this.$('player-restore-form').onsubmit=e=>{e.preventDefault();this.action(()=>this.recover(this.$('player-recovery-code').value));};
  this.$('player-save').onclick=()=>this.action(()=>this.save({force:this.conflict}));this.$('player-load').onclick=()=>this.action(()=>this.load());
  this.$('player-copy').onclick=()=>this.action(async()=>{const identity=this.identity();await globalThis.navigator.clipboard.writeText(identity.key);this.status('복구 코드를 복사했어요. 다른 주소·기기의 이어하기 칸에 붙여 넣어 주세요.');});
  this.$('player-practice').onclick=()=>dialog.close();this.$('player-account').onclick=()=>{dialog.close();this.social.openAccount('login');};
 }
 identity(){try{return parse(this.storage?.getItem(PLAYER_KEY));}catch{return null;}}
 status(message){this.message=message;if(this.$('player-status'))this.$('player-status').textContent=message;}
 render(){const user=this.social.user,identity=this.identity();if(this.$('player-title'))this.$('player-title').textContent=user?'내 이름과 저장 기록':'어떤 이름으로 놀까요?';if(this.$('player-name'))this.$('player-name').value=user?.displayName||this.$('player-name').value||'';if(this.$('player-submit'))this.$('player-submit').textContent=user?'이름 바꾸기':'이 이름으로 시작';if(this.$('player-save-actions'))this.$('player-save-actions').hidden=!user;const ownCode=user?.isGuest&&identity?.userId===user.id&&identity.key;if(this.$('player-code-row'))this.$('player-code-row').hidden=!ownCode;if(this.$('player-code'))this.$('player-code').textContent=ownCode||'';}
 open(){this.render();if(this.openDialog)this.openDialog('player-dialog');else if(this.dialog&&!this.dialog.open)this.dialog.showModal();this.$('player-name')?.focus();}
 async action(fn){if(this.busy)return;this.busy=true;if(this.$('player-submit'))this.$('player-submit').disabled=true;try{await fn();}catch(error){this.status(error.message||'연결이 어려워요. 기기 기록은 그대로예요.');this.onError(error);}finally{this.busy=false;if(this.$('player-submit'))this.$('player-submit').disabled=false;this.render();}}
 async init(){
  const identity=this.identity();if(!this.social.user&&identity?.key){try{const response=await this.social._request('/api/guest',{method:'POST',body:{key:identity.key}});this.storage.setItem(PLAYER_KEY,JSON.stringify({key:identity.key,userId:response.user.id}));this.social._acceptUser(response);}catch(error){this.status(error.message);}}
  this.ready=true;if(this.social.user){try{await this.connect();}catch(error){this.status(error.message);}}
  if(this.social.user&&!this.conflict&&!this.restoring)await this.social._handlePendingLinks?.();
  this.timer=setInterval(()=>{if(!this.busy&&!this.social._authBusy&&!this.restoring&&this.social.user){if(!this.connected)this.connect().catch(error=>this.status(error.message));else if(!this.conflict)this.action(()=>this.save({quiet:true}));}},20000);this.timer.unref?.();return this;
 }
 async join(name){
  name=String(name).normalize('NFKC').trim();if(!name||[...name].length>16)throw Error('닉네임은 1~16자로 적어 주세요.');
  if(this.social.user){const data=await this.social._request('/api/player/name',{method:'POST',body:{displayName:name}});this.social._acceptUser(data);this.status('이름을 바꿨어요. 순위에도 같은 이름이 표시돼요.');this.dialog?.close();return;}
  const old=this.identity(),key=old?.key||newKey();this.storage.setItem(PLAYER_KEY,JSON.stringify({key,userId:null}));
  const data=await this.social._request('/api/guest',{method:'POST',body:{key,displayName:name}});this.storage.setItem(PLAYER_KEY,JSON.stringify({key,userId:data.user.id}));this.social._acceptUser(data);await this.connect();if(!this.conflict){this.dialog?.close();await this.social._handlePendingLinks?.();}
 }
 async recover(code){
  code=String(code).replace(/\s/g,'');if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error('기존 복구 코드를 빠짐없이 복사해 넣어 주세요.');
  await this.beforeCapture();const local=captureDevice(this.storage);this.storage.setItem(BACKUP_KEY,JSON.stringify({at:Date.now(),values:local.values}));
  const data=await this.social._request('/api/guest',{method:'POST',body:{key:code}});this.storage.setItem(PLAYER_KEY,JSON.stringify({key:code,userId:data.user.id}));this.social._acceptUser(data);await this.connect({restore:true});
 }
 async connect({restore=false}={}){
  if(!this.social.user)return;const userId=this.social.user.id,epoch=++this.epoch;this.userId=userId;this.connected=false;this.lastScores='';
  const remote=await this.social._request('/api/cloud-save');if(epoch!==this.epoch||this.social.user?.id!==userId)return;
  const meta=parse(this.storage?.getItem(CLOUD_META));this.version=remote.version;this.connected=true;this.conflict=false;
  if(restore&&remote.snapshot){await this.load(remote);return;}
  if(remote.snapshot&&(!meta||meta.userId!==userId||meta.version!==remote.version)){
   this.conflict=true;this.status('다른 주소·기기에 저장된 기록이 있어요. ‘서버 기록 불러오기’ 또는 ‘지금 서버에 저장’을 골라 주세요.');this.open();return;
  }
  this.lastHash=meta?.userId===userId?meta.hash||'':'';await this.submitScores();await this.save({quiet:true});this.render();
 }
 async submitScores(){if(!this.social.user)return;const scores=localScores(this.storage),encoded=JSON.stringify(scores);if(encoded===this.lastScores)return;await this.social._request('/api/profile/import',{method:'POST',body:{scores}});this.lastScores=encoded;}
 async save(options={}){
  if(!this.social.user||this.restoring)return;
  if(!this.connected){await this.connect();return;}
  if(this.saveTask)return this.saveTask;
  this.saveTask=this._save(options).finally(()=>{this.saveTask=null;});return this.saveTask;
 }
 async _save({force=false,quiet=false}={}){
  if(!this.social.user||this.restoring)return;const userId=this.social.user.id;if(!this.connected){await this.connect();return;}if(this.conflict&&!force)return;
  if(force){if(typeof globalThis.confirm==='function'&&!globalThis.confirm('서버에 있는 진행을 이 기기의 현재 기록으로 바꿀까요? 기존 서버 기록은 이 브라우저에 백업합니다.'))return;const remote=await this.social._request('/api/cloud-save');this.storage.setItem('garden-cloud-previous-v1',JSON.stringify(remote));this.version=remote.version;}
  await this.beforeCapture();if(this.social.user?.id!==userId)return;const snapshot=captureDevice(this.storage),hash=snapshotHash(snapshot);await this.submitScores();if(this.social.user?.id!==userId)return;if(!force&&this.lastHash===hash&&this.version>0){if(!quiet)this.status('최신 기록이 서버에 저장되어 있어요.');return;}
  try{const result=await this.social._request('/api/cloud-save',{method:'POST',body:{version:this.version,snapshot}});if(this.social.user?.id!==userId)return;this.version=result.version;this.lastHash=hash;this.conflict=false;this.storage.setItem(CLOUD_META,JSON.stringify({userId,version:this.version,hash}));this.status('서버 자동 저장됨 · 이 기기에도 저장돼요.');}
  catch(error){if(error.code==='CLOUD_CONFLICT'){this.conflict=true;this.status(error.message);}throw error;}
 }
 async load(remote,{notice}={}){
  if(!this.social.user)return;remote??=await this.social._request('/api/cloud-save');if(!remote.snapshot){this.status('아직 서버에 저장된 진행이 없어요. 이 기기에서 플레이한 뒤 저장해 주세요.');return;}
  const snapshot=validateDevice(remote.snapshot);await this.beforeCapture();this.storage.setItem(BACKUP_KEY,JSON.stringify({at:Date.now(),values:captureDevice(this.storage).values}));
  this.storage.setItem(PENDING_RESTORE,JSON.stringify({snapshot,meta:{userId:this.social.user.id,version:remote.version,hash:snapshotHash(snapshot),...(notice?{notice}:{})}}));this.restoring=true;this.status('서버 기록을 불러와 다시 시작해요.');this.reload();
 }
 dispose(){clearInterval(this.timer);globalThis.removeEventListener?.('garden-user',this.userListener);this.document?.removeEventListener('visibilitychange',this.visibilityListener);}
}
