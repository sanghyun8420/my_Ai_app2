import { createApiFetcher } from './remote-api.js';
import { FRUITS, drawFruit, APPLE_LEVEL, WATERMELON_LEVEL, SECRET_LEVEL } from './fruits.js';
import { FruitWorld } from './physics.js';
import { drawSkinnedFruit, SKINS, skinFruitName } from './skins.js';
import { GardenProgress, ACHIEVEMENTS } from './profile.js';
import { GameSave } from './save-state.js';
import { fitNumericText, observeNumericText } from './number-fit.js';
import { loadPreferences, savePreferences } from './preferences.js';
import { GardenSocial } from './social.js';
import { BACKGROUNDS, BASKETS, ITEMS, HATS } from './catalog.js';
import { getCosmeticPalette, drawCosmeticBackdrop, drawBasketFrame } from './cosmetics.js';
import { GardenAudio } from './audio.js';
import { createHub, drawBuddy } from './hub.js';
import { mountPlayLayout } from './play-layout.js';

const $ = id => document.getElementById(id);
const canvas = $('game-canvas');
const ctx = canvas.getContext('2d');
const WIDTH = 600, HEIGHT = 720;
const MODES = [
  {id:'watermelon',name:'수박 파티',icon:'🍉',description:'수박부터 시작해 비밀 과일까지!'},
  {id:'timed',name:'120초 정원',icon:'⏱',description:'120초 동안 가장 높은 점수에 도전해요.'},
  {id:'challenge',name:'챌린지',icon:'🎯',description:'큰 과일부터 시작해 5,000점을 달성하세요.'},
  { id:'classic', name:'기본 정원', icon:'🍉', description:'통통 튀는 과일을 합쳐 비밀의 과일까지.' },
  { id:'apple', name:'사과 파티', icon:'🍎', description:'떨어지는 과일은 모두 사과! 커다란 합치기의 시작.' },
  { id:'free', name:'자유 흔들기', icon:'✳', description:'횟수 제한 없이, 원하는 만큼 흔들어보세요.' },
  { id:'water', name:'물의 정원', icon:'◉', description:'물결과 부력 속에서 과일이 둥실둥실.' },
  { id:'space', name:'우주 정원', icon:'✦', description:'무중력에서 떠다니며 만나는 과일들.' },
];
const MODE_HINTS={
  apple:{code:'apple',clue:'빨간 사과를 영어로! a로 시작하는 다섯 글자예요.'},
  free:{code:'shake',clue:'흔들다를 영어로! s로 시작하는 다섯 글자예요.'},
  water:{code:'water',clue:'물은 영어로 무엇일까요? w로 시작하는 다섯 글자예요.'},
  space:{code:'gravity',clue:'뉴턴의 사과를 떨어뜨린 힘, 중력을 영어로! g로 시작하는 일곱 글자예요.'},
};
const COLOR_PRESETS=[
  {name:'복숭아',page:'#ffe5ec',board:'#fff1f5'},
  {name:'민트',page:'#d7f2e6',board:'#effbf4'},
  {name:'하늘',page:'#dfefff',board:'#f0f8ff'},
  {name:'라벤더',page:'#e9e3ff',board:'#f7f3ff'},
  {name:'밤하늘',page:'#172436',board:'#182b3d'},
];
let preferences = loadPreferences();
let activeMode = 'classic', totalShakes = 0, eraseMode = false, selectedFruitId = null;
let hub=null,selectedGame='suika',arcadePlaying=false,wasSuikaPlaying=false,resetModeOnReturn=false;
let seedState = (Date.now() >>> 0) || 1;

let checkpointDirty = false, checkpointBusy = false, social = null;
let roomElapsed = 0;
let palette = { background:'#fffdf3', dots:'#dce3cc', line:'#b9c3a3', text:'#8f9e7c' };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let best = 0;
try { best = Math.max(0, Number(localStorage.getItem('suika-garden-best')) || 0); } catch {}
$('best-score').textContent = best.toLocaleString('ko-KR');
let started = false, activeLevel = 0, nextLevel = 0, aimX = WIDTH / 2;
let shakeReadyAt = 0, danger = 0, lastFrame = 0;
let specialShakeRewards=0;
const discoveredLevels=new Set();
const TOOL_COOLDOWNS = { eraser:1, calm:5 };
let toolReadyAt = Object.fromEntries(Object.keys(TOOL_COOLDOWNS).map(id => [id, 0]));
let activeSpecial = false, nextSpecial = false, dropCount = 0, itemCount = 0;
let secretDiscovered = false;
try { secretDiscovered = localStorage.getItem('suika-garden-secret') === 'yes'; } catch {}
if(secretDiscovered)discoveredLevels.add(SECRET_LEVEL);
let particles = [], floaters = [], maxLevel = 0, watermelonMade = false;
let soundEnabled = preferences.sound, toastTimer;
const gameAudio = new GardenAudio();
gameAudio.configure(preferences);
let roundCleared = 0, roundCredited = false, starting = false, settlement = null, pausedByDialog = false;
let currentSkin = 'classic', currentBackground = 'default', currentBasket = 'classic', progressReady = false;
let shopCategory = 'skins', commerceBusy = false, inventoryBusy = false, erasingBusy = false;
let reviveBusy = false, recoveryAckBusy = false;
let animationTime = 0;
const animatedIcons = new Set();
const achievementPending = new Set();
const gameSave = new GameSave();
let resumeAvailable = false, saveElapsed = 0, saveDirty = false;
const progressStore = new GardenProgress({ onChange: renderProfile, onError: error => toast(error.message || '기록을 저장하지 못했어요') });

const world = new FruitWorld({
  width: WIDTH, height: HEIGHT, fruits: FRUITS,
  random: mergeRandom,
  onMerge(event) {
    saveDirty = true;
    checkpointDirty = true;
    roundCleared += 2;
    updateGemProgress();
    updateScore();
    const { x, y, level, points, combo, specialMerged } = event;
    if(currentSkin==='royalGem')progressStore.creditGemMerge(event.mergeId,level>=10?10:1).catch(error=>toast(error.message));
    if(level===FRUITS.length-1){world.blast={x,y};for(let i=0;i<60;i++){const a=i*Math.PI/30;particles.push({x,y,vx:Math.cos(a)*240,vy:Math.sin(a)*240,life:1.5,maxLife:1.5,color:`hsl(${i*6} 75% 62%)`,r:3+i%5});}}
    hub?.merge(event);
    if(world.score>=10000&&world.score-points<10000)setTimeout(()=>hub?.share(canvas,'10,000점 돌파!',world.score,level),180);
    recordDiscovery(level);
    unlockAchievement('firstMerge');
    if (world.score >= 1000) unlockAchievement('score1000');
    if (world.score >= 10000) unlockAchievement('score10000');
    if (specialMerged) {
      specialShakeRewards++;
      const reward=progressStore.specialReward(specialShakeRewards);toast(`✦ 특별 사과! ${reward==='shake'?'흔들기':'지우개'} 1개를 얻었어요`,3200);
      floaters.push({ x, y: y - 65, text: reward==='shake'?'✦ SHAKE +1':'✦ ERASER +1', life: 1.6 });
    }
    if (!reducedMotion) {
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        particles.push({ x, y, vx: Math.cos(angle) * (45 + Math.random() * 70), vy: Math.sin(angle) * 80 - 35, life: .65, maxLife: .65, color: FRUITS[level].color, r: 2 + Math.random() * 3 });
      }
    }
    floaters.push({ x, y: y - FRUITS[level].radius, text: combo > 1 ? `+${points} · ${combo} COMBO` : `+${points}`, life: 1 });
    playSound(specialMerged ? 'special' : 'merge', level);
    if (level > maxLevel) {
      maxLevel = level;
      renderEvolution();
    }
    if (level === WATERMELON_LEVEL && !watermelonMade) {
      watermelonMade = true;
      unlockAchievement('watermelon');
      toast('수박 완성! 수박 두 개를 합치면 비밀이 열려요 🍉', 4500);
      $('game-status').textContent = '수박이 자란 행복한 정원';
    }
    if (level === SECRET_LEVEL) {
      secretDiscovered = true;
      unlockAchievement('secret');
      try { localStorage.setItem('suika-garden-secret', 'yes'); } catch {}
      renderEvolution();
      toast('용과 발견! 이제 스타프루트와 망고스틴에 도전해요', 5000);
      $('game-status').textContent = '용과 너머, 새로운 열매를 향해';
      $('goal-label').textContent = '다음 목표 · 태양의 열매';
    }
    if (level > SECRET_LEVEL) {
      toast(`${FRUITS[level].name} 완성!`, 3500);
      $('goal-label').textContent = level === FRUITS.length - 1 ? '태양의 열매 발견 완료!' : `다음 목표 · ${FRUITS[level + 1].name}`;
    }
  },
  onDanger(value) {
    danger = value;
    $('danger-message').hidden = value < .1;
    if (value >= .1) $('danger-message').textContent = '과일이 MAX 선을 넘었어요';
  },
  onGameOver() {
    gameAudio.setPlaying(false);
    eraseMode = false; selectedFruitId = null;
    showGameOver();
    playSound('over');
    updateScore();
    checkpointDirty = true;
    saveGame();
    if (social?.user) social.updateGame({ score:world.score,fruitCount:world.bodies.length,playing:false });
    if (social?.user && activeMode==='classic') social.saveScore(world.score,activeMode).catch(error=>toast(error.message));
  },
});
function fruitIcon(level, size = 64, special = false) {
  const icon = document.createElement('canvas');
  icon.width = icon.height = size * 2;
  icon.style.width = `${size}px`;
  icon.style.height = `${size}px`;
  const context = icon.getContext('2d');
  context.scale(2, 2);
  drawSkinnedFruit(context, level, size / 2, size / 2 + 2, size * .43, 0, 1, special, .7, currentSkin);
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-label', special ? '반짝이는 사과' : skinFruitName(level,currentSkin));
  if (special) animatedIcons.add({ icon, size, level });
  return icon;
}

