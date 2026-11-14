import { FRUITS, drawFruit, drawSpecialAppleEffect, APPLE_LEVEL, PEAR_LEVEL } from './fruits.js';
import { SKIN_CATALOG } from './catalog.js';
import { drawCarLogo, drawPlanet, drawFruit3D, PLANET_NAMES } from './skin-details.js';

export const SKINS = SKIN_CATALOG;

const INK = '#314b3d';
const CREAM = '#fffdf1';
const TAU = Math.PI * 2;
const HUES = [351, 335, 272, 29, 7, 57, 320, 42, 94, 144, 335, 51, 281, 35];

function blend(a, b, amount) {
  const channels = hex => [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16));
  const aa = channels(a), bb = channels(b);
  return `#${aa.map((value, index) => Math.round(value + (bb[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

const PALETTES = FRUITS.map((fruit, level) => ({
  pastel: blend(fruit.color, '#d9c4b4', .32),
  pastelShade: blend(fruit.color, '#d3b4ad', .22),
  cat: blend(fruit.color, '#fff5dc', .34),
  catStripe: blend(fruit.color, '#687455', .48),
  ice: blend(fruit.color, '#dff7ff', .76),
  iceShade: blend(fruit.color, '#71b7d1', .65),
  neon: `hsl(${HUES[level]} 95% 70%)`,
  cosmic: `hsl(${HUES[level]} 48% 34%)`,
  cosmicLight: `hsl(${HUES[level]} 70% 73%)`,
  gem: `hsl(${HUES[level]} 61% 56%)`,
}));

function polygon(ctx, points, fill, stroke = 'none', width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke !== 'none') { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function littleStar(ctx, x, y, size, fill = '#fff7d7') {
  polygon(ctx, [[x, y-size], [x+size*.25, y-size*.25], [x+size, y], [x+size*.25, y+size*.25], [x, y+size], [x-size*.25, y+size*.25], [x-size, y], [x-size*.25, y-size*.25]], fill);
}

function roundFace(ctx, y = 8) {
  ctx.save(); ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1.7;
  for (const x of [-10, 10]) {
    ctx.beginPath(); ctx.ellipse(x, y, 2.1, 3, 0, 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(-4, y+7); ctx.quadraticCurveTo(0, y+11, 4, y+7); ctx.stroke();
  ctx.fillStyle = '#ed8c96'; ctx.globalAlpha *= .48;
  for (const x of [-19, 19]) {
    ctx.beginPath(); ctx.ellipse(x, y+6, 5, 2.8, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function circle(ctx, radius) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
}

function ball(ctx, color) {
  ctx.save();
  const glaze=ctx.createRadialGradient(-17,-23,2,7,11,57);
  glaze.addColorStop(0,blend(color,'#ffffff',.52));glaze.addColorStop(.48,color);glaze.addColorStop(1,blend(color,'#26384a',.4));
  ctx.fillStyle = glaze;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.7;
  ctx.shadowColor = '#344a3a17';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1.8;
  circle(ctx, 44.5);
  ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;circle(ctx,41);ctx.stroke();
  ctx.restore();
}

function sheen(ctx) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha *= .27;
  ctx.beginPath();
  ctx.ellipse(-20, -24, 9, 5.5, -.7, 0, TAU);
  ctx.fill();
  ctx.globalAlpha *= .5;
  ctx.beginPath();
  ctx.ellipse(-30, -12, 3, 3.8, -.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function numberBall(ctx, level, color) {
  ctx.save();
  ball(ctx, color);
  sheen(ctx);
  const label = String(2 ** (level + 1));
  const size = label.length < 3 ? 34 : label.length === 3 ? 29 : label.length===4?24:20;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px "DM Sans", "Noto Sans KR", system-ui, sans-serif`;
  ctx.fillStyle = INK;
  ctx.shadowColor = '#fffdf155'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 1;
  ctx.fillText(label, 0, 0, 65);
  ctx.shadowColor='transparent';ctx.fillStyle=blend(color,'#314b3d',.45);
  for(let i=0;i<Math.min(5,1+Math.floor(level/3));i++){ctx.beginPath();ctx.arc((i-(Math.min(5,1+Math.floor(level/3))-1)/2)*6,25,1.5,0,TAU);ctx.fill();}
  ctx.restore();
}

