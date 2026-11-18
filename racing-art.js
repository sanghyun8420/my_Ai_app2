import {vehicleDimensions} from './racing-model.js';
import {CAR_SPRITES, SPEED_ASSETS} from './racing-sprites.js';
import {referenceCars} from './racing-reference.js';

export const RACER_PHOTOS_READY = 'garden-racing-photos-ready';

function loadSprite(source, onLoad) {
 if (typeof Image !== 'function') return null;
 const image = new Image();
 if (onLoad) image.onload = onLoad;
 image.src = source;
 return image;
}

const refreshCarPreviews = () => globalThis.dispatchEvent?.(new Event(RACER_PHOTOS_READY));
const photoAtlas = loadSprite(SPEED_ASSETS.cars, refreshCarPreviews);
const referenceAtlases = {
 base: loadSprite(new URL('./racing-reference.webp', import.meta.url).href, refreshCarPreviews),
 series: loadSprite(new URL('./racing-reference-series.webp', import.meta.url).href, refreshCarPreviews),
 touring: loadSprite(new URL('./racing-reference-touring.webp', import.meta.url).href, refreshCarPreviews),
 fastback: loadSprite(new URL('./racing-reference-fastback.webp', import.meta.url).href, refreshCarPreviews)
};
const npcAtlas = loadSprite(SPEED_ASSETS.npc);
const buildingAtlas = loadSprite(SPEED_ASSETS.buildings);
const roadAtlas = loadSprite(SPEED_ASSETS.road);
const roadsideAtlas = loadSprite(new URL('./racing-roadside.webp', import.meta.url).href);
const roadsideSprites = {
 lamp: [78, 11, 112, 204],
 lantern: [286, 7, 86, 207],
 signal: [520, 15, 40, 200],
 oak: [671, 17, 197, 192],
 pine: [28, 232, 169, 205],
 palm: [229, 237, 208, 193],
 hedge: [486, 270, 136, 134],
 flower: [687, 263, 175, 148]
};
const spriteReady = image => !!(image?.complete && image.naturalWidth > 0);

const box = (c, x, y, w, h, radius = 8) => {
 c.beginPath();
 c.roundRect(x, y, w, h, radius);
};