function renderEvolution() {
  $('evolution-grid').replaceChildren();
  FRUITS.forEach((fruit, level) => {
  const locked=level>=10&&!discoveredLevels.has(level);
  const cell = document.createElement('div');
  cell.className = 'evo-fruit';
  if (level === maxLevel && maxLevel > 0) cell.classList.add('active');
  cell.title = `${level + 1}단계 · ${locked?'???':skinFruitName(level,currentSkin)}`;
  if(locked){const mark=document.createElement('b');mark.textContent='?';cell.append(mark);}else cell.append(fruitIcon(level, 32));
  const label = document.createElement('span');
  label.className='evo-name';label.textContent = locked?'???':skinFruitName(level,currentSkin);
  const number = document.createElement('small');number.className='evo-level';number.textContent = String(level + 1).padStart(2,'0');
  cell.append(number,label);
  $('evolution-grid').append(cell);
  });
  $('goal-label').textContent = secretDiscovered ? '용과 너머 태양의 열매까지' : '수박 다음엔 어떤 과일이?';
}

function recordDiscovery(level){
  if(discoveredLevels.has(level))return;
  discoveredLevels.add(level);checkpointDirty=true;saveDirty=true;renderEvolution();
}

function runExtras(){return {specialShakeRewards,discoveredLevels:[...discoveredLevels]};}
renderEvolution();

function drawWelcome() {
  const art = document.createElement('canvas');
  art.width = 520; art.height = 370;
  const c = art.getContext('2d');
  c.scale(2, 2);
  c.fillStyle = '#e4e9cf';
  c.beginPath(); c.ellipse(132, 158, 106, 12, 0, 0, Math.PI * 2); c.fill();
  drawFruit(c, WATERMELON_LEVEL, 140, 91, 72, -.12);
  drawFruit(c, 3, 58, 126, 43, -.23);
  drawFruit(c, APPLE_LEVEL, 207, 133, 38, .19, 1, true, .7);
  drawFruit(c, 0, 64, 55, 19, -.3);
  c.fillStyle = '#bac79e';
  [[27,75,2],[230,58,3],[208,24,2],[90,18,2],[238,106,1.5],[20,130,2]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();});
  c.strokeStyle = '#a6b78b'; c.lineWidth = 1.5; c.lineCap='round';
  c.beginPath(); c.moveTo(25,37); c.lineTo(25,49); c.moveTo(19,43); c.lineTo(31,43); c.moveTo(238,23); c.lineTo(238,33); c.moveTo(233,28); c.lineTo(243,28); c.stroke();
  $('welcome-art').append(art);
}
drawWelcome();

function updateNext() {
  $('next-fruit').replaceChildren(fruitIcon(nextLevel, 64, nextSpecial));
  $('next-fruit').classList.toggle('special-preview', nextSpecial);
  $('next-name').textContent = nextSpecial ? '✦ 반짝이는 사과' : skinFruitName(nextLevel,currentSkin);
}
updateNext();

function randomFruit() {
  if (activeMode === 'apple') return APPLE_LEVEL;
  if(activeMode==='watermelon')return WATERMELON_LEVEL;
  if(activeMode==='challenge')return 2+Math.floor(mergeRandom()*4);
  const pool = [0, 0, 0, 1, 1, 2, 2, 3];
  return pool[Math.floor(gameRandom() * pool.length)];
}

function gameRandom() {
  seedState = (seedState + 0x6d2b79f5) >>> 0;
  let x = seedState;
  x = Math.imul(x ^ x >>> 15, x | 1);
  x ^= x + Math.imul(x ^ x >>> 7, x | 61);
  return ((x ^ x >>> 14) >>> 0) / 4294967296;
}

function mergeRandom() {
  // The independent merge draw keeps the common room's drop sequence identical.
  let x=(seedState ^ Math.imul(world.nextId,0x9e3779b1) ^ world.tick) >>> 0;
  x=Math.imul(x ^ x>>>16,0x85ebca6b);x=Math.imul(x ^ x>>>13,0xc2b2ae35);
  return ((x ^ x>>>16) >>> 0) / 4294967296;
}

function updateScore() {
  $('score').textContent = world.score.toLocaleString('ko-KR');
  const classic=activeMode==='classic';
  const recorded=classic?progressStore.profile.bestScore:progressStore.profile.modeBestScores[activeMode];
  best = Math.max(recorded,world.score);
  $('best-score').textContent = best.toLocaleString('ko-KR');
  $('score-label').textContent=classic?'지금 점수':'모드 점수';
  $('best-score-label').textContent=classic?'최고 기록':'모드 최고';
  if(classic){try { localStorage.setItem('suika-garden-best', String(best)); } catch {}}
  fitNumericText($('score'));
  fitNumericText($('best-score'));
}

async function startGame(options = {}) {
  if (starting || erasingBusy || inventoryBusy || reviveBusy) return;
  ensureAudio();
  starting = true;
  if (started && world.state === 'playing') world.state = 'paused';
  try {
    if (!progressReady) await progressInitialization;
    if(progressStore.getPendingRevival())await completeRevivalRecovery();
    if (started) await settleRun();
    if (social?.room && options.mode && options.mode !== social.room.mode) await social.leaveRoom();
    const targetMode=MODES.some(mode => mode.id === options.mode) ? options.mode : social?.room?.mode || activeMode;
    await progressStore.startRun({ fresh: true,mode:targetMode });
  activeMode = targetMode;
  seedState = Number.isInteger(options.seed) ? options.seed >>> 0 : social?.room ? social.room.seed >>> 0 : (Date.now() >>> 0) || 1;
  started = true;
  world.reset();
  world.setMode(activeMode);
  activeLevel = activeMode === 'apple' ? APPLE_LEVEL : activeMode==='watermelon'?WATERMELON_LEVEL:activeMode==='challenge'?3:0; nextLevel = activeLevel; aimX = WIDTH / 2;
  specialShakeRewards=0;shakeReadyAt = 0; maxLevel = 0; watermelonMade = false;
  toolReadyAt = Object.fromEntries(Object.keys(TOOL_COOLDOWNS).map(id => [id, 0]));
  activeSpecial = false; nextSpecial = false; dropCount = 0; itemCount = 0;
  totalShakes = 0;
  roundCleared = 0; roundCredited = false; settlement = null;
  eraseMode = false; selectedFruitId = null; checkpointDirty = false;
  resumeAvailable = false; resetWelcome();
  particles = []; floaters = [];
  $('start-screen').hidden = true;
  $('game-overlay').hidden = true;
  $('run-gems').textContent = '';
  $('game-status').textContent = '첫 과일을 톡, 떨어뜨려보세요';
  document.querySelectorAll('.evo-fruit').forEach(el => el.classList.remove('active'));
  updateNext(); updateScore(); updateShake(); updateItem();
  canvas.focus({ preventScroll: true });
  playSound('drop');
    applyTheme(); updateModeLabel();
    updateGemProgress();
    saveGame();
  } catch (error) {
    if (roundCredited || progressStore.pendingRun?.finished) resetToWelcome();
    else if (started && world.state === 'paused' && !document.querySelector('dialog[open]')) world.state = 'playing';
    toast(error.message || '새 게임을 준비하지 못했어요');
  }
  finally { starting = false; }
}

function drop() {
  if (!started || inventoryBusy || erasingBusy || reviveBusy || $('help-dialog').open || world.state !== 'playing') return;
  if (world.drop(activeLevel, aimX, { special: activeSpecial })) {
    recordDiscovery(activeLevel);
    dropCount++;
    activeLevel = nextLevel;
    activeSpecial = nextSpecial;
    nextSpecial = activeMode!=='watermelon'&&(dropCount + 2) % 20 === 0;
    nextLevel = nextSpecial ? APPLE_LEVEL : randomFruit();
    const radius = FRUITS[activeLevel].radius;
    aimX = Math.max(radius + 8, Math.min(WIDTH - radius - 8, aimX));
    updateNext();
    $('game-status').textContent = activeSpecial ? '✦ 오늘은 반짝이는 열매가 찾아왔어요' : watermelonMade ? '수박이 자란 행복한 정원' : '같은 과일끼리 만나게 해주세요';
    playSound('drop');
    saveGame();
  } else if (activeMode === 'space' && world.spaceCrowded) {
    toast('우주가 북적여요! 같은 과일을 만나게 하거나 지우개를 써보세요.');
  }
}

async function shake() {
  if (!started || world.state!=='playing' || inventoryBusy || commerceBusy || erasingBusy || reviveBusy || (activeMode !== 'free' && progressStore.profile.inventory.shake <= 0) || world.time < shakeReadyAt || document.querySelector('dialog[open]')) return;
  if (!world.bodies.length) { toast('과일을 먼저 떨어뜨려주세요'); return; }
  inventoryBusy=true;updateShake();updateInventory();
  try{
  if(activeMode!=='free'){
    const result=await progressStore.consumeItem('shake');
    if(!result.used)return;
  }
  if (!world.shake()) return;
  shakeReadyAt = world.time + (activeMode === 'free' ? .12 : 5);
  totalShakes++;
  if (totalShakes >= 10) unlockAchievement('shake10');
  if (!reducedMotion) {
    $('board-shell').classList.remove('shake-animation');
    void $('board-shell').offsetWidth;
    $('board-shell').classList.add('shake-animation');
  }
  playSound('shake');
  pulseTool('shake');
  const remaining=progressStore.profile.inventory.shake;
  toast(activeMode === 'free' ? '마음껏 흔들어보세요! 횟수 제한이 없어요.' : remaining ? `와르르! 흔들기 ${remaining}개가 남았어요` : '와르르! 보석이나 특별 사과로 흔들기를 더 모아보세요');
  updateShake();
  saveGame();
  }catch(error){toast(error.message);}
  finally{inventoryBusy=false;updateShake();updateInventory();renderShop();}
}