function candyBall(ctx, level, color) {
  ctx.save();
  polygon(ctx,[[-24,-11],[-44,-19],[-39,-3],[-44,16],[-24,9]],blend(color,'#ffffff',.45),blend(color,INK,.4),1.3);
  polygon(ctx,[[24,-11],[44,-19],[39,-3],[44,16],[24,9]],blend(color,'#fff0cc',.32),blend(color,INK,.4),1.3);
  ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-40,-10);ctx.lineTo(-28,-3);ctx.moveTo(40,-10);ctx.lineTo(28,-3);ctx.stroke();
  ctx.scale(.83,.83);
  ball(ctx, color);
  ctx.save();
  circle(ctx, 43.5); ctx.clip();
  ctx.fillStyle = CREAM;
  ctx.globalAlpha *= .31;
  // Curved wedges curl into the center like a hand-pulled peppermint sweet.
  for (let i = 0; i < 5; i++) {
    ctx.save(); ctx.rotate(i * TAU / 5 + level * .17);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(6, -8, 13, -31, 44, -6);
    ctx.bezierCurveTo(42, -17, 33, -29, 26, -36);
    ctx.bezierCurveTo(9, -31, -7, -10, 0, 0);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= .57;
  [[-27, 18, 2], [23, -21, 2.2], [29, 13, 1.6], [-8, 32, 1.8]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  });
  ctx.restore();
  sheen(ctx);
  ctx.save();
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  for (const x of [-10, 10]) {
    ctx.beginPath(); ctx.ellipse(x, 5, 2.1, 2.8, 0, 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(-4, 12); ctx.quadraticCurveTo(0, 16, 4, 12); ctx.stroke();
  ctx.fillStyle = '#f07b83'; ctx.globalAlpha *= .4;
  for (const x of [-18, 18]) {
    ctx.beginPath(); ctx.ellipse(x, 11, 4.7, 2.3, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function pastelBall(ctx, level) {
  const palette = PALETTES[level];
  ctx.save();
  const fabric=ctx.createRadialGradient(-12,-20,2,8,14,54);fabric.addColorStop(0,'#fff9ef');fabric.addColorStop(.5,palette.pastel);fabric.addColorStop(1,palette.pastelShade);
  ctx.fillStyle = fabric; ctx.strokeStyle = '#776e61'; ctx.lineWidth = 1.8;
  circle(ctx, 44); ctx.fill(); ctx.stroke();
  ctx.save(); circle(ctx, 43); ctx.clip();
  ctx.globalAlpha *= .15; ctx.fillStyle = palette.pastelShade;
  ctx.beginPath(); ctx.ellipse(6, 33, 39, 14, -.1, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fffdf5'; ctx.globalAlpha *= .49;
  ctx.beginPath(); ctx.ellipse(-13, -21, 22, 12, -.4, 0, TAU); ctx.fill();
  ctx.globalAlpha /= .49;
  ctx.save();ctx.strokeStyle=palette.pastelShade;ctx.globalAlpha*=.5;ctx.lineWidth=1.1;ctx.setLineDash([2,3]);circle(ctx,39);ctx.stroke();ctx.restore();
  for(let i=0;i<8;i++){const a=i*TAU/8;ctx.fillStyle='#ffffff77';ctx.beginPath();ctx.arc(Math.cos(a)*32,Math.sin(a)*32,1.1,0,TAU);ctx.fill();}
  // A tiny cream petal gives the soft, hand-painted roundels their own identity.
  ctx.strokeStyle = '#fffdf5'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(0, -20, 5.5, .1, Math.PI * .9); ctx.stroke();
  roundFace(ctx, 8);
  ctx.restore();
}

const PIXEL_EDGE = [[-16,-42],[16,-42],[16,-34],[30,-34],[30,-26],[38,-26],[38,-14],[43,-14],[43,14],[38,14],[38,26],[30,26],[30,34],[16,34],[16,42],[-16,42],[-16,34],[-30,34],[-30,26],[-38,26],[-38,14],[-43,14],[-43,-14],[-38,-14],[-38,-26],[-30,-26],[-30,-34],[-16,-34]];

function pixelBall(ctx, level, color) {
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.lineJoin = 'miter';
  polygon(ctx, PIXEL_EDGE, color, '#344b43', 2);
  ctx.save();ctx.scale(.87,.87);polygon(ctx,PIXEL_EDGE,blend(color,'#ffffff',.18),blend(color,'#18332a',.4),1.8);ctx.restore();
  ctx.save(); polygon(ctx, PIXEL_EDGE, 'none'); ctx.clip();
  ctx.globalAlpha *= .11; ctx.fillStyle = '#ffffff';
  for (let x = -40; x < 44; x += 8) for (let y = -40; y < 44; y += 8) {
    if ((x + y + level * 8) % 16 === 0) ctx.fillRect(x, y, 8, 8);
  }
  ctx.restore();
  ctx.fillStyle = '#fff8e1'; ctx.globalAlpha *= .58;
  ctx.fillRect(-26,-26,8,16); ctx.fillRect(-18,-34,16,8); ctx.fillRect(-26,-18,8,8);
  ctx.globalAlpha /= .58;
  ctx.fillStyle = '#31483f';
  ctx.fillRect(-14,0,6,8); ctx.fillRect(8,0,6,8);
  ctx.fillRect(-8,17,4,4); ctx.fillRect(-4,21,8,4); ctx.fillRect(4,17,4,4);
  ctx.fillStyle = '#f2b4ad'; ctx.globalAlpha *= .66;
  ctx.fillRect(-24,11,8,4); ctx.fillRect(16,11,8,4);
  ctx.fillStyle=blend(color,'#203b2d',.5);ctx.fillRect(-14,33,28,4);ctx.fillStyle='#fff2cc';ctx.fillRect(-10,33,4,4);ctx.fillRect(6,33,4,4);
  ctx.restore();
}

function catBall(ctx, level, color) {
  ctx.save();
  const fur=ctx.createRadialGradient(-16,-18,3,8,15,55);fur.addColorStop(0,'#fff0da');fur.addColorStop(.55,PALETTES[level].cat);fur.addColorStop(1,blend(PALETTES[level].cat,'#6b6a50',.3));
  ctx.fillStyle = fur; ctx.strokeStyle = '#4b5a48'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-35,-18);
  ctx.lineTo(-28,-34); ctx.quadraticCurveTo(-25,-42,-18,-35); ctx.lineTo(-8,-30);
  ctx.quadraticCurveTo(0,-33,8,-30); ctx.lineTo(18,-35); ctx.quadraticCurveTo(25,-42,28,-34);
  ctx.lineTo(35,-18); ctx.bezierCurveTo(55,6,43,43,0,44); ctx.bezierCurveTo(-43,43,-55,6,-35,-18);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  polygon(ctx,[[-29,-25],[-24,-35],[-15,-28]],'#efb4aa');
  polygon(ctx,[[29,-25],[24,-35],[15,-28]],'#efb4aa');
  ctx.fillStyle = '#fff6df';
  ctx.beginPath(); ctx.ellipse(0,19,23,16,0,0,TAU); ctx.fill();
  ctx.strokeStyle = PALETTES[level].catStripe; ctx.lineWidth = 2.5;
  for(const [x,y] of [[-8,-19],[0,-21],[8,-19]]) {
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+7); ctx.stroke();
  }
  ctx.fillStyle = '#3c5141';
  for(const x of [-12,12]) {ctx.beginPath();ctx.ellipse(x,5,2.6,3.8,0,0,TAU);ctx.fill();}
  polygon(ctx,[[-3,13],[3,13],[0,16]],'#c98482');
  ctx.strokeStyle = '#52614b'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0,16); ctx.quadraticCurveTo(-1,21,-6,19); ctx.moveTo(0,16); ctx.quadraticCurveTo(1,21,6,19);
  ctx.moveTo(-23,12);ctx.lineTo(-35,9);ctx.moveTo(-23,19);ctx.lineTo(-35,21);
  ctx.moveTo(23,12);ctx.lineTo(35,9);ctx.moveTo(23,19);ctx.lineTo(35,21);ctx.stroke();
  ctx.fillStyle='#fffef0';for(const x of [-12,12]){ctx.beginPath();ctx.arc(x-.7,3.5,.9,0,TAU);ctx.fill();}
  ctx.strokeStyle=PALETTES[level].catStripe;ctx.lineWidth=1;ctx.globalAlpha*=.5;
  for(const side of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*(28+i),-6+i*5);ctx.lineTo(side*(34+i),-10+i*5);ctx.stroke();}
  ctx.globalAlpha/=.5;ctx.strokeStyle=blend(color,'#634357',.35);ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,37,.29*Math.PI,.71*Math.PI);ctx.stroke();
  ctx.fillStyle='#ebc363';ctx.strokeStyle='#a9843f';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(0,37,4.6,0,TAU);ctx.fill();ctx.stroke();
  ctx.restore();
}

