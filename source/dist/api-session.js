const AUTH_PATHS=new Set(['/api/auth/login','/api/auth/register','/api/guest','/api/auth/logout']);

/** Persist this app's session even when the hosting gateway does not forward cookies. */
export function createSessionFetcher({fetcher=globalThis.fetch?.bind(globalThis),origin=globalThis.location?.origin,storage,explicit=true}={}){
 if(!fetcher)throw Error('서버에 연결할 수 없어요.');
 const key='suika-garden-api-session-v1:'+origin,valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
 let persistent,tab,selected=storage,token=null,revision=0,authOrder=0;
 const supplied=storage!==undefined;
 const read=(store,k)=>{try{return store?.getItem(k);}catch{return null;}};
 if(!supplied){try{persistent=globalThis.localStorage;}catch{}try{tab=globalThis.sessionStorage;}catch{}selected=read(persistent,'suika-remember-login')==='false'?tab:persistent;}
 token=read(selected,key);if(!valid(token))token=!supplied&&valid(read(tab,key))?read(tab,key):null;
 function remember(value){
  token=valid(value)?value:null;revision++;
  if(!supplied)selected=read(persistent,'suika-remember-login')==='false'?tab:persistent;
  for(const store of new Set(supplied?[selected]:[persistent,tab]))try{store?.removeItem(key);}catch{}
  try{if(token)selected.setItem(key,token);}catch{if(!supplied)try{if(token)tab?.setItem(key,token);}catch{}}
 }
 return async(path,init={})=>{
  const target=new URL(path,origin);if(target.origin!==origin||!/^\/api(?:\/|$)/.test(target.pathname))throw Error('API 원본을 확인해 주세요.');
  const pathname=target.pathname,auth=AUTH_PATHS.has(pathname),order=auth?++authOrder:authOrder;
  const sent=token,sentRevision=revision,headers=new Headers(init.headers);headers.delete('Authorization');
  if(token)headers.set('Authorization','Bearer '+token);
  if(explicit&&auth)headers.set('X-Garden-Session','bearer');
  const response=await fetcher(path,{...init,headers,cache:'no-store'});
  // A late rejection from the old guest must never erase a new account login.
  if(response.status===401&&!auth&&token===sent&&revision===sentRevision)remember(null);
  if(response.ok&&auth&&order===authOrder){
   if(pathname==='/api/auth/logout')remember(null);
   else{const payload=await response.clone().json();if(!valid(payload.accessToken))throw Error('로그인 정보를 유지하지 못했어요. 새로고침 후 다시 시도해 주세요.');if(order===authOrder)remember(payload.accessToken);}
  }
  return response;
 };
}