function updateShake() {
  const shakes=progressStore.profile.inventory.shake;
  const cooldown = Math.max(0, Math.ceil(shakeReadyAt - world.time - 1e-6));
  $('shake-count').textContent = activeMode === 'free' ? '∞' : String(shakes);
  $('shake-button').disabled = !started || inventoryBusy || commerceBusy || erasingBusy || reviveBusy || world.state !== 'playing' || !world.bodies.length || (activeMode !== 'free' && shakes === 0) || world.time < shakeReadyAt;
  $('shake-button').setAttribute('aria-label', activeMode === 'free' ? '횟수 제한 없이 흔들기' : cooldown && shakes ? `흔들기 ${cooldown}초 후 사용 가능` : `흔들기 ${shakes}회 남음`);
}

function updateItem() {
  const total = itemCount + progressStore.profile.inventory.eraser;
  if ($('item-count').textContent !== String(total)) $('item-count').textContent = String(total);
  $('item-button').disabled = !started || inventoryBusy || (world.state !== 'playing' && !eraseMode) || total < 1 || !world.bodies.length || erasingBusy || (!eraseMode && world.time < toolReadyAt.eraser);
  $('item-button').setAttribute('aria-label', `선택 지우개, ${total}개 보유. 없앨 과일 하나를 선택하세요`);
  $('item-tray').classList.toggle('item-ready', started && total > 0);
  $('item-tray').classList.toggle('selecting', eraseMode);
  $('erase-cancel').hidden = !eraseMode;
  $('erase-cancel').disabled = erasingBusy;
}

function useItem() {
  if (eraseMode) { cancelErase(); return; }
  if (!started || inventoryBusy || erasingBusy || world.time < toolReadyAt.eraser || world.state !== 'playing' || itemCount + progressStore.profile.inventory.eraser < 1 || !world.bodies.length || document.querySelector('dialog[open]')) return;
  eraseMode = true; world.state = 'paused'; selectedFruitId = world.bodies[0].id;
  $('game-status').textContent = '지울 과일을 톡! · 방향키로 선택하고 Enter로 지울 수도 있어요';
  updateItem();
}

function cancelErase() {
  if (!eraseMode || erasingBusy) return;
  eraseMode = false; selectedFruitId = null;
  if (world.state === 'paused' && !document.querySelector('dialog[open]')) world.state = 'playing';
  if (!document.querySelector('dialog[open]')) pausedByDialog = false;
  $('game-status').textContent = '같은 과일끼리 만나게 해주세요';
  updateItem();
}

async function eraseSelected() {
  if (!eraseMode || erasingBusy || selectedFruitId === null || !world.bodies.some(body => body.id === selectedFruitId)) return;
  erasingBusy = true; updateItem();
  const targetId = selectedFruitId;
  try {
  const fromBonus = itemCount > 0;
  if (!fromBonus) {
    const result = await progressStore.consumeItem('eraser');
    if (!result.used) { toast('가방에 지우개가 없어요. 위쪽 상점에서 구매할 수 있어요.'); return; }
  }
  world.state = 'playing';
  const body = world.removeFruit(targetId);
  if (!body) { world.state = 'paused'; return; }
  eraseMode = false; selectedFruitId = null;
  roundCleared++;
  checkpointDirty = true;
  updateGemProgress();
  if (fromBonus) itemCount--;
  toolReadyAt.eraser = world.time + TOOL_COOLDOWNS.eraser;
  pausedByDialog = false;
  if (!reducedMotion) {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      particles.push({ x:body.x, y:body.y, vx:Math.cos(a)*85, vy:Math.sin(a)*85-40, life:.8, maxLife:.8, color:'#dfb456', r:3 });
    }
  }
  playSound('eraser');
  pulseTool('eraser');
  toast('✦ 선택한 과일 하나를 지웠어요!');
  $('game-status').textContent = '같은 과일끼리 만나게 해주세요';
  updateItem();
  saveGame();
  } catch (error) { toast(error.message); }
  finally { erasingBusy = false; updateItem(); updateInventory(); }
}

function toast(message, duration = 2200) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), duration);
}

function recordCleanup(removed) {
  roundCleared += removed.length;checkpointDirty=true;saveDirty=true;
  updateGemProgress();
  if (!reducedMotion) for (const body of removed) for(let i=0;i<8;i++) {
    const a=i/8*Math.PI*2;
    particles.push({x:body.x,y:body.y,vx:Math.cos(a)*90,vy:Math.sin(a)*90-35,life:.7,maxLife:.7,color:FRUITS[body.level].color,r:3});
  }
}

function showGameOver() {
  $('start-screen').hidden=true;$('game-overlay').hidden=false;
  $('final-score').innerHTML=`${world.score.toLocaleString('ko-KR')} <small>점</small>`;
  fitNumericText($('final-score'));
  $('game-status').textContent='게임 오버 · 다시 한 번 도전해요';
  $('danger-message').hidden=true;
  updateShake();updateItem();updateRevive();
  $('play-again').focus({preventScroll:true});
}

function updateRevive() {
  const gems=progressStore.profile.gems;
  const available=started&&world.state==='over'&&!(activeMode==='timed'&&world.time>=120)&&!roundCredited&&!reviveBusy&&!starting&&world.bodies.length>=3&&gems>=10;
  $('revive-button').disabled=!available;
  $('revive-button').textContent=reviveBusy?'준비 중…':'💎 10 · 이어하기';
  $('revive-note').textContent=reviveBusy?'이어갈 정원을 안전하게 저장하고 있어요':world.bodies.length<3?'이어가려면 과일이 3개 이상 필요해요':gems<10?`보석 ${10-gems}개가 더 필요해요 · 보유 ${gems.toLocaleString('ko-KR')}개`:'점수는 그대로 · 이어서 3초 동안 안전해요';
  if(world.state==='over')$('run-gems').textContent=`이번 판 과일 ${roundCleared}개 정리 · 모은 보석 ${progressStore.pendingRun?.earnedGems||0}개`;
}

async function reviveGame() {
  if(reviveBusy||inventoryBusy||erasingBusy||starting||!started||roundCredited||world.state!=='over'||(activeMode==='timed'&&world.time>=120)||world.bodies.length<3||progressStore.profile.gems<10)return;
  reviveBusy=true;updateRevive();
  try {
    const candidate=new FruitWorld({width:WIDTH,height:HEIGHT,fruits:FRUITS});
    if(!candidate.restore(world.serialize()))throw new Error('이어갈 정원을 준비하지 못했어요.');
    const removed=candidate.removeSmallest(3);
    if(removed.length!==3||!candidate.revive())throw new Error('이어갈 과일이 부족해요.');
    const snapshot={...gameRecord(),world:candidate.serialize(),roundCleared:roundCleared+removed.length};
    const runId=progressStore.pendingRun.id;
    const requestId=`revive-${runId}-${world.tick}`;
    const result=await progressStore.purchaseRevival({requestId,runId,score:world.score,mergedFruits:snapshot.roundCleared,snapshot});
    const recovery=result.recovery;
    if(!recovery||!world.restore(recovery.snapshot.world))throw new Error('복원할 정원을 찾지 못했어요. 다시 들어오면 자동 복구해요.');
    roundCleared=recovery.snapshot.roundCleared;
    particles=[];floaters=[];checkpointDirty=false;saveDirty=true;
    $('game-overlay').hidden=true;pausedByDialog=false;
    $('game-status').textContent='다시 열린 정원 · 3초 안전 보호';
    if(gameSave.write(recovery.snapshot))await progressStore.acknowledgeRevival(recovery.requestId);
    toast('작은 과일 3개를 정리했어요. 이어서 가꿔보세요!');
    playSound('revive');updateGemProgress();updateScore();canvas.focus({preventScroll:true});
  }catch(error){toast(error.message||'이어가기를 준비하지 못했어요.');}
  finally{reviveBusy=false;updateRevive();updateInventory();}
}

function updateGemProgress() {
  const saved = progressStore.profile.mergedFruits;
  const pending = started && !roundCredited ? Math.max(0, roundCleared - (progressStore.pendingRun?.creditedFruits || 0)) : 0;
  const progress = (saved + pending) % 20;
  $('gem-balance').title=`다음 보석까지 과일 ${20-progress}개`;
}

function settleRun() {
  if (!started || !progressStore.pendingRun) return Promise.resolve();
  if (settlement) return settlement;
  const cleared = roundCleared;
  settlement = progressStore.finishRun(world.score, cleared,runExtras()).then(result => {
    roundCredited = true;
    const earned = result.runEarnedGems ?? result.earnedGems;
    $('run-gems').textContent = earned > 0 ? `◆ 이번 판 보석 ${earned}개를 모았어요!` : `과일 ${cleared}개 정리 · 다음 보석에 한 걸음 더!`;
    updateGemProgress();
    if (progressStore.storageAvailable) gameSave.clear();
    saveDirty = false; saveElapsed = 0;
    $('save-status').textContent = progressStore.storageAvailable ? '이번 판의 기록을 저장했어요' : '기록을 저장하지 못해 이전 저장 상태를 유지했어요';
    if (social?.user && activeMode === 'classic') social.saveScore(world.score, activeMode).catch(error => toast(error.message));
    return result;
  }).catch(error => { settlement = null; throw error; });
  return settlement;
}