function iceBall(ctx, level) {
  const palette = PALETTES[level];
  ctx.save();
  const frost = ctx.createLinearGradient(-22,-37,26,43);
  frost.addColorStop(0,'#f4fdff'); frost.addColorStop(.48,palette.ice); frost.addColorStop(1,palette.iceShade);
  ctx.fillStyle = frost; ctx.strokeStyle = '#7899a7'; ctx.lineWidth = 1.8;
  circle(ctx,44);ctx.fill();ctx.stroke();
  ctx.save();circle(ctx,43);ctx.clip();
  polygon(ctx,[[-43,-5],[-23,-34],[-7,7]],'#ffffff');
  ctx.globalAlpha *= .22;
  polygon(ctx,[[1,-43],[36,-24],[17,7]],'#ffffff');
  polygon(ctx,[[-33,28],[-7,7],[27,35]],'#f1fdff');
  polygon(ctx,[[17,7],[43,-5],[27,35]],palette.iceShade);
  ctx.restore();
  ctx.strokeStyle = '#f7feff';ctx.lineWidth = 1.2;ctx.globalAlpha *= .8;
  circle(ctx,39.5);ctx.stroke();
  ctx.globalAlpha /= .8;ctx.lineWidth = 2.1;ctx.strokeStyle = '#f5fdff';
  for(let arm=0;arm<6;arm++) {
    ctx.save();ctx.rotate(arm*TAU/6);
    ctx.beginPath();ctx.moveTo(0,4);ctx.lineTo(0,-21);
    ctx.moveTo(0,-13);ctx.lineTo(-5,-8);ctx.moveTo(0,-13);ctx.lineTo(5,-8);
    ctx.moveTo(0,-20);ctx.lineTo(-4,-16);ctx.moveTo(0,-20);ctx.lineTo(4,-16);ctx.stroke();ctx.restore();
  }
  littleStar(ctx,-22,-24,7,'#ffffff'); littleStar(ctx,24,19,4,'#e9faff');
  ctx.strokeStyle='#ffffffbb';ctx.lineWidth=.8;
  for(const [x,y,r]of [[-23,15,4],[-17,25,2],[25,-15,3],[30,2,1.8]]){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();}
  ctx.restore();
}