export function drawRaceCar(c, x, y, width, length, angle, config, options = {}) {
 const { boost = false, jump = 0, time = 0, police = false, brake = false } = options;
 const { type, width: w, length: h } = vehicleDimensions(config, width, length);
 const paint = config.bodyColor || '#64748b';
 const trim = config.accentColor || '#e9f2fb';
 const sport = type === 'supercar';
 const utility = type === 'wagon' || type === 'suv';
 const nose = sport ? .30 : type === 'suv' ? .40 : .36;
 const tail = utility ? .41 : sport ? .45 : .35;
 const glassStart = sport ? -.20 : -.24;
 const glassEnd = utility ? .39 : .29;
 const polygon = (points, color) => {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(points[0][0] * w, points[0][1] * h);
  for (const [px, py] of points.slice(1)) c.lineTo(px * w, py * h);
  c.closePath();
  c.fill();
 };

 c.save();
 c.translate(x + 2, y + 3 + jump * .22);
 c.rotate(angle);
 c.fillStyle = '#050e1a66';
 box(c, -w * .51, -h * .5, w * 1.02, h, w * .17);
 c.fill();
 c.restore();

 c.save();
 c.translate(x, y - jump * .35);
 c.scale(1 + jump * .004, 1 + jump * .004);
 c.rotate(angle);
 if (boost) {
  const trail = c.createLinearGradient(0, h / 2, 0, h * 1.08);
  trail.addColorStop(0, '#baf5ff');
  trail.addColorStop(.28, '#41d4ff');
  trail.addColorStop(1, '#41d4ff00');
  const tailEnd = .98 + Math.sin(time * 37) * .1;
  polygon([[-.30,.45],[-.14,.45],[-.22,tailEnd]], trail);
  polygon([[.14,.45],[.30,.45],[.22,tailEnd]], trail);
 }
 const row = CAR_SPRITES.indexOf(config.id);
 const npc = Number.isInteger(config.npcIndex) ? config.npcIndex : -1;
 if (npc >= 0 && npc < 12 && spriteReady(npcAtlas)) {
  const cell = police && Math.floor(time * 2) % 2 === 0 ? 3 : npc;
  c.drawImage(npcAtlas, (cell % 4) * 96 + 2, Math.floor(cell / 4) * 170 + 2, 92, 165,
   -w / 2, -h / 2, w, h);
  c.restore();
  return;
 }
 const reference = Object.hasOwn(referenceCars, config.id) ? referenceCars[config.id] : null;
 const atlas = referenceAtlases[reference?.sheet || 'base'];
 const top = reference && spriteReady(atlas) ? reference.top : null;
 if (top || (row >= 0 && spriteReady(photoAtlas))) {
  if (top) c.drawImage(atlas, ...top, -w / 2, -h / 2, w, h);
  else c.drawImage(photoAtlas, 322, row * 190 + 4, 90, 182, -w / 2, -h / 2, w, h);
  if (brake) {
   c.fillStyle = '#ff473f';
   c.fillRect(-w * .33, h * .42, w * .66, 2);
  }
  c.restore();
  return;
 }
 c.fillStyle = '#080e15';
 for (const tx of [-.53, .38]) {
  for (const ty of [-.34,.20]) {
   box(c, tx * w, ty * h, w * .15, h * .19, 2);
   c.fill();
  }
 }

 const metal = c.createLinearGradient(-w / 2, 0, w / 2, 0);
 metal.addColorStop(0, '#182638');
 metal.addColorStop(.13, paint);
 metal.addColorStop(.48, paint);
 metal.addColorStop(.7, paint);
 metal.addColorStop(1, '#293e51');
 c.beginPath();
 c.moveTo(-w * nose, -h * .495);
 c.quadraticCurveTo(0, -h * .525, w * nose, -h * .495);
 c.quadraticCurveTo(w * .49, -h * .46, w * .49, -h * .33);
 c.lineTo(w * (sport ? .44 : .47), h * .09);
 c.quadraticCurveTo(w * .54, h * .47, w * tail, h * .49);
 c.quadraticCurveTo(0, h * .51, -w * tail, h * .49);
 c.quadraticCurveTo(-w * .54, h * .47, -w * (sport ? .44 : .47), h * .09);
 c.lineTo(-w * .49, -h * .33);
 c.quadraticCurveTo(-w * .49, -h * .46, -w * nose, -h * .495);
 c.closePath();
 c.fillStyle = metal;
 c.fill();
 c.strokeStyle = '#12202f';
 c.lineWidth = 1.3;
 c.stroke();

 const reflection = c.createLinearGradient(0, -h / 2, 0, h / 2);
 reflection.addColorStop(0, '#ffffff66');
 reflection.addColorStop(.35, '#ffffff10');
 reflection.addColorStop(.72, '#ffffff00');
 reflection.addColorStop(1, '#090f2b60');
 c.fillStyle = reflection;
 c.fill();
 if (config.stripeColor) {
  c.fillStyle = config.stripeColor;
  c.globalAlpha = .65;
  c.fillRect(-w * .08, -h * .43, w * .16, h * .86);
  c.globalAlpha = 1;
 }

 // Model details are large enough to read from the driving camera.
 if (type === 'suv') {
  for (const rail of [-.32, .32]) {
   c.fillStyle = '#c8d9dd';
   box(c, (rail - .022) * w, -h * .18, w * .044, h * .53, 1);
   c.fill();
  }
 }
 if (sport) {
  polygon([[-.43,.10],[-.32,.14],[-.29,.31],[-.45,.25]], '#152333');
  polygon([[.43,.10],[.32,.14],[.29,.31],[.45,.25]], '#152333');
 }
 c.fillStyle = paint;
 for (const side of [-1, 1]) {
  box(c, (side * .51 - .045) * w, (glassStart + .02) * h, w * .09, h * .065, 1.3);
  c.fill();
 }
 const tint = c.createLinearGradient(0, h * glassStart, w * .32, h * glassEnd);
 tint.addColorStop(0, '#7591a4');
 tint.addColorStop(.35, '#2c4759');
 tint.addColorStop(1, '#0b1b27');
 polygon([[-.34,glassStart],[.34,glassStart],[.36,.13],[.30,glassEnd],[-.30,glassEnd],[-.36,.13]], tint);
 polygon([[-.29,-.086],[.29,-.086],[.28,utility ? .28 : .147],[-.28,utility ? .28 : .147]], police ? '#edf6ff' : paint);
 polygon([[-.28,glassStart + .025],[.13,glassStart + .018],[-.07,-.092],[-.30,-.092]], '#ffffff44');
 if (utility) {
  c.fillStyle = trim;
  c.fillRect(-w * .26, h * .27, w * .52, 1.1);
 }

 const family = config.id ? carFaceFamily(config) : '';
 const vent = family === 'bmw' ? [[-.22,-.46],[-.035,-.46],[.035,-.46],[.22,-.46]] : [[-.20,-.46],[.20,-.46]];
 polygon([...vent, [.16,-.40],[-.16,-.40]], '#12212d');
 if (family === 'bmw') {
  c.fillStyle = '#cbd8e4';
  c.fillRect(-1, -h * .46, 2, h * .067);
 }
 for (const side of [-1,1]) {
  polygon([[side*.20,-.441],[side*.42,-.451],[side*.40,-.373],[side*.26,-.384]], '#101925');
  polygon([[side*.22,-.433],[side*.405,-.441],[side*.39,-.400],[side*.27,-.402]], '#e4f5ff');
  polygon([[side*.18,.425],[side*.42,.396],[side*.40,.46],[side*.18,.47]], brake ? '#ffe0ce' : '#ed5d65');
 }
 if (sport) {
  c.fillStyle = '#121f27';
  c.fillRect(-w * .44, h * .32, w * .88, h * .038);
 }
 if (police) {
  const flash = Math.floor(time * 9) % 2;
  c.fillStyle = flash ? '#ff565b' : '#8b213a';
  c.fillRect(-w * .27, -h * .026, w * .27, h * .081);
  c.fillStyle = flash ? '#1b54a5' : '#4ec5ff';
  c.fillRect(0, -h * .026, w * .27, h * .081);
 }
 c.restore();
}
// Roadside scenery is tied to world coordinates, so buildings and markings move at
// exactly the same speed as the road and do not jump when a viewport changes.
export function roadSceneFeatures(distance,viewTop,viewBottom,spacing=220){
 const near=distance+(533-viewBottom)/1.45,far=distance+(533-viewTop)/1.45;
 const first=Math.floor(near/spacing)-1,last=Math.ceil(far/spacing)+1,items=[];
 for(let id=first;id<=last;id++)items.push({id,world:id*spacing,y:533-(id*spacing-distance)*1.45});
 return items;
}
const roadNoise=(n,seed=0)=>{const v=Math.sin((n+seed*1.71)*12.9898)*43758.5453;return v-Math.floor(v);};
function drawRoadsideSprite(c, kind, x, y, height) {
 if (!spriteReady(roadsideAtlas)) return false;
 const source = roadsideSprites[kind];
 const width = height * source[2] / source[3];
 c.drawImage(roadsideAtlas, ...source, x - width / 2, y - height / 2, width, height);
 return true;
}