function renderProfile() {
  const profile = progressStore.profile;
  const discoveredBefore=discoveredLevels.size;
  for(const level of profile.discoveredLevels)discoveredLevels.add(level);
  const skinChanged = currentSkin !== profile.equippedSkin;
  const sceneChanged = currentBackground !== profile.equippedBackground || currentBasket !== profile.equippedBasket;
  currentSkin = profile.equippedSkin;
  currentBackground = profile.equippedBackground; currentBasket = profile.equippedBasket;
  $('gem-count').textContent = profile.gems.toLocaleString('ko-KR');
  $('shop-gems').textContent = `💎 ${profile.gems.toLocaleString('ko-KR')}`;
  fitNumericText($('gem-count'));
  fitNumericText($('shop-gems'));
  $('equipped-name').textContent = SKINS.find(skin => skin.id === currentSkin)?.name || '과일';
  updateScore(); updateGemProgress(); renderShop();
  if (skinChanged||discoveredBefore!==discoveredLevels.size)renderEvolution();
  if (skinChanged) updateNext();
  updateShake();
  if (sceneChanged) applyTheme();
  updateItem(); updateInventory();
  updateRevive();
  renderAchievements();
}

function renderShop(force = false) {
  if (!force && !$('shop-dialog').open) return;
  const profile = progressStore.profile;
  const info = {
    skins:{ catalog:SKINS, owned:profile.ownedSkins, equipped:profile.equippedSkin, description:'같은 과일도 새로운 모습으로! 구매한 스킨은 계속 사용할 수 있어요.' },
    backgrounds:{ catalog:BACKGROUNDS, owned:profile.ownedBackgrounds, equipped:profile.equippedBackground, description:'노을·숲·바다·별밤 중 오늘의 정원 분위기를 골라보세요.' },
    baskets:{ catalog:BASKETS, owned:profile.ownedBaskets, equipped:profile.equippedBasket, description:'바구니에 새 테두리를 입혀주세요. 구매한 꾸미기는 계속 보관돼요.' },
    items:{catalog:HATS,owned:profile.ownedHats,equipped:profile.equippedHat,description:'점수판 위 쫄라맨을 꾸며 주세요. 도구는 바구니 옆에서 바로 구매해요.'},
  };
  const section = info[shopCategory];
  $('shop-description').textContent = section.description;
  $('skin-grid').setAttribute('aria-labelledby', `shop-tab-${shopCategory}`);
  for (const category of Object.keys(info)) {
    const tab = $(`shop-tab-${category}`); tab.setAttribute('aria-selected', String(category === shopCategory));
    tab.tabIndex = category === shopCategory ? 0 : -1;
  }
  $('skin-grid').replaceChildren();
  section.catalog.forEach(item => {
    const card = document.createElement('article'); card.className='shop-card skin-card';
    const isHat=shopCategory==='items',isItem=false;
    const owned = !isItem && section.owned.includes(item.id), equipped = !isItem && section.equipped === item.id;
    if (equipped) card.classList.add('skin-selected');
    if (isItem) {
      card.classList.add('item-card');
      const icon=document.createElement('span');icon.className='item-icon';icon.textContent=item.icon;card.append(icon);
    } else {
      const art=document.createElement('canvas');art.width=400;art.height=230;art.className='cosmetic-preview';art.setAttribute('aria-hidden','true');
      const c=art.getContext('2d');c.scale(2,2);
      const background=shopCategory==='backgrounds'?item.id:currentBackground;
      const basket=shopCategory==='baskets'?item.id:currentBasket;
      drawCosmeticBackdrop(c,background,200,115,0,preferences.theme);
      const skin=shopCategory==='skins'?item.id:currentSkin;
      if(isHat){drawBuddy(c,item.id,90,66,1.45);}else if(item.id==='mystery'&&!owned){c.font='bold 46px sans-serif';c.fillStyle='#6d6254';c.fillText('???',65,80);}else{drawSkinnedFruit(c,1,48,77,24,-.1,1,false,0,skin);
      drawSkinnedFruit(c,4,107,66,34,0,1,false,0,skin);
      drawSkinnedFruit(c,2,158,78,24,.1,1,false,0,skin);}
      drawBasketFrame(c,basket,200,115,0);card.append(art);
    }
    const title=document.createElement('h3');title.textContent=item.id==='mystery'&&owned?'문드러진 열매':item.name;
    const description=document.createElement('p');description.textContent=item.description||'점수판 위 쫄라맨에게 씌워요.';
    const price=document.createElement('span');price.className='skin-price';price.textContent=item.price?`◆ ${item.price}`:'기본 제공';
    card.append(title,description,price);
    if (isItem) {
      const stock=document.createElement('span');stock.className='item-stock';
      stock.textContent=`보유 ${profile.inventory[item.id]+(item.id==='eraser'?itemCount:0)}개`;
      const actions=document.createElement('div');actions.className='item-actions';
      const buy=document.createElement('button');buy.type='button';buy.className='skin-buy';
      buy.textContent=profile.inventory[item.id]>=999?'가방이 가득해요':profile.gems<item.price?`보석 ${item.price-profile.gems}개 더 필요`:'1개 구매';
      buy.disabled=commerceBusy||inventoryBusy||profile.gems<item.price||profile.inventory[item.id]>=999;
      buy.addEventListener('click',()=>purchaseShopItem('items',item));
      const use=document.createElement('button');use.type='button';use.className='secondary-button';
      const availability=inventoryAvailability(item.id);
      use.textContent=availability.ok?'지금 사용':availability.reason;
      use.disabled=!availability.ok||commerceBusy||inventoryBusy;
      use.addEventListener('click',()=>useInventoryItem(item.id));
      actions.append(buy,use);card.append(stock,actions);
    } else {
      const button=document.createElement('button');button.type='button';button.className='skin-buy';
      button.textContent=equipped?'사용 중 ✓':owned?'사용하기':profile.gems<item.price?`보석 ${item.price-profile.gems}개 더 필요`:'구매하고 사용';
      button.disabled=commerceBusy||inventoryBusy||equipped||(!owned&&profile.gems<item.price);
      button.addEventListener('click',()=>purchaseShopItem(shopCategory,item));card.append(button);
    }
    $('skin-grid').append(card);
  });
}

async function purchaseShopItem(category, item) {
  if (commerceBusy || inventoryBusy || erasingBusy) return;
  commerceBusy=true;renderShop();
  try {
    if (category==='skins') { await progressStore.buySkin(item.id);await progressStore.equipSkin(item.id); }
    else if (category==='backgrounds') {
      await progressStore.buyBackground(item.id);await progressStore.equipBackground(item.id);
      preferences=savePreferences({...preferences,boardColor:null});applyTheme();
    }
    else if (category==='baskets') { await progressStore.buyBasket(item.id);await progressStore.equipBasket(item.id); }
    else { await progressStore.buyHat(item.id); }
    toast(category==='items'?`${item.name} 모자를 적용했어요!`:`${item.name} 꾸미기를 적용했어요!`);
  } catch(error) { toast(error.message); }
  finally { commerceBusy=false;renderShop();updateInventory();saveGame(); }
}

function inventoryAvailability(id) {
  if (!ITEMS.some(item => item.id === id)) return {ok:false,reason:'알 수 없는 도구'};
  const stock=progressStore.profile.inventory[id]+(id==='eraser'?itemCount:0);
  if (stock<1) return {ok:false,reason:'보유 아이템 없음'};
  if (!started||roundCredited||world.state==='over'||resumeAvailable) return {ok:false,reason:'플레이 중 사용'};
  const cooldown = Math.ceil((toolReadyAt[id] || 0) - world.time - 1e-6);
  if (cooldown>0) return {ok:false,reason:`${cooldown}초 후 사용`};
  if (id==='eraser'&&!world.bodies.length) return {ok:false,reason:'과일이 필요해요'};
  if (id==='shake'&&(activeMode==='free'||world.time<shakeReadyAt||!world.bodies.length)) return {ok:false,reason:activeMode==='free'?'이미 무제한이에요':!world.bodies.length?'과일이 필요해요':`${Math.ceil(shakeReadyAt-world.time)}초 후 사용`};
  if (id==='calm'&&world.bodies.length<3) return {ok:false,reason:'과일 3개가 필요해요'};
  return {ok:true,reason:''};
}

function updateInventory() {
  const inventory=progressStore.profile.inventory;
  const count=ITEMS.reduce((sum,item)=>sum+inventory[item.id],itemCount);
  $('bag-count').textContent=String(count);
  for (const id of ['shake','calm']) {
    $(`inventory-${id}-count`).textContent=String(inventory[id]);
    $(`inventory-${id}`).disabled=(id!=='shake'&&!inventoryAvailability(id).ok)||inventoryBusy||commerceBusy||erasingBusy||reviveBusy;
  }
  updateToolHud();
}

function pulseTool(id) {
  const slot=$(`tool-slot-${id}`);
  slot.classList.remove('tool-used');
  if (!reducedMotion) { void slot.offsetWidth; slot.classList.add('tool-used'); }
  setTimeout(()=>slot.classList.remove('tool-used'),450);
}