function neonBall(ctx, level, color, time=0) {
  const neon = PALETTES[level].neon;
  ctx.save();
  const glow = ctx.createRadialGradient(0,0,34,0,0,45);
  glow.addColorStop(0,'#1b2830'); glow.addColorStop(.7,neon); glow.addColorStop(1,'#25353b');
  ctx.fillStyle = glow;circle(ctx,44.5);ctx.fill();
  ctx.fillStyle = '#1d2930';circle(ctx,41.7);ctx.fill();
  ctx.strokeStyle = neon;ctx.lineWidth = 2.5;circle(ctx,43.1);ctx.stroke();
  ctx.save();ctx.globalAlpha *= .3;ctx.lineWidth = 1;circle(ctx,38.8);ctx.stroke();ctx.restore();
  ctx.lineWidth = 2.8;
  ctx.beginPath();ctx.moveTo(-12,-3);ctx.lineTo(-12,5);ctx.moveTo(12,-3);ctx.lineTo(12,5);
  ctx.moveTo(-10,15);ctx.quadraticCurveTo(0,25,10,15);ctx.stroke();
  ctx.fillStyle = neon;
  [[-29,-20],[30,20],[-24,27],[26,-27]].forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,i%2?1.8:2.4,0,TAU);ctx.fill();});
  ctx.save();ctx.globalAlpha *= .65;ctx.lineWidth = 1.1;
  ctx.beginPath();ctx.moveTo(-28,-15);ctx.lineTo(-28,-27);ctx.lineTo(-16,-27);ctx.moveTo(28,15);ctx.lineTo(28,27);ctx.lineTo(16,27);ctx.stroke();ctx.restore();
  ctx.save();circle(ctx,38);ctx.clip();ctx.strokeStyle=neon;ctx.globalAlpha*=.12;ctx.lineWidth=.7;
  for(let i=-30;i<=30;i+=10){ctx.beginPath();ctx.moveTo(i,-40);ctx.lineTo(i,40);ctx.moveTo(-40,i);ctx.lineTo(40,i);ctx.stroke();}
  ctx.restore();ctx.strokeStyle=neon;ctx.lineWidth=1.8;
  for(let i=0;i<3;i++){const a=time*.12+i*TAU/3;ctx.beginPath();ctx.arc(0,0,35,a,a+.5);ctx.stroke();}
  ctx.restore();
}

