import {CAR_LOGO_DATA} from './car-logo-data.js';
const images=new Map();let pending;
const browserImage=url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Logo image unavailable'));img.src=url;});
export function preloadCarLogos(loader){
 if(pending)return pending;
 if(!loader&&typeof Image!=='function')return Promise.resolve([]);
 loader??=browserImage;
 pending=Promise.allSettled(CAR_LOGO_DATA.map(async entry=>{const image=await loader(new URL('./'+entry.file,import.meta.url).href);images.set(entry.level,{image,bounds:entry.bounds});}));
 return pending;
}
export const getCarLogo=level=>images.get(level);
preloadCarLogos();