function updateToolHud() {
  const live=started&&!roundCredited&&world.state!=='over'&&!resumeAvailable;
  for (const id of ['eraser','shake','calm']) {
    const remaining=Math.max(0,(id==='shake'?shakeReadyAt:toolReadyAt[id])-world.time);
    const stock=progressStore.profile.inventory[id]+(id==='eraser'?itemCount:0);
    const active=id==='eraser'&&eraseMode;
    let text=!live?'플레이 중 사용':remaining>1e-6?`${Math.ceil(remaining-1e-6)}초 대기`:stock>0?'준비 완료':'상점에서 충전';
    if(live&&id==='shake'&&activeMode==='free')text='무제한 사용';
    else if(live&&id==='shake'&&stock===0)text='보석·특별사과로 획득';
    else if(live&&id==='shake'&&stock>0&&!world.bodies.length)text='과일이 필요해요';
    if(live&&id==='eraser'&&eraseMode)text=erasingBusy?'지우는 중…':'과일을 선택하세요';
    if(live&&stock>0&&remaining<=1e-6&&id!=='shake'&&!active){const available=inventoryAvailability(id);if(!available.ok)text=available.reason;}
    const slot=$(`tool-slot-${id}`),status=$(`tool-status-${id}`);
    if(status.textContent!==text)status.textContent=text;
    slot.classList.toggle('is-cooling',live&&remaining>1e-6&&!active);
    slot.classList.toggle('is-active',live&&active);
    const fraction=live?Math.min(1,remaining/(id==='shake'?(activeMode==='free'?.12:5):TOOL_COOLDOWNS[id])):0;
    if(slot.style.setProperty)slot.style.setProperty('--tool-cooldown',fraction.toFixed(3));
    const button=$(id==='eraser'?'item-button':id==='shake'?'shake-button':`inventory-${id}`);
    const name=id==='shake'?'강력 흔들기':ITEMS.find(item=>item.id===id).name;
    button.setAttribute('aria-label',`${name}, ${id==='shake'&&activeMode==='free'?'무제한':stock+'개 보유'}, ${text}`);
    if(id==='eraser')button.setAttribute('aria-pressed',String(eraseMode));
  }
  let effect='도구를 골라 정원에 새 틈을 만들어보세요';
  if(live&&eraseMode)effect='선택 지우개 · 지울 과일 하나를 눌러주세요';
  else if(live&&world.shakeProtected)effect=`안전 보호 중 · ${Math.max(1,Math.ceil(world.protectedUntil-world.time))}초`;
  const indicator=$('tool-effects-status');
  if(indicator.textContent!==effect)indicator.textContent=effect;
  indicator.classList.toggle('is-active',live&&(eraseMode||world.shakeProtected));
}

async function useInventoryItem(id) {
  if (inventoryBusy||commerceBusy||erasingBusy||reviveBusy) return;
  const availability=inventoryAvailability(id);if(!availability.ok){toast(availability.reason);return;}
  if(id==='shake'){
    if($('shop-dialog').open)$('shop-dialog').close();
    if(!document.querySelector('dialog[open]')&&world.state==='paused')world.state='playing';
    return shake();
  }
  if (id==='eraser') {
    if ($('shop-dialog').open) $('shop-dialog').close();
    if (!document.querySelector('dialog[open]')&&world.state==='paused') world.state='playing';
    useItem();return;
  }
  if (eraseMode) cancelErase();
  inventoryBusy=true;updateInventory();renderShop();
  try {
    const result=await progressStore.consumeItem(id);if(!result.used)return;
    if(id==='calm'){
      const removed=world.removeSmallest(3);recordCleanup(removed);
      toast('작은 과일 3개를 정리했어요!');
    }
    if(TOOL_COOLDOWNS[id])toolReadyAt[id]=world.time+TOOL_COOLDOWNS[id];
    pulseTool(id==='shake'?'shake':id);playSound(id);
    if (id==='calm' && $('shop-dialog').open) $('shop-dialog').close();
    updateShake();saveGame();
  } catch(error) {toast(error.message);}
  finally {inventoryBusy=false;updateInventory();renderShop();}
}

function openShop(category='skins') {
  shopCategory=category;renderShop(true);openDialog('shop-dialog');
}

function openDialog(id) {
  if (erasingBusy || inventoryBusy || reviveBusy) return;
  if (eraseMode) cancelErase();
  if (started && world.state === 'playing') { world.state='paused'; pausedByDialog=true; }
  if (!$(id).open) $(id).showModal();
  fitNumericText($('shop-gems'));
}

function showFromMenu(id) {
  openDialog(id);
  $('menu-dialog').close();
}

function openModes() {
  if (erasingBusy || inventoryBusy || reviveBusy) return;
  if(selectedGame!=='suika'){hub?.controller().focusMode();if($('menu-dialog').open)$('menu-dialog').close();return;}
  renderModes();
  showFromMenu('modes-dialog');
}

function unlockAchievement(id) {
  if (activeMode!=='classic'||achievementPending.has(id) || progressStore.profile.unlockedAchievements.includes(id)) return;
  achievementPending.add(id);
  progressStore.unlockAchievement(id,{mode:activeMode,runId:progressStore.pendingRun?.id}).then(result => {
    if (result.unlocked) {
      const achievement = ACHIEVEMENTS.find(item => item.id === id);
      toast(`${achievement.icon} 업적 달성: ${achievement.title} · ◆ +${result.earnedGems}`, 3500);
    }
  }).catch(error => toast(error.message)).finally(() => achievementPending.delete(id));
}

function checkpointRound() {
  if (!checkpointDirty || checkpointBusy || !started || roundCredited || !progressStore.pendingRun || progressStore.pendingRun.finished) return;
  checkpointDirty = false; checkpointBusy = true;
  progressStore.checkpointRun(world.score, roundCleared,runExtras()).then(result => {
    if (result.earnedGems > 0) toast(`◆ 보석 +${result.earnedGems}! 지금 바로 사용할 수 있어요`);
    if (progressStore.profile.classicMergedFruits >= 100) unlockAchievement('merges100');
    updateGemProgress();
  }).catch(error => { checkpointDirty = true; toast(error.message); }).finally(() => { checkpointBusy = false; });
}

function renderAchievements() {
  $('achievements-list').replaceChildren();
  ACHIEVEMENTS.forEach(item => {
    const unlocked = progressStore.profile.unlockedAchievements.includes(item.id);
    const card = document.createElement('article'); card.className = `achievement-card${unlocked ? ' achievement-unlocked' : ''}`;
    const icon = document.createElement('span'); icon.className = 'achievement-icon'; icon.textContent = unlocked ? item.icon : '◇';
    const title = document.createElement('h3'); title.textContent = item.title;
    const description = document.createElement('p'); description.textContent = item.description;
    const state = document.createElement('small'); state.textContent = unlocked ? '달성 완료 ✓' : `달성 보상 ◆ ${item.reward}`;
    card.append(icon, title, description, state); $('achievements-list').append(card);
  });
  hub?.renderTiers($('achievements-list'));
}

function updateModeLabel() {
  const mode = MODES.find(item => item.id === activeMode);
  $('mode-label').textContent = `${mode.icon} ${mode.name}`;
  $('mode-record-note').hidden=activeMode==='classic';
  document.body.dataset.mode = activeMode;
}

function renderModes() {
  $('mode-grid').replaceChildren();
  MODES.forEach(mode => {
    const unlocked = ['watermelon','timed','challenge'].includes(mode.id)||preferences.unlockedModes.includes(mode.id);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'mode-card';
    button.classList.toggle('mode-selected', activeMode === mode.id); button.disabled = !unlocked;
    const icon = document.createElement('span'); icon.textContent = mode.icon;
    const title = document.createElement('strong'); title.textContent = mode.name;
    const description = document.createElement('small'); description.textContent = unlocked ? mode.description : '영어 비밀 코드를 입력해 열어보세요.';
    button.append(icon, title, description);
    if(unlocked){
      const record=document.createElement('small');record.className='mode-best';
      const score=mode.id==='classic'?progressStore.profile.bestScore:progressStore.profile.modeBestScores[mode.id];
      record.textContent=`최고 ${score.toLocaleString('ko-KR')}점`;button.append(record);
    }
    button.addEventListener('click', () => {
      startGame({ mode:mode.id });
      $('modes-dialog').close(); $('menu-dialog').close();
    });
    const option=document.createElement('article');option.className='mode-option';option.classList.toggle('mode-option-selected',activeMode===mode.id);option.append(button);
    const hint=MODE_HINTS[mode.id];
    if(hint){
      const details=document.createElement('details');details.className='mode-hint';
      const summary=document.createElement('summary');summary.textContent='비밀 코드 힌트 보기';
      const clue=document.createElement('p');clue.textContent=hint.clue;
      const reveal=document.createElement('button');reveal.type='button';reveal.className='text-link';reveal.textContent='정답 보기';
      const answer=document.createElement('code');answer.textContent=hint.code;answer.hidden=true;
      const fill=document.createElement('button');fill.type='button';fill.className='text-link';fill.textContent='입력칸에 넣기';fill.hidden=true;
      reveal.addEventListener('click',()=>{answer.hidden=false;fill.hidden=false;reveal.hidden=true;});
      fill.addEventListener('click',()=>{$('secret-code').value=hint.code;$('secret-code').focus();$('secret-hint').textContent='열어보기를 누르면 이 모드가 열려요.';});
      details.append(summary,clue,reveal,answer,fill);option.append(details);
    }
    $('mode-grid').append(option);
  });
}

function unlockModes(ids) {
  preferences = savePreferences({ ...preferences, unlockedModes:[...new Set([...preferences.unlockedModes, ...ids])] });
  $('secret-hint').textContent = '비밀 정원이 열렸어요! 위에서 원하는 모드를 골라보세요.';
  renderModes(); toast('✦ 비밀 정원 발견! 새로운 모드가 열렸어요.', 3500);
  if(ids.includes('water'))unlockAchievement('waterExplorer');
  if(ids.includes('space'))unlockAchievement('spaceExplorer');
}