const STAR_FIELD = [[-27,-20,1.1],[-9,-32,1.5],[17,-29,.8],[31,-12,1.3],[27,16,.9],[10,31,1.5],[-13,29,.8],[-32,12,1.2],[4,-12,.9],[-17,2,.7],[12,16,.8],[0,38,.7],[-36,-5,.7],[32,28,.7]];

function galaxyBall(ctx, level, color, time = 0) {
  const palette = PALETTES[level];
  ctx.save();
  const sky = ctx.createRadialGradient(-15,-20,3,0,0,47);
  sky.addColorStop(0,palette.cosmicLight);sky.addColorStop(.45,palette.cosmic);sky.addColorStop(1,'#1d293f');
  ctx.fillStyle = sky;ctx.strokeStyle = '#5c637d';ctx.lineWidth = 1.8;circle(ctx,44);ctx.fill();ctx.stroke();
  ctx.save();circle(ctx,43);ctx.clip();
  const cloud = ctx.createRadialGradient(1,5,2,1,5,36);
  cloud.addColorStop(0,palette.cosmicLight);cloud.addColorStop(1,'rgba(185,161,233,0)');
  ctx.fillStyle = cloud;ctx.globalAlpha *= .31;
  ctx.beginPath();ctx.ellipse(1,5,41,16,-.55,0,TAU);ctx.fill();ctx.restore();
  ctx.save();ctx.rotate(time*.045);
  STAR_FIELD.forEach(([x,y,r],index)=>{
    ctx.save();ctx.globalAlpha *= .62+.22*Math.sin(time*.55+index*1.7);
    ctx.fillStyle = index%3===0?'#fff1c3':'#f3edff';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();
  });
  littleStar(ctx,21,-11,4.3,'#fff4d1');littleStar(ctx,-22,19,3.4,'#dcecff');ctx.restore();
  ctx.save();ctx.translate(0,5);ctx.rotate(-.35);
  ctx.fillStyle = '#d8caed';ctx.globalAlpha *= .64;circle(ctx,13);ctx.fill();
  ctx.strokeStyle = '#eee0b6';ctx.lineWidth = 1.5;ctx.globalAlpha /= .64;ctx.globalAlpha *= .63;
  ctx.beginPath();ctx.ellipse(0,0,26,7,0,0,TAU);ctx.stroke();ctx.restore();
  ctx.restore();
}

