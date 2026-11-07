import assert from 'node:assert/strict';
import { fitBasketSize, playArrangement, mountPlayLayout } from '../dist/play-layout.js';

const viewports=[[320,568],[360,640],[390,700],[390,844],[430,932],[768,1024],[820,1180],[1024,768],[1280,720],[1440,900],[1920,1080],[568,320],[667,375],[844,390],[1024,500]];
for (const [width,height] of viewports) {
  const mode=playArrangement(width,height),header=mode==='landscape'?54:64;
  const overhead=mode==='stack'?46+48+18+34+94+20:mode==='wide'?46+48+18+34+16:0;
  const tools=mode==='wide'?180:mode==='landscape'?232:0;
  const rail=mode==='stack'?(width<=640?38:54):mode==='wide'?54:36;
  const room=mode==='landscape'?0:32;
  for (const extra of [0,room]) {
    const result=fitBasketSize({width:width-20,height,header,overhead:overhead+extra,rail,tools});
    assert(result.width<=width-20,`${width}×${height}: horizontal controls fit`);
    assert(result.height+header+overhead+extra+10<=height,`${width}×${height}: basket and controls fit vertically`);
    assert(result.board>=150,`${width}×${height}: playable board remains usable`);
    assert(Math.abs(result.height/result.board-1.2)<1e-9,'fruit shapes keep their original proportions');
    assert.equal(result.basket,result.board+rail+5,'collection rail stays beside the basket');
  }
}
assert.equal(playArrangement(390,700),'stack');
assert.equal(playArrangement(1280,720),'wide');
assert.equal(playArrangement(844,390),'landscape');
const expanded=fitBasketSize({width:370,height:800,header:64,overhead:260});
const chrome=fitBasketSize({width:370,height:640,header:64,overhead:260});
assert(chrome.board<expanded.board,'browser chrome reducing the visible viewport shrinks the board instead of hiding tools');
// Exercise the viewport and observer wiring with independently measured rows.
const frames=[],events=new Map(),viewportEvents=new Map(),observers=[];
const element=(height,computed={})=>({hidden:false,computed,getBoundingClientRect:()=>({height})});
const score=element(48),status=element(18),next=element(34),tools=element(94),room=element(0);room.hidden=true;
const rows=new Map([['.score-band',score],['.board-top',status],['.next-card',next],['.toolbelt',tools],['.room-panel',room]]);
const main={clientWidth:390,computed:{paddingLeft:'10px',paddingRight:'10px'}};
const play={computed:{paddingTop:'46px',rowGap:'4px'},querySelector:key=>rows.get(key)};
const properties=new Map(),layout={parentElement:main,hidden:false,dataset:{},querySelector:()=>play,style:{getPropertyValue:key=>properties.get(key)||'',setProperty:(key,value)=>properties.set(key,value)}};
const header=element(64);
globalThis.document={documentElement:{clientWidth:390},body:{dataset:{game:'suika'}},querySelector:key=>key==='.game-layout'?layout:header};
globalThis.innerHeight=844;
globalThis.visualViewport={height:700,addEventListener:(key,fn)=>viewportEvents.set(key,fn)};
globalThis.getComputedStyle=el=>el.computed||{};
globalThis.requestAnimationFrame=fn=>frames.push(fn);
globalThis.addEventListener=(key,fn)=>events.set(key,fn);
globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}};
const flush=()=>{for(const fn of frames.splice(0))fn();};
mountPlayLayout();flush();
assert.equal(layout.dataset.arrangement,'stack');
const initial=Number.parseFloat(properties.get('--board-width'));
globalThis.visualViewport.height=600;viewportEvents.get('resize')();flush();
const shorter=Number.parseFloat(properties.get('--board-width'));assert(shorter<initial);
tools.getBoundingClientRect=()=>({height:118});observers[0].callback([{target:tools,contentRect:{width:270,height:118}}]);flush();
assert(Number.parseFloat(properties.get('--board-width'))<shorter,'a wrapping tool row is measured rather than clipped');
layout.hidden=true;document.body.dataset.game='apple';const savedSize=properties.get('--board-width');
globalThis.visualViewport.height=800;viewportEvents.get('resize')();flush();assert.equal(properties.get('--board-width'),savedSize);
layout.hidden=false;document.body.dataset.game='suika';events.get('resize')();flush();
assert(Number.parseFloat(properties.get('--board-width'))>initial,'returning from another game refits the visible board');
console.log('PASS play layout:15 viewport sizes, room allowance, aspect ratio, actual row measurement, browser-height resize, tool wrapping and minigame return.');