function applyTheme() {
  document.documentElement.dataset.theme = preferences.theme;
  document.body.dataset.mode = activeMode;
  document.body.dataset.background = currentBackground;
  $('board-shell').dataset.basket = currentBasket;
  $('theme-light').setAttribute('aria-pressed', String(preferences.theme === 'light'));
  $('theme-dark').setAttribute('aria-pressed', String(preferences.theme === 'dark'));
  const style = getComputedStyle(document.body);
  palette = {
    background:style.getPropertyValue('--board-bg').trim() || '#fffdf3',
    dots:style.getPropertyValue('--board-dots').trim() || '#dce3cc',
    line:style.getPropertyValue('--board-line').trim() || '#b9c3a3',
    text:style.getPropertyValue('--board-text').trim() || '#8f9e7c',
  };
  if (currentBackground !== 'default') palette = getCosmeticPalette(currentBackground, preferences.theme);
  if(preferences.boardColor)palette=customPalette(preferences.boardColor);
  const page=preferences.pageColor?customPalette(preferences.pageColor):null;
  document.documentElement.style.setProperty('--custom-page-bg',preferences.pageColor||'');
  document.documentElement.style.setProperty('--custom-board-bg',preferences.boardColor||'');
  document.documentElement.style.setProperty('--page-ink',page?.text||'');
  document.documentElement.style.setProperty('--page-muted',page?.line||'');
  $('page-color').value=preferences.pageColor||style.getPropertyValue('--paper').trim()||(preferences.theme==='dark'?'#152822':'#f7f8f0');
  $('board-color').value=palette.background;
  $('page-color-value').textContent=preferences.pageColor||'기본 색상';
  $('board-color-value').textContent=preferences.boardColor||'기본·상점 배경';
}