function gemBall(ctx, level) {
  const hue = HUES[level];
  const outer = Array.from({length:12},(_,i)=>[Math.sin(i*TAU/12)*44.2,-Math.cos(i*TAU/12)*44.2]);
  const inner = Array.from({length:12},(_,i)=>[Math.sin(i*TAU/12+.12)*24,-Math.cos(i*TAU/12+.12)*24]);
  ctx.save();
  const depth = ctx.createRadialGradient(-17,-23,1,1,5,54);
  depth.addColorStop(0,'rgba(250,255,255,.98)');
  depth.addColorStop(.22,`hsla(${hue} 76% 86% / .9)`);
  depth.addColorStop(.58,`hsla(${hue} 66% 57% / .76)`);
  depth.addColorStop(1,`hsla(${hue} 52% 24% / .98)`);
  polygon(ctx,outer,depth);
  ctx.save(); polygon(ctx,outer,'none'); ctx.clip();
  for(let i=0;i<12;i++) {
    const j=(i+1)%12;
    const lightness = [95,78,59,44,69,37,63,42,76,51,84,97][i];
    const facet = ctx.createLinearGradient(outer[i][0],outer[i][1],inner[j][0],inner[j][1]);
    facet.addColorStop(0,`hsla(${hue} 60% ${lightness}% / .92)`);
    facet.addColorStop(.48,`hsla(${hue} 72% ${Math.min(94,lightness+14)}% / .64)`);
    facet.addColorStop(.68,'rgba(240,255,255,.54)');
    facet.addColorStop(1,`hsla(${hue} 58% ${Math.max(26,lightness-19)}% / .68)`);
    polygon(ctx,[outer[i],outer[j],inner[j],inner[i]],facet,'rgba(244,255,255,.39)',.7);
  }
  const table = ctx.createLinearGradient(-20,-23,17,27);
  table.addColorStop(0,'rgba(251,255,255,.96)');
  table.addColorStop(.37,`hsla(${hue} 76% 87% / .8)`);
  table.addColorStop(.55,`hsla(${hue} 68% 57% / .64)`);
  table.addColorStop(1,`hsla(${hue} 65% 77% / .9)`);
  polygon(ctx,inner,table,'rgba(244,255,255,.82)',1.05);
  polygon(ctx,[inner[0],inner[4],inner[8]],'rgba(247,255,255,.17)');
  polygon(ctx,[inner[2],inner[6],inner[10]],`hsla(${hue} 68% 30% / .14)`);
  const reflection = ctx.createLinearGradient(-27,-30,21,32);
  reflection.addColorStop(0,'rgba(255,255,255,0)');
  reflection.addColorStop(.45,'rgba(255,255,255,.6)');
  reflection.addColorStop(.58,'rgba(255,255,255,.08)');
  reflection.addColorStop(1,'rgba(255,255,255,0)');
  polygon(ctx,[[-39,-21],[-29,-32],[34,23],[24,34]],reflection);
  polygon(ctx,[[-23,-34],[-9,-36],[-16,-24]],'rgba(255,255,255,.85)');
  ctx.strokeStyle='rgba(178,244,251,.76)';ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(outer[3][0],outer[3][1]);ctx.lineTo(inner[4][0],inner[4][1]);ctx.lineTo(outer[7][0],outer[7][1]);ctx.stroke();
  ctx.strokeStyle='rgba(249,192,230,.52)';ctx.lineWidth=.65;
  ctx.beginPath();ctx.moveTo(outer[8][0],outer[8][1]);ctx.lineTo(inner[7][0],inner[7][1]);ctx.lineTo(outer[5][0],outer[5][1]);ctx.stroke();
  ctx.restore();
  polygon(ctx,outer,'none','#577b80',1.45);
  const bevel=outer.map(([x,y])=>[x*.966,y*.966]);
  polygon(ctx,bevel,'none','rgba(247,255,255,.57)',.65);
  littleStar(ctx,-18,-29,6.7,'#ffffff');littleStar(ctx,27,20,3.2,'#f5ffff');
  ctx.restore();
}