function drawRoadside(c,x,y,side,theme,variant){
 c.save();c.translate(x,y);
 if (spriteReady(buildingAtlas) && (theme === 1 || (theme === 2 && variant % 3 === 0))) {
  const tile = variant % 8;
  c.fillStyle = '#172d3555';
  c.fillRect(-42, -65, 84, 130);
  c.drawImage(buildingAtlas, (tile % 4) * 150, Math.floor(tile / 4) * 150, 150, 150,
   -42, -66, 84, 130);
  c.restore();
  return;
 }
 if(theme===0){ // Waterfront: a stone quay with parallel water glints.
  c.fillStyle='#285d73';c.fillRect(-38,-158,76,316);
  c.fillStyle='#427c8f';for(let i=-145;i<158;i+=25){c.fillRect(-32+(i%3)*2,i,32,2);c.fillRect(8,i+11,25,2);}
  c.fillStyle='#9c9a83';c.fillRect(side<0?22:-30,-158,8,316);c.fillStyle='#e7d7a1';for(let i=-150;i<155;i+=22)c.fillRect(side<0?23:-29,i,6,3);
 }else if(theme===1){ // City blocks are rooftop shapes, not road obstacles.
  const tint=['#726c62','#786b61','#59666b','#8a766b'][variant%4];
  c.fillStyle='#18282bcc';c.fillRect(-35,-87,70,176);c.fillStyle='#403f3b';c.fillRect(-38,-94,72,174);
  c.fillStyle=tint;c.fillRect(-34,-90,64,165);c.strokeStyle='#c0b1a0';c.lineWidth=2;c.strokeRect(-32,-88,60,161);
  c.fillStyle='#4e5551';c.fillRect(-26,-73,46,45);c.fillStyle='#8f9991';c.fillRect(-23,-70,40,39);
  c.fillStyle='#4e5551';for(let i=0;i<4;i++)c.fillRect(-19+i*9,-65,5,29);
  c.fillStyle='#b8ab97';c.fillRect(-22,1,38,24);c.fillStyle='#53615f';for(let i=0;i<4;i++)c.fillRect(-18+i*9,5,5,16);
  c.fillStyle='#d2c3a7';c.fillRect(-22,39,15,17);c.fillStyle='#526466';c.fillRect(0,39,19,17);c.fillStyle='#282e2f';c.fillRect(2,42,15,2);c.fillRect(2,47,15,2);c.fillRect(2,52,15,2);
 }else{ // Park verge, trees and paths.
  c.fillStyle='#567454';c.fillRect(-38,-158,76,316);c.fillStyle='#6a8761';c.fillRect(side<0?15:-23,-158,8,316);
  const tree = ['oak', 'pine', 'palm'][variant % 3];
  if (drawRoadsideSprite(c, tree, 0, -60, 62)) {
   drawRoadsideSprite(c, tree === 'pine' ? 'oak' : 'pine', -side * 5, 30, 60);
   drawRoadsideSprite(c, variant % 2 ? 'hedge' : 'flower', side * 10, 95, 33);
   c.restore();
   return;
  }
  for(let i=-1;i<=1;i++){const ty=i*94+(variant%3)*9-8;c.fillStyle='#30473a66';c.beginPath();c.ellipse(3,ty+5,25,20,0,0,Math.PI*2);c.fill();c.fillStyle='#334d38';c.beginPath();c.arc(0,ty,21,0,Math.PI*2);c.fill();c.fillStyle='#5b8055';c.beginPath();c.arc(-4,ty-5,15,0,Math.PI*2);c.fill();c.fillStyle='#8ba574';c.beginPath();c.arc(-7,ty-8,6,0,Math.PI*2);c.fill();}
 }
 c.restore();
}
export function drawRaceScene(c,race,time=0,input={},viewHeight=720,playerBottom=187){
 const shift=viewHeight-533-playerBottom;c.save();c.translate(0,shift);
 const top=-shift,bottom=viewHeight-shift,worldAt=y=>race.distance+(533-y)/1.45;
 const curve=y=>race.curve(worldAt(y))-race.curve(race.distance),left=y=>80+curve(y),scroll=race.distance*1.45;
 const seed=race.scenerySeed||0,themeAt=y=>Math.floor(roadNoise(Math.floor(worldAt(y)/1400),seed)*3);
 // Draw the districts behind the pavement so roofs cannot cover a bend.
 for (let y = top; y < bottom; y += 8) {
  c.fillStyle = ['#285d73', '#827f75', '#567454'][themeAt(y)];
  c.fillRect(0, y, 600, 9);
 }
 for (const feature of roadSceneFeatures(race.distance, top, bottom)) {
  if (feature.y < top - 180 || feature.y > bottom + 180) continue;
  const roadLeft = left(feature.y);
  const theme = themeAt(feature.y);
  const variant = Math.floor(roadNoise(feature.id, seed) * 16);
  drawRoadside(c, roadLeft - 67, feature.y, -1, theme, variant);
  drawRoadside(c, roadLeft + 507, feature.y, 1, theme, variant + 2);
 }
 const texturedRoad = spriteReady(roadAtlas);
 for (let y = top; y < bottom; y += 8) {
  const x = left(y), theme = themeAt(y);
  c.fillStyle = ['#adab96', '#aaa69a', '#a5a898'][theme];
  c.fillRect(x - 28, y, 28, 9);
  c.fillRect(x + 440, y, 28, 9);
  if (texturedRoad) {
   const tileHeight = roadAtlas.naturalHeight;
   const sy = ((y - scroll) % tileHeight + tileHeight) % tileHeight;
   const first = Math.min(9, tileHeight - sy);
   c.drawImage(roadAtlas, 0, sy, 440, first, x, y, 440, first);
   if (first < 9) c.drawImage(roadAtlas, 0, 0, 440, 9 - first, x, y + first, 440, 9 - first);
   continue;
  }
  c.fillStyle = ['#354348', '#354141', '#394741'][theme];
  c.fillRect(x, y, 440, 9);
  c.fillStyle = '#dec788';
  for (const offset of [3, 217, 222, 434]) c.fillRect(x + offset, y, 2, 9);
  if ((((y - scroll) % 104) + 104) % 104 < 55) {
   c.fillStyle = '#ebede0bb';
   for (const offset of [110, 330]) c.fillRect(x + offset - 2, y, 4, 9);
  }
 }
 for (const mark of roadSceneFeatures(race.distance, top, bottom, 32)) {
  const x = left(mark.y);
  c.fillStyle = '#69756e88';
  c.fillRect(x - 28, mark.y, 27, 2);
  c.fillRect(x + 441, mark.y, 27, 2);
 }
 const junctionSpacing = 1700;
 for (const feature of roadSceneFeatures(race.distance, top, bottom, 146)) {
  const junctionOffset = feature.world - Math.round(feature.world / junctionSpacing) * junctionSpacing;
  if (Math.abs(junctionOffset) < 98) continue;
  const city = themeAt(feature.y) === 1;
  const light = city || feature.id % 3 !== 0 ? 'lamp' : 'lantern';
  for (const [y, sidewalk] of [[feature.y, -14], [feature.y + 54, 454]]) {
   if (y >= top - 24 && y <= bottom + 24) {
    drawRoadsideSprite(c, light, left(y) + sidewalk, y, 39);
   }
  }
 }
 for (const junction of roadSceneFeatures(race.distance, top, bottom, junctionSpacing)) {
  if (junction.id === 0 || junction.y < top - 110 || junction.y > bottom + 110) continue;
  const y = junction.y, x = left(y);
  c.fillStyle = '#303a40';
  c.fillRect(0, y - 43, 600, 86);
  c.fillStyle = '#e8eceb';
  for (const edge of [-39, 29]) {
   for (let stripe = 0; stripe < 16; stripe++) {
    c.fillRect(x + Math.floor(stripe / 4) * 110 + 8 + (stripe % 4) * 23, y + edge, 14, 10);
   }
  }
  drawRoadsideSprite(c, 'signal', left(y - 63) - 13, y - 63, 42);
  drawRoadsideSprite(c, 'signal', left(y + 63) + 453, y + 63, 42);
 }

 const remaining=race.length-race.distance;if(race.mode!=='drive'&&remaining<520){const y=533-remaining*1.45;for(let r=0;r<2;r++)for(let i=0;i<28;i++){c.fillStyle=(i+r)%2?'#0b1220':'#fff';c.fillRect(left(y)+i*16,y+r*16,16,16);}}
 for(const z of race.zones){const x=race.screenX(z.lane,z.y);c.save();c.translate(x,z.y);c.rotate(race.roadAngle(z.lane,z.y));c.globalAlpha=z.used?.35:1;const g=c.createLinearGradient(0,40,0,-40);g.addColorStop(0,'#0a7cbf');g.addColorStop(1,'#53dcff');c.fillStyle=g;box(c,-50,-40,100,80,9);c.fill();c.strokeStyle='#a6f3ff';c.lineWidth=2;c.stroke();c.strokeStyle='#fff6a3';c.lineWidth=7;c.lineJoin='round';for(const y of [-20,4,28]){c.beginPath();c.moveTo(-28,y);c.lineTo(0,y-13);c.lineTo(28,y);c.stroke();}c.restore();}
 for(const r of race.ramps){const x=race.screenX(r.lane,r.y),g=c.createLinearGradient(0,r.y+26,0,r.y-26);g.addColorStop(0,'#d97706');g.addColorStop(1,'#fde047');c.fillStyle=g;box(c,x-22,r.y-26,44,52,6);c.fill();c.fillStyle='#2a1b09';c.textAlign='center';c.font='bold 11px sans-serif';c.fillText('▲ JUMP',x,r.y+4);}
 for(const coin of race.coins){const x=race.screenX(coin.lane,coin.y);c.save();c.translate(x,coin.y);c.scale(Math.max(.3,Math.abs(Math.cos(time*6+coin.y*.02))),1);c.fillStyle='#facc15';c.strokeStyle='#fef08a';c.lineWidth=2;c.beginPath();c.arc(0,0,12,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#854d0e';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText('₩',0,5);c.restore();}
 for (const b of race.roadblocks || []) {
  const x = race.screenX(b.lane, b.y);
  c.save();
  c.translate(x, b.y);
  c.rotate(race.roadAngle(b.lane, b.y));
  c.fillStyle = '#f8e5ba';c.fillRect(-38, -8, 76, 16);
  c.fillStyle = '#e34e46';
  for (let stripe = -30; stripe <= 30; stripe += 20) c.fillRect(stripe, -8, 10, 16);
  c.restore();
 }
 const player = race.vehiclePosition('player');
 const visible = race.groundVehicles().filter(car => car.y > top - 100 && car.y < bottom + 100);
 if (race.jump < 12) visible.push(player);
 visible.sort((a, b) => a.y - b.y);
 const drawVehicle = ({role, vehicle, x, y, width, length, angle, config}) => {
  const isPlayer = role === 'player';
  const isPatrol = role === 'police' && vehicle.kind === 'patrol';
  drawRaceCar(c, x, y, width, length, angle, config, {
   time, police: isPatrol, jump: isPlayer ? race.jump : 0,
   boost: isPlayer ? race.boosting : role === 'rival' && race.difficulty === 'hell',
   brake: isPlayer && input.brake
  });
  if (role === 'police' && vehicle.kind === 'tank') {
   c.save();c.translate(x, y);c.rotate(angle);
   c.fillStyle = '#35402c';box(c, -13, -12, 26, 27, 6);c.fill();
   c.fillStyle = '#bec696';c.fillRect(-3, -36, 6, 38);
   c.restore();
  }
 };
 for (const car of visible) drawVehicle(car);
 if (race.jump >= 12) drawVehicle(player);
 for (const helicopter of race.police.filter(car => car.kind === 'helicopter')) {
  const x = race.screenX(helicopter.lane, helicopter.y), y = helicopter.y;
  c.save();c.translate(x, y);
  c.fillStyle = '#13263655';box(c, -8, -12, 30, 43, 10);c.fill();
  c.translate(-8,-16);
  c.fillStyle = '#192e41';box(c, -13, -24, 26, 47, 10);c.fill();
  c.fillStyle = '#8edaff';box(c, -8, -16, 16, 13, 4);c.fill();
  c.rotate(time * 19);c.fillStyle = '#b9ddefbb';c.fillRect(-40, -1, 80, 2);c.fillRect(-1, -35, 2, 70);c.restore();
 }

 // Use a small marker beneath the player so sedans with similar paint remain identifiable.
 const markerY = player.y + 48 - race.jump * .35;
 c.fillStyle = race.invulnerable > 60 ? '#ffcb74' : '#8af4ff';
 c.beginPath();c.moveTo(player.x, markerY - 6);c.lineTo(player.x - 6, markerY + 3);
 c.lineTo(player.x + 6, markerY + 3);c.closePath();c.fill();
 if (race.mode === 'drive') {
  const x = player.x, y = markerY + 7;
  c.fillStyle = '#101e2ddd';box(c, x - 21, y, 42, 6, 3);c.fill();
  const barWidth = 40 * Math.max(0, race.hp) / 100;
  if (barWidth > 0) {
   c.fillStyle = race.hp > 35 ? '#80ed9b' : '#ff776d';
   box(c, x - 20, y + 1, barWidth, 4, 2);c.fill();
  }
 }

 if(race.boosting){c.strokeStyle='#bfedff55';c.lineWidth=2;for(let i=0;i<7;i++){const x=(i*97+time*13)%600,y=-shift+(i*233+time*1100)%viewHeight;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+48);c.stroke();}}
 c.restore();
}

export function carFaceFamily(car){return ['3_series','5_series','x5','x6m','xm','m8'].includes(car.id)?'bmw':['a5','a6','a7','q8','rs6','rs7','r8'].includes(car.id)?'audi':'mercedes';}
/** Draw the actual selected model as a front three-quarter original illustration.
 * Paint comes from the car record; all geometry stays inside the 1000×560 canvas.
 */
export function drawFrontCar(c,car){
 const row = CAR_SPRITES.indexOf(car.id);
 const reference = Object.hasOwn(referenceCars, car.id) ? referenceCars[car.id] : null;
 const atlas = referenceAtlases[reference?.sheet || 'base'];
 if (reference && spriteReady(atlas)) {
  const source = reference.portrait;
  const width = 910;
  const height = width * source[3] / source[2];
  const imageY = (560 - height) / 2;
  c.save();
  const base = 280 + height / 2 - 10;
  const shadow = c.createRadialGradient(500, base, 20, 500, base, 460);
  shadow.addColorStop(0, '#10182758');
  shadow.addColorStop(1, '#10182700');
  c.fillStyle = shadow;
  c.beginPath();
  c.ellipse(500, base, 470, 25, 0, 0, Math.PI * 2);
  c.fill();
  c.drawImage(atlas, ...source, (1000 - width) / 2, imageY, width, height);
  c.restore();
  return;
 }
 if (row >= 0 && spriteReady(photoAtlas)) {
  c.save();
  // The 318×190 image remains in proportion in both the shop and showroom.
  const shadow = c.createRadialGradient(500, 445, 30, 500, 445, 395);
  shadow.addColorStop(0, '#10182766');
  shadow.addColorStop(1, '#10182700');
  c.fillStyle = shadow;
  c.beginPath();c.ellipse(500, 445, 395, 37, 0, 0, Math.PI * 2);c.fill();
  c.drawImage(photoAtlas, 0, row * 190, 318, 190, 52, 12, 896, 896 * 190 / 318);
  c.restore();
  return;
 }

 const family=carFaceFamily(car),suv=car.bodyType==='suv',wagon=car.id==='rs6',sport=car.bodyType==='supercar'&&!wagon,coupe=car.bodyType==='coupe'||sport;
 const roof=suv?104:sport?151:125,backRoof=wagon?140:suv?142:coupe?177:160;
 const color=car.bodyColor||'#cbd5e1';
 const path=(points,fill,stroke,width=1)=>{c.beginPath();c.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))c.lineTo(x,y);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
 const line=(points,stroke,width=1)=>{c.beginPath();c.moveTo(points[0][0],points[0][1]);for(const [x,y] of points.slice(1))c.lineTo(x,y);c.strokeStyle=stroke;c.lineWidth=width;c.stroke();};
 const grad=(x0,y0,x1,y1,stops)=>{const g=c.createLinearGradient(x0,y0,x1,y1);for(const [at,col] of stops)g.addColorStop(at,col);return g;};
 c.save();
 // Floor reflection is translucent so the showroom can supply its own lighting.
 const shadow=c.createRadialGradient(485,403,20,485,403,440);shadow.addColorStop(0,'#19263388');shadow.addColorStop(.65,'#1827323b');shadow.addColorStop(1,'#14223100');c.fillStyle=shadow;c.beginPath();c.ellipse(485,403,440,44,0,0,Math.PI*2);c.fill();
 // The far rear wheel sits behind the body.
 const wheel=(x,y,rx,ry,front=false)=>{c.save();c.translate(x,y);c.rotate(.09);const tire=grad(-rx,0,rx,0,[[0,'#080d11'],[.5,'#2b3034'],[1,'#070b0f']]);c.fillStyle=tire;c.strokeStyle='#19242b';c.lineWidth=3;c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#9baab0';c.beginPath();c.ellipse(0,0,rx*.7,ry*.72,0,0,Math.PI*2);c.fill();c.fillStyle='#26343d';c.beginPath();c.ellipse(0,0,rx*.55,ry*.57,0,0,Math.PI*2);c.fill();c.save();c.scale(rx*.53,ry*.55);c.strokeStyle='#d4dce0';c.lineWidth=.12;for(let j=0;j<10;j++){const a=j*Math.PI/5;c.beginPath();c.moveTo(Math.cos(a)*.18,Math.sin(a)*.18);c.lineTo(Math.cos(a)*.92,Math.sin(a)*.92);c.stroke();}c.restore();c.fillStyle=front&&sport?'#d84c39':'#d6e0e2';c.beginPath();c.ellipse(0,0,rx*.18,ry*.19,0,0,Math.PI*2);c.fill();c.restore();};
 wheel(777,316,suv?38:34,suv?55:49);
 // The rear quarter and side silhouette are the selected car's paint colour.
 c.fillStyle=color;c.beginPath();c.moveTo(192,240);c.lineTo(270,207);c.lineTo(345,185);c.lineTo(393,roof+20);c.quadraticCurveTo(467,roof-8,593,roof+4);c.lineTo(692,backRoof);c.lineTo(786,194);c.quadraticCurveTo(855,200,875,236);c.lineTo(892,292);c.lineTo(873,333);c.lineTo(826,346);c.quadraticCurveTo(815,270,774,272);c.quadraticCurveTo(730,275,722,351);c.lineTo(535,381);c.quadraticCurveTo(528,293,474,296);c.quadraticCurveTo(424,298,411,383);c.lineTo(293,399);c.lineTo(174,381);c.lineTo(113,352);c.lineTo(111,296);c.quadraticCurveTo(117,263,145,255);c.closePath();c.fill();c.strokeStyle='#26323c';c.lineWidth=2.5;c.stroke();
 // Paint reflections on side, top shoulder and lower sill create 3-D depth.
 const side=grad(0,205,0,400,[[0,'#ffffff66'],[.24,'#ffffff16'],[.52,'#18272b22'],[.72,'#00000012'],[1,'#07101799']]);
 path([[348,247],[846,216],[875,251],[879,308],[845,330],[812,333],[799,296],[781,284],[754,286],[735,315],[726,346],[533,378],[526,330],[504,301],[474,296],[447,310],[428,354],[412,382],[340,384]],side);
 path([[135,265],[310,205],[500,207],[406,267],[320,289],[149,298]],grad(0,204,0,303,[[0,'#ffffffa0'],[.3,'#ffffff25'],[.7,'#ffffff08'],[1,'#16293455']]));
 // Roofline and the windshield/side glass are built separately in perspective.
 path([[272,210],[345,185],[393,roof+20],[487,roof+5],[555,roof+6],[627,backRoof-5],[695,backRoof+8],[783,195],[683,204],[517,207],[412,263]],color,'#b0c2c8',2);
 const glass=grad(0,roof,0,220,[[0,'#07121a'],[.5,'#344c59'],[1,'#071016']]);
 path([[311,207],[360,185],[399,roof+25],[489,roof+16],[516,202],[411,248]],glass,'#15222b',4);
 path([[500,roof+15],[552,roof+16],[621,backRoof+5],[644,backRoof+21],[534,195]],glass,'#12212a',3);
 path([[563,roof+18],[605,roof+20],[685,backRoof+19],[751,193],[655,194],[633,backRoof+21]],glass,'#15222b',3);
 // Window pillars, rim and fine highlights.
 line([[518,202],[534,195],[500,roof+15]],'#bac7ca',2);line([[643,backRoof+18],[655,194]],'#abbac0',3);line([[407,roof+31],[477,roof+22],[509,195]],'#eff8f944',4);
 if(suv||wagon){line([[406,roof+9],[490,roof-1],[575,roof+1]],'#85969c',4);line([[562,roof+2],[619,backRoof-7],[682,backRoof+5]],'#85969c',3);}
 // Sculpted shoulder, door seams, handles and side mirror.
 line([[421,258],[544,237],[683,221],[838,218]],'#f8ffff8c',3);line([[439,266],[534,252],[675,233],[840,230]],'#394d5466',1);
 line([[539,208],[556,303],[545,369]],'#14232b88',2);if(!coupe)line([[665,203],[683,287],[681,344]],'#14232b88',2);
 for(const [x,y] of coupe?[[594,235]]:[[590,235],[710,221]]){c.fillStyle='#0d1d2499';c.beginPath();c.ellipse(x,y,17,3,-.08,0,Math.PI*2);c.fill();c.strokeStyle='#e0ecebaa';c.lineWidth=1;c.stroke();}
 path([[488,215],[515,205],[532,210],[524,225],[501,229],[485,225]],color,'#1a2932',2);line([[494,216],[518,212]],'#fff9',2);
 if(car.id==='r8'){path([[677,233],[713,229],[731,322],[692,331]],'#111e25','#415159',2);for(let i=0;i<4;i++)line([[695+i*6,246],[704+i*6,313]],'#687b82',1);}
 // Wheel arches and detailed alloy wheels.
 c.strokeStyle='#10181c';c.lineWidth=suv?15:11;c.beginPath();c.ellipse(474,355,55,69,-.02,Math.PI,Math.PI*1.95);c.stroke();c.beginPath();c.ellipse(778,316,44,60,-.04,Math.PI,Math.PI*1.96);c.stroke();wheel(778,316,suv?34:31,suv?51:46);wheel(474,355,suv?44:40,suv?64:58,true);
 line([[533,374],[711,347]],'#c0caca88',2);line([[546,363],[711,335]],'#111b2288',3);
 // Front bumper, bonnet, grille and lights are individual brand signatures.
 path([[118,274],[202,243],[410,251],[422,278],[411,358],[343,391],[181,379],[111,347]],grad(110,260,390,380,[[0,'#ffffff88'],[.3,color],[.69,color],[1,'#18242e']]),'#28343a',2.5);
 path([[131,285],[201,264],[389,268],[398,305],[383,343],[326,366],[179,357],[131,339]],'#12202a','#607078',2);
 const grille=family==='bmw'?'bmw':family==='audi'?'audi':'mercedes';
 if(grille==='bmw'){
   path([[206,277],[255,274],[258,326],[210,336],[200,327]],'#071016','#a4b2b5',3);path([[264,274],[314,273],[322,320],[265,329]],'#071016','#a4b2b5',3);
   for(let x=213;x<254;x+=10)line([[x,281],[x+2,329]],'#6f7e83',2);for(let x=271;x<312;x+=10)line([[x,280],[x+2,322]],'#6f7e83',2);
   c.fillStyle='#d9e8eb';c.beginPath();c.ellipse(260,265,8,5,0,0,Math.PI*2);c.fill();c.fillStyle='#286b9b';c.beginPath();c.ellipse(260,265,5,3,0,0,Math.PI*2);c.fill();
 }else if(grille==='audi'){
   path([[198,276],[316,274],[332,287],[322,328],[266,341],[203,332],[190,293]],'#08121a','#acb9bc',3);for(let y=287;y<328;y+=9)line([[200,y],[322,y-2]],'#718083',2);
   c.strokeStyle='#dce8e8';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.ellipse(240+i*12,284,9,5,0,0,Math.PI*2);c.stroke();}
 }else{
   path([[196,280],[319,275],[333,286],[321,326],[260,339],[201,330],[190,292]],'#08121a','#a9b7b9',3);for(let y=288;y<328;y+=10)line([[200,y],[322,y-3]],'#60747b',2);
   c.strokeStyle='#dbe5e4';c.lineWidth=2;c.beginPath();c.ellipse(260,303,15,13,0,0,Math.PI*2);c.stroke();for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3;line([[260,303],[260+Math.cos(a)*13,303+Math.sin(a)*11]],'#e8f1ee',2);}
 }
 // Angled headlights and LED strips.
 path([[129,275],[193,260],[208,271],[190,286],[135,296]],'#13212a','#cddbe0',2);
 path([[335,265],[397,261],[408,274],[391,284],[341,286]],'#13212a','#cddbe0',2);
 line([[139,279],[184,270],[198,271]],'#e1f6ff',4);line([[345,276],[390,273],[400,269]],'#e1f6ff',4);
 if(family==='bmw'){line([[147,282],[158,274],[169,274],[176,269]],'#a9d9f4',2);line([[354,279],[365,273],[376,274],[383,269]],'#a9d9f4',2);}
 path([[138,313],[180,311],[185,339],[151,338]],'#111b22','#829195',1);path([[343,299],[391,292],[385,326],[350,337]],'#111b22','#829195',1);
 for(let k=0;k<3;k++){line([[145,318+k*6],[178,318+k*6]],'#586b70',1);line([[350,308+k*6],[387,302+k*6]],'#586b70',1);}
 path([[214,348],[311,347],[309,364],[218,365]],'#e8edf0','#7b8c91',1);c.fillStyle='#27333a';c.textAlign='center';c.font='bold 10px sans-serif';c.fillText(car.shortBadge,262,359);
 line([[118,349],[179,379],[294,394],[351,379]],'#e5eff0aa',3);
 c.restore();
}