function customPalette(hex){
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const linear=rgb.map(value=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
  const luminance=linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
  const text=luminance>.3?'#18332a':luminance>.179?'#000000':'#ffffff';
  const target=[1,3,5].map(i=>parseInt(text.slice(i,i+2),16));
  const blend=amount=>'#'+rgb.map((value,i)=>Math.round(value*(1-amount)+target[i]*amount).toString(16).padStart(2,'0')).join('');
  return {background:hex,dots:blend(.12),line:blend(.65),text};
}

function renderColorPresets(){
  $('color-presets').replaceChildren();
  for(const preset of COLOR_PRESETS){
    const button=document.createElement('button');button.type='button';button.className='color-preset';
    button.style.setProperty('--swatch',preset.page);button.textContent=preset.name;
    button.addEventListener('click',()=>{preferences=savePreferences({...preferences,pageColor:preset.page,boardColor:preset.board});applyTheme();});
    $('color-presets').append(button);
  }
}

function updateSoundControls() {
  $('sound-toggle').checked = soundEnabled;
  $('volume-slider').value = String(Math.round(preferences.volume * 100));
  $('music-toggle').checked = preferences.music;
  $('effects-toggle').checked = preferences.effects;
  $('music-volume').value = String(Math.round(preferences.musicVolume * 100));
  $('effects-volume').value = String(Math.round(preferences.effectsVolume * 100));
  $('sound-button').setAttribute('aria-label', soundEnabled ? '소리 끄기' : '소리 켜기');
  $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
  $('sound-button').querySelector('use')?.setAttribute('href', soundEnabled ? '#i-sound' : '#i-mute');
}

async function ensureAudio() {
  await gameAudio.unlock();
  syncAudio();
}

function syncAudio() {
  gameAudio.setPlaying((selectedGame!=='suika'?arcadePlaying:started && world.state !== 'over') && !document.hidden,
    (selectedGame==='suika'&&world.state === 'paused') || !!document.querySelector('dialog[open]'));
}

function setSound(enabled) {
  soundEnabled = !!enabled;
  preferences = savePreferences({ ...preferences, sound:soundEnabled });
  gameAudio.configure(preferences);
  updateSoundControls(); if (soundEnabled) ensureAudio();
}

function resetWelcome() {
  $('start-screen').classList.remove('has-resume');
  $('continue-button').hidden = true;
  $('resume-summary').hidden = true;
  $('welcome-title').textContent = '수박게임';
  $('start-button-label').textContent = '시작하기';
}

function gameRecord() {
  return {
    runId:progressStore.pendingRun.id,world:world.serialize(),
    activeLevel,nextLevel,activeSpecial,nextSpecial,aimX,
    shakes:0,shakeReadyAt,dropCount,itemCount,roundCleared,
    maxLevel,watermelonMade,secretDiscovered,
    mode:activeMode,seedState,totalShakes,toolReadyAt,...runExtras(),
  };
}

async function completeRevivalRecovery(){
  const recovery=progressStore.getPendingRevival();
  if(!recovery)return;
  if(!gameSave.write(recovery.snapshot))throw new Error('이어갈 정원을 저장할 공간이 부족해요.');
  await progressStore.acknowledgeRevival(recovery.requestId);
}

function saveGame() {
  const run = progressStore.pendingRun;
  if (!started || roundCredited || !run || run.finished || reviveBusy) return false;
  if(progressStore.getPendingRevival()){
    if(!recoveryAckBusy){
      recoveryAckBusy=true;
      completeRevivalRecovery().then(()=>{recoveryAckBusy=false;saveGame();}).catch(()=>{recoveryAckBusy=false;});
    }
    return false;
  }
  if (!progressStore.storageAvailable) {
    $('save-status').textContent = '이 기기에서 저장을 사용할 수 없어요';
    return false;
  }
  const saved = gameSave.write(gameRecord());
  if (saved) {
    saveDirty = false; saveElapsed = 0;
    const label = `자동 저장됨 · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    if ($('save-status').textContent !== label) $('save-status').textContent = label;
  } else {
    $('save-status').textContent = '진행 상태를 저장하지 못했어요';
  }
  return saved;
}

async function prepareSavedGame() {
  const recovery=progressStore.getPendingRevival();
  const saved = recovery?.snapshot || gameSave.read();
  if (!saved) return;
  const run = await progressStore.resumeRun(saved.runId);
  if (!run || run.finished) { gameSave.clear(); return; }
  if(saved.mode!=='classic'){
    if(recovery)await progressStore.acknowledgeRevival(recovery.requestId);
    await progressStore.finishRun(saved.world.score,saved.roundCleared,{specialShakeRewards:saved.specialShakeRewards,discoveredLevels:saved.discoveredLevels});
    gameSave.clear();activeMode='classic';world.setMode('classic');resetToWelcome();applyTheme();updateModeLabel();return;
  }
  if (!world.restore(saved.world)) { gameSave.clear(); return; }
  activeMode = world.mode;
  seedState = Number.isInteger(saved.seedState) ? saved.seedState >>> 0 : (Date.now() >>> 0) || 1;
  totalShakes = saved.totalShakes || 0;
  applyTheme(); updateModeLabel();
  ({ activeLevel, nextLevel, activeSpecial, nextSpecial, aimX, shakeReadyAt,
    dropCount, itemCount, roundCleared, maxLevel, watermelonMade, toolReadyAt } = saved);
  specialShakeRewards=saved.specialShakeRewards;
  for(const level of saved.discoveredLevels)discoveredLevels.add(level);
  for(const body of world.bodies)discoveredLevels.add(body.level);
  if(maxLevel>0)discoveredLevels.add(maxLevel);
  if(saved.secretDiscovered)discoveredLevels.add(SECRET_LEVEL);
  if (saved.world.width !== WIDTH) aimX *= WIDTH / saved.world.width;
  secretDiscovered = secretDiscovered || saved.secretDiscovered;
  if (secretDiscovered) { try { localStorage.setItem('suika-garden-secret', 'yes'); } catch {} }
  const radius = FRUITS[activeLevel].radius;
  aimX = Math.max(radius + 8, Math.min(WIDTH - radius - 8, aimX));
  started = true; roundCredited = false; settlement = null; particles = []; floaters = [];
  checkpointDirty=true;
  const wasOver=world.state==='over';
  resumeAvailable = false; saveDirty = false; saveElapsed = 0;
  if(!wasOver)world.state='playing';
  renderEvolution(); updateNext(); updateScore(); updateGemProgress(); updateShake(); updateItem();
  $('start-screen').hidden=true;
  $('save-status').textContent = '이전 정원을 자동으로 이어왔어요';
  $('game-status').textContent = '돌아온 정원 · 이어서 가꿔보세요';
  if(recovery&&gameSave.write(saved))await progressStore.acknowledgeRevival(recovery.requestId);
  if(wasOver)showGameOver();
}

function resumeGame() {
  if (!resumeAvailable || !started || world.state !== 'paused') return;
  resumeAvailable = false; world.state = 'playing'; lastFrame = 0;
  $('start-screen').hidden = true;
  $('game-status').textContent = '다시 돌아온 정원에 오신 걸 환영해요';
  canvas.focus({ preventScroll: true });
  updateShake(); updateItem(); saveGame();
}

$('shop-open').addEventListener('click', () => {if(selectedGame==='suika')openShop('skins');else hub?.controller().openLocker();});
$('tools-shop-open').addEventListener('click', () => openShop('items'));
const shopCategories=['skins','backgrounds','baskets','items'];
shopCategories.forEach((category,index)=>{
  const tab=$(`shop-tab-${category}`);
  tab.addEventListener('click',()=>{shopCategory=category;renderShop(true);});
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.code))return;
    event.preventDefault();
    const next=event.code==='Home'?0:event.code==='End'?3:(index+(event.code==='ArrowRight'?1:3))%4;
    shopCategory=shopCategories[next];renderShop(true);$(`shop-tab-${shopCategory}`).focus();
  });
});
$('inventory-shake').addEventListener('click',()=>progressStore.buyItem('shake').catch(error=>toast(error.message)));
$('inventory-calm').addEventListener('click',()=>useInventoryItem('calm'));
function resetToWelcome() {
  started=false;world.reset();roundCleared=0;roundCredited=false;settlement=null;
  $('start-screen').hidden=false;$('game-overlay').hidden=true;
  updateScore();updateGemProgress();
  resumeAvailable = false; resetWelcome();
}
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));

const progressInitialization = progressStore.init().then(async () => {
  renderProfile(); await prepareSavedGame(); progressReady = true;
  if(progressStore.refundedToolGems>0)toast(`삭제된 도구를 보석 ${progressStore.refundedToolGems.toLocaleString('ko-KR')}개로 돌려드렸어요.`,4000);
});
observeNumericText([$('score'), $('best-score'), $('final-score'), $('gem-count'), $('shop-gems')]);
renderColorPresets();
applyTheme(); updateModeLabel(); updateSoundControls(); renderModes();

function playSound(type, level = 0) {
  gameAudio.effect(type, level);
}

$('sound-button').addEventListener('click', () => setSound(!soundEnabled));
$('sound-toggle').addEventListener('change', event => setSound(event.target.checked));
$('volume-slider').addEventListener('input', event => {
  preferences = savePreferences({ ...preferences, volume:Number(event.target.value) / 100 });
  gameAudio.configure(preferences);
});
for (const [id, field] of [['music-toggle','music'], ['effects-toggle','effects']]) {
  $(id).addEventListener('change', event => {
    preferences = savePreferences({ ...preferences, [field]:event.target.checked });
    gameAudio.configure(preferences); ensureAudio();
    if (field === 'effects' && preferences.effects) playSound('drop');
  });
}
for (const [id, field] of [['music-volume','musicVolume'], ['effects-volume','effectsVolume']]) {
  $(id).addEventListener('input', event => {
    preferences = savePreferences({ ...preferences, [field]:Number(event.target.value) / 100 });
    gameAudio.configure(preferences);
  });
}
document.addEventListener('pointerdown', () => ensureAudio(), { capture:true });
document.addEventListener('keydown', event => { if (!event.repeat) ensureAudio(); }, { capture:true });
['light','dark'].forEach(theme => $(`theme-${theme}`).addEventListener('click', () => { preferences=savePreferences({ ...preferences, theme });applyTheme(); }));
$('menu-open').addEventListener('click', () => openDialog('menu-dialog'));
$('appearance-open').addEventListener('click',()=>showFromMenu('appearance-dialog'));
$('modes-header-open').addEventListener('click', openModes);
for(const [id,field]of [['page-color','pageColor'],['board-color','boardColor']]){
  $(id).addEventListener('input',event=>{preferences=savePreferences({...preferences,[field]:event.target.value});applyTheme();});
}
$('appearance-reset').addEventListener('click',()=>{preferences=savePreferences({...preferences,pageColor:null,boardColor:null});applyTheme();});
$('resume-menu').addEventListener('click', () => $('menu-dialog').close());
$('restart-menu').addEventListener('click', () => {if(selectedGame==='suika')openDialog('restart-dialog');else hub?.controller().restart();$('menu-dialog').close(); });
$('achievements-open').addEventListener('click', () => {if(selectedGame==='suika'){renderAchievements();showFromMenu('achievements-dialog');}else{const game=hub?.controller();if(game?.openRecords)game.openRecords();else game?.openLocker();$('menu-dialog').close();} });
$('modes-open').addEventListener('click', openModes);
function unlockFromCode(){
  const code=$('secret-code').value.trim().toLowerCase();
  const codeModes={apple:['apple'],shake:['free'],free:['free'],water:['water'],gravity:['space']};
  if (Object.hasOwn(codeModes,code)) { unlockModes(codeModes[code]);$('secret-code').value=''; }
  else $('secret-hint').textContent=code?'각 모드 카드에서 힌트나 정답을 확인해 보세요.':'영어 비밀 코드를 입력하거나 모드 카드의 힌트를 열어보세요.';
}
$('secret-unlock').addEventListener('click',unlockFromCode);
$('secret-code').addEventListener('keydown',event=>{
  if(event.code==='Enter'){event.preventDefault();unlockFromCode();}
});
$('erase-cancel').addEventListener('click', cancelErase);

$('start-button').addEventListener('click', () => {
  if (resumeAvailable) $('restart-dialog').showModal();
  else startGame();
});
$('continue-button').addEventListener('click', resumeGame);
$('revive-button').addEventListener('click',reviveGame);
$('play-again').addEventListener('click', startGame);
$('shake-button').addEventListener('click', shake);
$('item-button').addEventListener('click', useItem);
$('restart-button').addEventListener('click', () => {
  if (inventoryBusy || erasingBusy || reviveBusy) return;
  if (eraseMode) cancelErase();
  if (!started || world.state === 'over' || !world.bodies.length) { startGame(); return; }
  world.state = 'paused';
  $('restart-dialog').showModal();
});
$('restart-cancel').addEventListener('click', () => $('restart-dialog').close());
$('restart-confirm').addEventListener('click', () => { $('restart-dialog').close(); startGame(); });
$('restart-dialog').addEventListener('close', () => { if (!starting && !resumeAvailable && !eraseMode && world.state === 'paused') world.state = 'playing'; });
$('help-button').addEventListener('click', () => {
  openDialog('help-dialog');
});
[$('help-close'), $('help-ok')].forEach(button => button.addEventListener('click', () => $('help-dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (!document.querySelector('dialog[open]') && pausedByDialog && !starting && !resumeAvailable && !eraseMode) {
      if (selectedGame === 'suika' && started && world.state === 'paused') world.state = 'playing';
      pausedByDialog = false;
    }
  });
});

function pickFruit(event) {
  if (erasingBusy || inventoryBusy) return;
  const bounds = canvas.getBoundingClientRect();
  const x=(event.clientX-bounds.left)/bounds.width*WIDTH, y=(event.clientY-bounds.top)/bounds.height*HEIGHT;
  const hit=[...world.bodies].reverse().find(body => Math.hypot(body.x-x,body.y-y)<=body.r*1.08);
  selectedFruitId=hit?.id ?? null;
}

function aim(event) {
  const bounds = canvas.getBoundingClientRect();
  const radius = FRUITS[activeLevel].radius;
  aimX = Math.max(radius + 8, Math.min(WIDTH - radius - 8, (event.clientX - bounds.left) / bounds.width * WIDTH));
}
canvas.addEventListener('pointermove', event => { if (eraseMode) pickFruit(event); else aim(event); });
canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; if (eraseMode) pickFruit(event); else aim(event); canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointerup', event => { if (event.button !== 0) return; if (eraseMode) { pickFruit(event);if(selectedFruitId!==null)eraseSelected();else toast('없애고 싶은 과일을 직접 눌러주세요.'); } else { aim(event); drop(); } });
document.addEventListener('keydown', event => {
  if (erasingBusy || inventoryBusy || reviveBusy) { if(['Escape','KeyD','KeyS','KeyP','ArrowLeft','ArrowRight','Enter','Space'].includes(event.code))event.preventDefault();return; }
  if (eraseMode && !document.querySelector('dialog[open]')) {
    if (['Escape','KeyD','ArrowLeft','ArrowRight','Enter','Space'].includes(event.code)) {
      event.preventDefault();
      if (event.code==='Escape'||event.code==='KeyD') cancelErase();
      else if (event.code==='Enter'||event.code==='Space') eraseSelected();
      else { const ids=world.bodies.map(body=>body.id), index=Math.max(0,ids.indexOf(selectedFruitId));selectedFruitId=ids[(index+(event.code==='ArrowRight'?1:ids.length-1))%ids.length]; }
      return;
    }
  }
  if (event.code==='Escape' && !document.querySelector('dialog[open]')) { event.preventDefault();openDialog('menu-dialog');return; }
  if (!started || world.state !== 'playing' || document.querySelector('dialog[open]')) return;
  if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
  if (['ArrowLeft', 'ArrowRight', 'Space', 'KeyS', 'KeyD', 'KeyP'].includes(event.code)) event.preventDefault();
  const radius = FRUITS[activeLevel].radius;
  if (event.code === 'ArrowLeft') aimX = Math.max(radius + 8, aimX - 17);
  if (event.code === 'ArrowRight') aimX = Math.min(WIDTH - radius - 8, aimX + 17);
  if (event.code === 'Space' && !event.repeat) drop();
  if (event.code === 'KeyS' && !event.repeat) shake();
  if (event.code === 'KeyD' && !event.repeat) useItem();
  const toolKeys={KeyP:'calm'};
  if (toolKeys[event.code] && !event.repeat) useInventoryItem(toolKeys[event.code]);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
  if (document.hidden) gameAudio.silence(); else syncAudio();
  lastFrame = 0;
});
globalThis.addEventListener?.('pagehide', () => { saveGame(); gameAudio.silence(); });

function render(dt) {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = palette.background; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (currentBackground !== 'default'&&!preferences.boardColor) drawCosmeticBackdrop(ctx,currentBackground,WIDTH,HEIGHT,animationTime,preferences.theme);
  ctx.fillStyle = palette.dots;
  for (let x = 18; x < WIDTH; x += 24) for (let y = 109; y < HEIGHT; y += 24) {
    ctx.beginPath(); ctx.arc(x, y, .75, 0, Math.PI * 2); ctx.fill();
  }
  drawModeBackground();
  ctx.save();
  ctx.strokeStyle = danger > .05 ? '#db956b' : palette.line;
  ctx.lineWidth = 1; ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(13, 90); ctx.lineTo(WIDTH - 13, 90); ctx.stroke();
  ctx.setLineDash([]); ctx.fillStyle = palette.text; ctx.font = '8px "DM Sans", sans-serif';
  ctx.fillText('MAX', 17, 83); ctx.restore();
  if (started && world.state === 'playing' && world.time - world.lastDrop >= .35) {
    const radius = FRUITS[activeLevel].radius;
    let floor = HEIGHT - 8 - radius;
    for (const b of world.bodies) {
      const dx = aimX - b.x, distance = radius + b.r;
      if (Math.abs(dx) < distance) floor = Math.min(floor, b.y - Math.sqrt(distance * distance - dx * dx));
    }
    ctx.save(); ctx.strokeStyle = '#c6d0af'; ctx.globalAlpha = .6; ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.moveTo(aimX, 48 + radius); ctx.lineTo(aimX, Math.max(48 + radius, floor)); ctx.stroke(); ctx.restore();
    drawSkinnedFruit(ctx, activeLevel, aimX, 43, radius, 0, .92, activeSpecial, animationTime, currentSkin);
    ctx.fillStyle = '#9bad80'; ctx.beginPath(); ctx.moveTo(aimX - 3, 8);ctx.lineTo(aimX + 3, 8);ctx.lineTo(aimX, 12);ctx.fill();
  }
  for (const body of world.bodies) {
    ctx.save();ctx.translate(body.x,body.y);
    const squash=Math.max(0,Math.min(1,body.squash||0));ctx.scale(1+squash*.13,1-squash*.12);
    drawSkinnedFruit(ctx, body.level, 0, 0, body.r, body.angle, 1, body.special, animationTime, currentSkin);
    ctx.restore();
    if (eraseMode) {
      ctx.save();ctx.strokeStyle=body.id===selectedFruitId?'#f4b65d':'#d6ae62';ctx.lineWidth=body.id===selectedFruitId?3:1;ctx.setLineDash(body.id===selectedFruitId?[]:[4,4]);
      ctx.beginPath();ctx.arc(body.x,body.y,body.r+4,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  particles = particles.filter(p => p.life > 0);
  for (const p of particles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  floaters = floaters.filter(f => f.life > 0);
  for (const f of floaters) {
    f.life -= dt; f.y -= dt * 24;
    ctx.save(); ctx.globalAlpha = Math.min(1, f.life * 2);ctx.font='600 12px "DM Sans", sans-serif';
    ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#fffdf3';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle='#5b7d46';ctx.fillText(f.text,f.x,f.y);ctx.restore();
  }
  if (danger > .05) {
    ctx.fillStyle = `rgba(230, 144, 105, ${danger * .1})`;
    ctx.fillRect(0, 0, WIDTH, 95);
  }
  drawBasketFrame(ctx,currentBasket,WIDTH,HEIGHT,animationTime);
}

function drawModeBackground() {
  if (activeMode==='space') {
    ctx.save();
    for(let i=0;i<65;i++) {
      const x=(i*137.9+23)%WIDTH,y=(i*83.7+41)%HEIGHT;
      ctx.globalAlpha=.22+.35*(.5+.5*Math.sin(animationTime*.65+i));ctx.fillStyle=i%4?'#d8d7ff':'#d5acfa';
      ctx.beginPath();ctx.arc(x,y,i%5===0?1.7:.8,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  if (activeMode==='water') {
    const y=world.waterSurface;
    ctx.save();const water=ctx.createLinearGradient(0,y,0,HEIGHT);water.addColorStop(0,'#66c9e347');water.addColorStop(1,'#3d9cce6b');
    ctx.fillStyle=water;ctx.beginPath();ctx.moveTo(0,HEIGHT);ctx.lineTo(0,y);
    for(let x=0;x<=WIDTH;x+=12)ctx.lineTo(x,y+Math.sin(animationTime*1.4+x*.024)*4);
    ctx.lineTo(WIDTH,HEIGHT);ctx.closePath();ctx.fill();ctx.strokeStyle='#76c5d788';ctx.lineWidth=2;
    ctx.beginPath();for(let x=0;x<=WIDTH;x+=12){const yy=y+Math.sin(animationTime*1.4+x*.024)*4;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();
    ctx.strokeStyle='#e3f8fc88';ctx.lineWidth=1;
    for(let i=0;i<14;i++){const x=(i*71+35)%WIDTH,yy=HEIGHT-((animationTime*(7+i%3)+i*57)%(HEIGHT-y));ctx.beginPath();ctx.arc(x,yy,2+i%3,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
}

function frame(time) {
  const dt = lastFrame ? Math.min((time - lastFrame) / 1000, .05) : 1 / 60;
  lastFrame = time;
  if (!reducedMotion && !document.hidden) animationTime += dt;
  if (selectedGame==='suika'&&!document.hidden && started && !inventoryBusy && !reviveBusy && !document.querySelector('dialog[open]')) world.update(dt);
  if(selectedGame==='suika')render(world.state === 'paused' ? 0 : dt);
  if(selectedGame==='suika'&&world.state==='playing'&&((activeMode==='timed'&&world.time>=120)||(activeMode==='challenge'&&world.score>=5000))){world.state='over';world.onGameOver();if(activeMode==='challenge')hub?.share(canvas,'챌린지 달성!',world.score,maxLevel);}
  if(activeMode==='timed'&&selectedGame==='suika')$('mode-label').textContent=`⏱ ${Math.max(0,Math.ceil(120-world.time))}초`;
  syncAudio();
  updateShake();
  updateItem();
  updateInventory();
  $('board-shell').classList.toggle('erase-selecting', eraseMode);
  checkpointRound();
  if (started && world.state === 'playing' && !document.hidden) saveElapsed += dt;
  if (saveDirty || saveElapsed >= 1) saveGame();
  if (selectedGame==='suika'&&!document.hidden && social?.room&&social.room.game==='suika') {
    roomElapsed+=dt;
    if(roomElapsed>=2){roomElapsed=0;social.updateGame({score:world.score,fruitCount:world.bodies.length,playing:started&&world.state==='playing'});}
  }
  const protectedNow = started && world.state !== 'over' && world.shakeProtected;
  $('safety-indicator').textContent = protectedNow ? '보호 중' : '';
  $('safety-indicator').hidden=!protectedNow;
  $('safety-indicator').classList.toggle('protected-label', !!protectedNow);
  for (const entry of animatedIcons) {
    if (!entry.icon.isConnected) { animatedIcons.delete(entry); continue; }
    const c = entry.icon.getContext('2d');
    c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, entry.size, entry.size);
    drawSkinnedFruit(c, entry.level, entry.size / 2, entry.size / 2 + 2, entry.size * .43, 0, 1, true, animationTime, currentSkin);
  }
  requestAnimationFrame(frame);
}
social = new GardenSocial({
  fetcher: createApiFetcher('https://suika-shake-garden-n5k7.hbhbhs02.chatgpt.site/'),
  getGame:()=>selectedGame,
  openDialog,
  getMode:()=>selectedGame==='suika'?activeMode:hub?.controller().mode()||'classic',
  onError:error=>toast(error.message || '친구 기능에 연결하지 못했어요.'),
  onBeforeAccountChange:async()=>{saveGame();},
  onUser:user=>{ $('account-open').textContent=user?`☺ ${user.displayName}`:'회원가입';globalThis.dispatchEvent(new CustomEvent('garden-user',{detail:user})); },
  onRoom:async({room,joinedNew})=>{
    if (room && joinedNew) {if(room.game&&room.game!=='suika')globalThis.dispatchEvent(new CustomEvent('garden-room',{detail:room}));else{hub?.select('suika');await startGame({mode:room.mode,seed:room.seed});}}
    if (room?.game==='suika'&&selectedGame==='suika'&&room?.mode==='classic'&&room.players.length>1) unlockAchievement('friendGame');
  },
});
$('friends-open').addEventListener('click',()=>social.openFriends());
$('account-open').addEventListener('click',()=>social.openAccount(social.user?'login':'register'));
$('friends-menu').addEventListener('click',()=>{social.openFriends();$('menu-dialog').close();});
$('account-menu').addEventListener('click',()=>{social.openAccount(social.user?'login':'register');$('menu-dialog').close();});
hub=createHub({
  state:()=>({world,mode:selectedGame==='suika'?activeMode:hub?.controller().mode()||'classic',skin:currentSkin,game:selectedGame,canvas}),store:()=>progressStore,social:()=>social,
  toast,open:openDialog,effect:playSound,achievements:renderAchievements,arcadeActive:value=>{arcadePlaying=value;},
  resume:()=>{if(selectedGame==='suika'&&started&&world.state==='paused'&&pausedByDialog&&!document.querySelector('dialog[open]')){world.state='playing';pausedByDialog=false;}},
  switchGame:game=>{
    if(game===selectedGame)return;saveGame();
    if(game!=='suika'){
      if(selectedGame==='suika'){
        resetModeOnReturn=activeMode!=='classic';
        wasSuikaPlaying=started&&(world.state==='playing'||world.state==='paused'&&pausedByDialog);
        if(wasSuikaPlaying)world.state='paused';pausedByDialog=false;
      }
      arcadePlaying=true;
    }else if(!resetModeOnReturn&&wasSuikaPlaying&&world.state==='paused')world.state='playing';
    selectedGame=game;syncAudio();
    if(game==='suika'&&resetModeOnReturn)startGame({mode:'classic'}).then(()=>{if(activeMode==='classic')resetModeOnReturn=false;});
  },
});
mountPlayLayout();
social.init().catch(error=>toast(error.message));
requestAnimationFrame(frame);