function mysteryBall(ctx, level, color, time = 0) {
  const hue = (HUES[level] + time * 13) % 360;
  ctx.save();
  const opal = ctx.createRadialGradient(-15,-19,2,0,0,48);
  opal.addColorStop(0,'#fffef9');
  opal.addColorStop(.25,`hsl(${hue} 76% 91%)`);
  opal.addColorStop(.52,`hsl(${(hue+92)%360} 64% 81%)`);
  opal.addColorStop(.78,`hsl(${(hue+214)%360} 65% 71%)`);
  opal.addColorStop(1,`hsl(${(hue+255)%360} 42% 44%)`);
  ctx.fillStyle=opal;circle(ctx,44.2);ctx.fill();
  ctx.save();circle(ctx,43.5);ctx.clip();
  for(let i=0;i<8;i++) {
    const a=-Math.PI/2+i*TAU/8;
    const b=a+TAU/8;
    const outerA=[Math.cos(a)*46,Math.sin(a)*46];
    const outerB=[Math.cos(b)*46,Math.sin(b)*46];
    const innerA=[Math.cos(a+.18)*19,Math.sin(a+.18)*19];
    const innerB=[Math.cos(b+.18)*19,Math.sin(b+.18)*19];
    const prism=ctx.createLinearGradient(outerA[0],outerA[1],innerB[0],innerB[1]);
    prism.addColorStop(0,`hsla(${(hue+i*43)%360} 92% 83% / .5)`);
    prism.addColorStop(.5,'rgba(255,255,255,.08)');
    prism.addColorStop(1,`hsla(${(hue+i*43+95)%360} 90% 65% / .3)`);
    polygon(ctx,[outerA,outerB,innerB,innerA],prism,'rgba(255,255,255,.28)',.55);
  }
  ctx.save();ctx.rotate(-.5+Math.sin(time*.19)*.13);
  const ribbon=ctx.createLinearGradient(-37,0,37,0);
  ribbon.addColorStop(0,'rgba(255,255,255,0)');
  ribbon.addColorStop(.35,`hsla(${(hue+170)%360} 89% 85% / .38)`);
  ribbon.addColorStop(.57,'rgba(255,255,255,.48)');
  ribbon.addColorStop(.8,`hsla(${(hue+260)%360} 83% 85% / .32)`);
  ribbon.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=ribbon;ctx.beginPath();ctx.ellipse(0,2,43,13,0,0,TAU);ctx.fill();ctx.restore();
  const constellation=[[-19,-7],[-5,-19],[11,-9],[5,10],[-14,19]];
  ctx.strokeStyle='rgba(255,255,255,.76)';ctx.lineWidth=.85;
  ctx.beginPath();constellation.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  for(let i=0;i<constellation.length;i++) {
    const [x,y]=constellation[i];ctx.save();ctx.globalAlpha*=.76+.24*Math.sin(time*.65+i*1.1);
    ctx.fillStyle='#fffef5';ctx.beginPath();ctx.arc(x,y,i%2?1.8:2.2,0,TAU);ctx.fill();ctx.restore();
  }
  littleStar(ctx,11,-9,4.5,'#ffffff');
  const sweep=Math.sin(time*TAU/7)*49;
  ctx.strokeStyle='rgba(255,255,255,.27)';ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(sweep-17,-45);ctx.lineTo(sweep+17,45);ctx.stroke();
  ctx.restore();
  ctx.strokeStyle=`hsl(${(hue+230)%360} 34% 45%)`;ctx.lineWidth=1.45;circle(ctx,44.2);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=.8;circle(ctx,41.8);ctx.stroke();
  sheen(ctx);
  ctx.restore();
}

