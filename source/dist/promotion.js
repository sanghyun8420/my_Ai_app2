export const PUBLIC_GAME_URL='https://sanghyun8420.github.io/my_Ai_app2/';
export const PROMO_CAPTION='수박 하나만 만들고 끄려고 했는데… 🍉\n수박·사과·블록 퍼즐부터 과일 원정대까지!\n설치 없이 바로 플레이하고 친구랑 최고 기록을 겨뤄봐요.\n'+PUBLIC_GAME_URL;

/** Public links only: never attach a save key, room code, or login token. */
export function mountPromotion({document:doc=globalThis.document,navigator:nav=globalThis.navigator,openDialog,toast=()=>{}}={}){
 const $=id=>doc?.getElementById(id);
 if(!$('promotion-open'))return;
 $('promotion-link').value=PUBLIC_GAME_URL;$('promotion-caption').value=PROMO_CAPTION;
 $('promotion-open').addEventListener('click',()=>{openDialog('promotion-dialog');$('menu-dialog')?.close();});
 const copy=async(text,message)=>{try{if(!nav?.clipboard?.writeText)throw Error('clipboard');await nav.clipboard.writeText(text);toast(message);}catch{$('promotion-link').focus();$('promotion-link').select?.();toast('주소를 길게 눌러 복사해 주세요.');}};
 $('promotion-copy').addEventListener('click',()=>copy(PUBLIC_GAME_URL,'게임 주소를 복사했어요.'));
 $('promotion-caption-copy').addEventListener('click',()=>copy(PROMO_CAPTION,'홍보 문구와 주소를 복사했어요.'));
 $('promotion-share').addEventListener('click',async()=>{
  if(nav?.share){try{await nav.share({title:'수박정원',text:'친구랑 같이 한 판! 🍉 네 가지 게임을 한 정원에서.',url:PUBLIC_GAME_URL});return;}catch(error){if(error.name==='AbortError')return;}}
  await copy(PUBLIC_GAME_URL,'게임 주소를 복사했어요. 친구에게 보내 주세요.');
 });
}