const CAR_LABELS=['기아','현대','제네시스','테슬라','랜드로버','벤츠','BMW','아우디','포르셰','페라리','람보르기니','코닉세그','파가니','부가티'];
export function skinFruitName(level,skin='classic'){return skin==='cars'?CAR_LABELS[level]:skin==='galaxy'?PLANET_NAMES[level]:FRUITS[level].name;}
function foodBall(ctx,level){
  ctx.save();
  if(level%4===0){ball(ctx,'#b76d3f');ctx.fillStyle='#e8a3af';circle(ctx,33);ctx.fill();ctx.fillStyle='#473b30';circle(ctx,12);ctx.fill();for(let i=0;i<10;i++){ctx.save();ctx.rotate(i*TAU/10);ctx.fillStyle=i%2?'#e2c760':'#6c4e43';ctx.fillRect(21,-2,7,3);ctx.restore();}}
  else if(level%4===1){ctx.fillStyle='#26392f';ctx.fillRect(-39,-28,78,56);ctx.fillStyle='#eee9d5';ctx.fillRect(-34,-24,68,48);ctx.fillStyle='#c46c59';ctx.fillRect(-27,-18,54,36);ctx.strokeStyle='#f4d3aa';for(let i=-20;i<30;i+=13){ctx.beginPath();ctx.moveTo(i,-17);ctx.lineTo(i+12,17);ctx.stroke();}}
  else if(level%4===2){polygon(ctx,[[-39,-30],[40,-30],[0,43]],'#e0b54f','#744b31',3);ctx.strokeStyle='#9d5f32';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-38,-30);ctx.lineTo(39,-30);ctx.stroke();for(const [x,y]of[[-15,-12],[16,-10],[0,16]]){ctx.fillStyle='#a34034';ctx.beginPath();ctx.arc(x,y,7,0,TAU);ctx.fill();}}
  else{for(const [y,color,h]of[[-29,'#c3904e',20],[-8,'#547b39',8],[0,'#ddae3f',7],[9,'#603d2e',13],[25,'#be8b49',12]]){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,y,41,h,0,0,TAU);ctx.fill();}ctx.fillStyle='#e8d9a6';for(let i=-25;i<=25;i+=10)ctx.fillRect(i,-35+i%3,3,2);}
  ctx.restore();
}
function rottenBall(ctx,level){
  drawFruit(ctx,level,0,0,44,0,1,false,0);ctx.save();
  for(let i=0;i<9;i++){ctx.fillStyle=i%2?'#505336cc':'#5b3929bb';ctx.beginPath();ctx.ellipse(Math.sin(i*4.1)*29,Math.cos(i*2.8)*28,6+i%4,5+i%3,i,0,TAU);ctx.fill();}
  ctx.strokeStyle='#b5bc86';ctx.lineWidth=1;for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(18,11);ctx.lineTo(18+Math.cos(i)*12,11+Math.sin(i)*12);ctx.stroke();}ctx.restore();
}
function royalBall(ctx,level){gemBall(ctx,level);ctx.save();ctx.strokeStyle='#f5da7c';ctx.lineWidth=3;polygon(ctx,[[-20,-32],[-27,-43],[-8,-37],[0,-49],[9,-37],[27,-43],[20,-32]],'#bf963f','#f2dfa3',1);ctx.restore();}
const RENDERERS = {
  numbers:numberBall, candy:candyBall, pastel:pastelBall, pixel:pixelBall,
  cat:catBall, ice:iceBall, neon:neonBall, galaxy:drawPlanet, gem:gemBall, mystery:rottenBall,
  cars:drawCarLogo,fruit3d:drawFruit3D,food:foodBall,royalGem:royalBall,
};

/** Draw any skin with the same coordinates and optional lucky-apple state. */
export function drawSkinnedFruit(ctx, level, x, y, radius, rotation = 0, alpha = 1, special = false, time = 0, skin = 'classic') {
  level = Math.max(0, Math.min(FRUITS.length - 1, level | 0));
  time = Number.isFinite(time) ? time % 3600 : 0;
  const renderer = RENDERERS[skin];
  if (!renderer) {
    drawFruit(ctx, level, x, y, radius, rotation, alpha, special, time);
    return;
  }
  ctx.save();
  ctx.translate(x, y); ctx.scale(radius / 45, radius / 45);
  ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (special && [APPLE_LEVEL,PEAR_LEVEL].includes(level)) drawSpecialAppleEffect(ctx, time, 'back');
  ctx.save(); ctx.rotate(rotation);
  renderer(ctx, level, FRUITS[level].color, time);
  ctx.restore();
  if (special && [APPLE_LEVEL,PEAR_LEVEL].includes(level)) drawSpecialAppleEffect(ctx, time);
  ctx.restore();
}
