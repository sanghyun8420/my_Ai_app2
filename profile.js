import { SKIN_CATALOG, BACKGROUNDS, BASKETS, ITEMS, HATS } from './catalog.js';
import { normalizeGameRecord } from './save-state.js';

const STORAGE_KEY = 'suika-garden-profile-v3';
const BEST_KEY = 'suika-garden-best';
const PRICES = Object.freeze(Object.fromEntries(SKIN_CATALOG.map(item => [item.id, item.price])));
const ITEM_LIMIT = 999;
const GEM_EVERY = 20;
const RECEIPT_LIMIT = 32;
const REVIVAL_COST = 10;
const RUN_MODES = new Set(['classic','apple','free','water','space','watermelon','timed','challenge']);
const SPECIAL_MODES = ['apple','free','water','space','watermelon','timed','challenge'];
const REMOVED_TOOL_PRICES = { magnet: 10, swap: 6, freeze: 8 };

export const ACHIEVEMENTS = Object.freeze([
  { id: 'firstMerge', title: '첫 열매', description: '처음으로 과일을 합쳐요.', icon: '🌱', reward: 5 },
  { id: 'merges100', title: '풍성한 수확', description: '과일을 100개 합치거나 정리해요.', icon: '🧺', reward: 5 },
  { id: 'score1000', title: '천 점의 정원', description: '한 판에서 1,000점을 달성해요.', icon: '⭐', reward: 5 },
  { id: 'score10000', title: '정원의 달인', description: '한 판에서 10,000점을 달성해요.', icon: '🏆', reward: 5 },
  { id: 'watermelon', title: '수박 수확', description: '커다란 수박을 만들어요.', icon: '🍉', reward: 5 },
  { id: 'secret', title: '비밀의 열매', description: '시크릿 과일을 발견해요.', icon: '✨', reward: 5 },
  { id: 'shake10', title: '흔들기의 달인', description: '한 판에서 흔들기를 10번 사용해요.', icon: '🌀', reward: 5 },
  { id: 'waterExplorer', title: '물속 탐험가', description: '기본 정원에서 물속 모드의 비밀을 발견해요.', icon: '🫧', reward: 5 },
  { id: 'spaceExplorer', title: '우주 탐험가', description: '기본 정원에서 우주 모드의 비밀을 발견해요.', icon: '🚀', reward: 5 },
  { id: 'friendGame', title: '함께 가꾸는 정원', description: '친구와 같은 과일 순서로 도전해요.', icon: '🤝', reward: 5 },
].map(achievement => Object.freeze(achievement)));
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map(achievement => achievement.id));

function whole(value, fallback = 0) {
  if (typeof value !== 'number' && typeof value !== 'string') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(number))) : fallback;
}

function cleanDiscoveredLevels(value) {
  return [...new Set(Array.isArray(value) ? value.filter(level => Number.isInteger(level) && level >= 0 && level <= 13) : [])].sort((a, b) => a - b);
}

function runExtras(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw progressError('게임 보상 정보를 확인해 주세요.', 'INVALID_RUN');
  const specialShakeRewards = value.specialShakeRewards === undefined ? 0 : value.specialShakeRewards;
  const discoveredLevels = value.discoveredLevels === undefined ? [] : value.discoveredLevels;
  if (!Number.isSafeInteger(specialShakeRewards) || specialShakeRewards < 0 || !Array.isArray(discoveredLevels) || discoveredLevels.length > 1000 || Array.from(discoveredLevels).some(level => !Number.isInteger(level) || level < 0 || level > 13)) {
    throw progressError('게임 보상 정보를 확인해 주세요.', 'INVALID_RUN');
  }
  return { specialShakeRewards, discoveredLevels: cleanDiscoveredLevels(discoveredLevels) };
}

function cleanProgress(value) {
  const ownedSkins = [...new Set(['classic', ...(Array.isArray(value?.ownedSkins) ? value.ownedSkins.filter(id => typeof id === 'string' && Object.hasOwn(PRICES, id)) : [])])];
  const ownedBackgrounds = cleanOwned(value?.ownedBackgrounds, BACKGROUNDS, 'default');
  const ownedBaskets = cleanOwned(value?.ownedBaskets, BASKETS, 'classic');
  return {
    bestScore: whole(value?.bestScore),
    modeBestScores:Object.fromEntries(SPECIAL_MODES.map(mode=>[mode,whole(value?.modeBestScores?.[mode])])),
    classicMergedFruits:whole(value?.classicMergedFruits === undefined ? value?.mergedFruits : value.classicMergedFruits),
    gems: whole(value?.gems),
    hubStats:{seconds:whole(value?.hubStats?.seconds),watermelons:whole(value?.hubStats?.watermelons),claims:Array.isArray(value?.hubStats?.claims)?value.hubStats.claims.filter(x=>typeof x==='string').slice(0,100):[]},
    ownedHats:cleanOwned(value?.ownedHats,HATS,'none'),
    equippedHat:HATS.some(x=>x.id===value?.equippedHat)?value.equippedHat:'none',
    mergedFruits: whole(value?.mergedFruits),
    ownedSkins,
    equippedSkin: ownedSkins.includes(value?.equippedSkin) ? value.equippedSkin : 'classic',
    ownedBackgrounds,
    equippedBackground: ownedBackgrounds.includes(value?.equippedBackground) ? value.equippedBackground : 'default',
    ownedBaskets,
    equippedBasket: ownedBaskets.includes(value?.equippedBasket) ? value.equippedBasket : 'classic',
    inventory: Object.fromEntries(ITEMS.map(item => [item.id, Math.min(ITEM_LIMIT, whole(value?.inventory?.[item.id]))])),
    discoveredLevels: cleanDiscoveredLevels(value?.discoveredLevels),
    unlockedAchievements: [...new Set(Array.isArray(value?.unlockedAchievements) ? value.unlockedAchievements.filter(id => ACHIEVEMENT_IDS.has(id)) : [])],
  };
}

function cleanOwned(value, catalog, defaultId) {
  const known = new Set(catalog.map(item => item.id));
  return [...new Set([defaultId, ...(Array.isArray(value) ? value.filter(id => known.has(id)) : [])])];
}

function progressError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function validRunId(id) {
  return typeof id === 'string' && /^local-[a-z0-9-]{1,120}$/.test(id);
}

function cleanReceipt(value) {
  if (!value || !validRunId(value.id)) return null;
  const receipt = { id: value.id };
  for (const field of ['score', 'mergedFruits', 'earnedGems', 'completedAt']) {
    if (!Number.isSafeInteger(value[field]) || value[field] < 0) return null;
    receipt[field] = value[field];
  }
  const creditedSpecialShakes = value.creditedSpecialShakes === undefined ? 0 : value.creditedSpecialShakes;
  if (!Number.isSafeInteger(creditedSpecialShakes) || creditedSpecialShakes < 0) return null;
  receipt.creditedSpecialShakes = creditedSpecialShakes;
  receipt.mode=RUN_MODES.has(value.mode)?value.mode:'classic';
  return receipt;
}

function completedRun(receipt) {
  const { id, ...result } = receipt;
  return { id, mode:receipt.mode, finished: true, result, creditedFruits: receipt.mergedFruits, earnedGems: receipt.earnedGems, score: receipt.score, lastRevivalTick: -1, creditedSpecialShakes: receipt.creditedSpecialShakes };
}

function cleanActiveRun(value) {
  if (!value || !validRunId(value.id) || typeof value.finished !== 'boolean') return null;
  if (!value.finished) {
    for (const field of ['creditedFruits', 'earnedGems', 'score', 'creditedSpecialShakes']) {
      if (value[field] !== undefined && (!Number.isSafeInteger(value[field]) || value[field] < 0)) return null;
    }
    const lastRevivalTick = value.lastRevivalTick === undefined ? -1 : value.lastRevivalTick;
    if (!Number.isSafeInteger(lastRevivalTick) || lastRevivalTick < -1) return null;
    return { id: value.id, mode:RUN_MODES.has(value.mode)?value.mode:'classic', finished: false, result: null, creditedFruits: value.creditedFruits ?? 0, earnedGems: value.earnedGems ?? 0, score: value.score ?? 0, lastRevivalTick, creditedSpecialShakes: value.creditedSpecialShakes ?? 0, gemMergeId:whole(value.gemMergeId) };
  }
  const receipt = cleanReceipt({ ...value.result, id: value.id });
  return receipt ? completedRun(receipt) : null;
}

function validRevivalId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,180}$/.test(id);
}

function cleanRevivalReceipt(value) {
  return value && validRevivalId(value.requestId) && validRunId(value.runId) && value.cost === REVIVAL_COST && Number.isSafeInteger(value.paidAt) && value.paidAt >= 0
    ? { requestId: value.requestId, runId: value.runId, cost: REVIVAL_COST, paidAt: value.paidAt } : null;
}

function cleanRevivalRecovery(value, activeRun) {
  const receipt = cleanRevivalReceipt(value);
  if (!receipt || activeRun?.finished || activeRun?.id !== receipt.runId) return null;
  try {
    const snapshot = normalizeGameRecord(value.snapshot);
    if (snapshot.runId !== receipt.runId || !['playing', 'paused'].includes(snapshot.world.state)) return null;
    return { ...receipt, snapshot };
  } catch { return null; }
}

/** Scores, gems, and purchased skins are saved only on this device. */
export class GardenProgress {
  constructor({ onChange = () => {}, onError = () => {}, storage } = {}) {
    this.onChange = typeof onChange === 'function' ? onChange : () => {};
    this.onError = typeof onError === 'function' ? onError : () => {};
    try { this.storage = storage === undefined ? globalThis.localStorage : storage; } catch { this.storage = null; }
    const loaded = this._load();
    this._profile = loaded.profile;
    this.pendingRun = loaded.activeRun;
    this._settledRuns = loaded.settledRuns;
    this._migrations = loaded.migrations;
    this.refundedToolGems = loaded.refundedToolGems;
    this._revivalReceipts = loaded.revivalReceipts;
    this._pendingRevival = loaded.pendingRevival;
    this.storageAvailable = false;
    this._queue = Promise.resolve();
    this._nextRun = 0;
  }

  get profile() { return this._profile; }

  _load() {
    let value = {}, oldBest = 0;
    try { value = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '{}') || {}; } catch {}
    try { oldBest = whole(this.storage?.getItem(BEST_KEY)); } catch {}
    const profile = cleanProgress(value);
    profile.bestScore = Math.max(profile.bestScore, oldBest);
    const alreadyRefunded = value?.migrations?.removedToolsV9 === true;
    const refund = alreadyRefunded ? 0 : Object.entries(REMOVED_TOOL_PRICES).reduce((sum, [id, price]) => sum + Math.min(ITEM_LIMIT, whole(value?.inventory?.[id])) * price, 0);
    const refundedToolGems = Math.min(refund, Number.MAX_SAFE_INTEGER - profile.gems);
    profile.gems += refundedToolGems;
    const settledRuns = [];
    const seen = new Set();
    for (const item of Array.isArray(value?.settledRuns) ? value.settledRuns : []) {
      const receipt = cleanReceipt(item);
      if (!receipt || seen.has(receipt.id)) continue;
      seen.add(receipt.id);
      settledRuns.push(receipt);
      if (settledRuns.length === RECEIPT_LIMIT) break;
    }
    let activeRun = cleanActiveRun(value?.activeRun);
    if(activeRun&&!activeRun.finished&&value?.activeRun?.mode===undefined){
      try{
        const raw=JSON.parse(this.storage?.getItem('suika-garden-run-v1')||'null');
        const saved=raw?normalizeGameRecord(raw):null;
        if(saved?.runId===activeRun.id)activeRun.mode=saved.mode;
      }catch{}
    }
    if (activeRun) {
      const receipt = settledRuns.find(item => item.id === activeRun.id);
      if (receipt) activeRun = completedRun(receipt);
      else if (activeRun.finished) {
        settledRuns.unshift({ id: activeRun.id, ...activeRun.result });
        settledRuns.length = Math.min(settledRuns.length, RECEIPT_LIMIT);
      }
    }
    const revivalReceipts = [], revivalIds = new Set();
    for (const item of Array.isArray(value?.revivalReceipts) ? value.revivalReceipts : []) {
      const receipt = cleanRevivalReceipt(item);
      if (!receipt || revivalIds.has(receipt.requestId)) continue;
      revivalReceipts.push(receipt); revivalIds.add(receipt.requestId);
      if (revivalReceipts.length >= RECEIPT_LIMIT) break;
    }
    const pendingRevival = cleanRevivalRecovery(value?.pendingRevival, activeRun);
    if(pendingRevival&&value?.activeRun?.mode===undefined)activeRun.mode=pendingRevival.snapshot.mode;
    if (pendingRevival && !revivalIds.has(pendingRevival.requestId)) {
      const { snapshot, ...receipt } = pendingRevival;
      revivalReceipts.unshift(receipt); revivalReceipts.length = Math.min(revivalReceipts.length, RECEIPT_LIMIT);
    }
    return { profile, activeRun, settledRuns, migrations: { removedToolsV9: true }, refundedToolGems, revivalReceipts, pendingRevival };
  }

  _save() {
    // Storage may be disabled or full. The current session remains playable.
    let saved = false;
    try {
      if (this.storage && typeof this.storage.setItem === 'function') {
        // Wallet and completion receipts share one localStorage write. A stale
        // board cannot earn its reward a second time after a successful write.
        this.storage.setItem(STORAGE_KEY, JSON.stringify({
          ...this._profile,
          activeRun: this.pendingRun,
          settledRuns: this._settledRuns,
          migrations: this._migrations,
          revivalReceipts: this._revivalReceipts,
          pendingRevival: this._pendingRevival,
        }));
        saved = true;
      }
    } catch {}
    try { this.storage?.setItem(BEST_KEY, String(this._profile.bestScore)); } catch {}
    this.storageAvailable = saved;
    return saved;
  }

  _emit() { this.onChange(this.profile, this); }

  _mutate(operation) {
    const result = this._queue.then(operation);
    this._queue = result.catch(() => {});
    return result.catch(error => {
      this.onError(error);
      throw error;
    });
  }

  async init() {
    return this._mutate(() => {
      this._save();
      this._emit();
      return this.profile;
    });
  }

  canResumeRun(runId) {
    return validRunId(runId) && (this.pendingRun?.id === runId || this._settledRuns.some(receipt => receipt.id === runId));
  }

  async resumeRun(runId) {
    return this._mutate(() => {
      if (!validRunId(runId)) return null;
      const receipt = this._settledRuns.find(item => item.id === runId);
      if (receipt) {
        if (this.pendingRun?.id === runId) this.pendingRun = completedRun(receipt);
        return { runId, finished: true };
      }
      if (this.pendingRun?.id === runId) return { runId, finished: this.pendingRun.finished };
      return null;
    });
  }

  async startRun({ fresh = false, mode='classic' } = {}) {
    return this._mutate(() => {
      if(!RUN_MODES.has(mode))throw progressError('플레이 모드를 확인해 주세요.','INVALID_MODE');
      if (!fresh && this.pendingRun && !this.pendingRun.finished) return { runId: this.pendingRun.id };
      if (this._pendingRevival) throw progressError('구매한 부활 상태를 먼저 불러와 주세요.', 'REVIVAL_PENDING');
      let id;
      do { id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${++this._nextRun}`; }
      while (this.canResumeRun(id));
      this.pendingRun = { id, mode, finished: false, result: null, creditedFruits: 0, earnedGems: 0, score: 0, lastRevivalTick: -1, creditedSpecialShakes: 0 };
      this._save();
      return { runId: id };
    });
  }

  _awardRun(score, mergedFruits, extras = {}) {
    if (!Number.isSafeInteger(score) || score < 0 || !Number.isSafeInteger(mergedFruits) || mergedFruits < 0) {
      throw progressError('게임 기록의 숫자를 확인해 주세요.', 'INVALID_RUN');
    }
    const { specialShakeRewards, discoveredLevels } = runExtras(extras);
    const run = this.pendingRun;
    // A restored board can be older than the durable wallet checkpoint. Keep
    // its high-water mark so those same fruit never count twice.
    const consumed = Math.max(run.creditedFruits, mergedFruits);
    const before = this._profile.mergedFruits;
    const after = Math.min(Number.MAX_SAFE_INTEGER, before + (consumed - run.creditedFruits));
    const availableGems = Math.floor(after / GEM_EVERY) - Math.floor(before / GEM_EVERY);
    const earnedGems = Math.min(availableGems, Number.MAX_SAFE_INTEGER - this._profile.gems);
    this._profile.mergedFruits = after;
    this._profile.gems += earnedGems;
    if(run.mode==='classic'){
      this._profile.bestScore=Math.max(this._profile.bestScore,score);
      this._profile.classicMergedFruits=Math.min(Number.MAX_SAFE_INTEGER,this._profile.classicMergedFruits+(consumed-run.creditedFruits));
    }else{
      this._profile.modeBestScores[run.mode]=Math.max(this._profile.modeBestScores[run.mode],score);
    }
    run.creditedFruits = consumed;
    run.earnedGems = Math.min(Number.MAX_SAFE_INTEGER, run.earnedGems + earnedGems);
    run.score = Math.max(run.score, score);
    const specialShakes = Math.max(run.creditedSpecialShakes, specialShakeRewards);
    for(let i=run.creditedSpecialShakes+1;i<=Math.min(specialShakes,run.creditedSpecialShakes+1998);i++){
      const item=this.specialReward(i);this._profile.inventory[item]=Math.min(ITEM_LIMIT,this._profile.inventory[item]+1);
    }
    run.creditedSpecialShakes = specialShakes;
    this._profile.discoveredLevels = cleanDiscoveredLevels([...this._profile.discoveredLevels, ...discoveredLevels]);
    return earnedGems;
  }

  async checkpointRun(score, mergedFruits, extras = {}) {
    return this._mutate(() => {
      const run = this.pendingRun;
      const receipt = run && this._settledRuns.find(item => item.id === run.id);
      if (!run || run.finished || receipt) {
        if (receipt) this.pendingRun = completedRun(receipt);
        return { earnedGems: 0, earnedShakes: 0, runEarnedGems: this.pendingRun?.earnedGems ?? 0, creditedFruits: this.pendingRun?.creditedFruits ?? 0, creditedSpecialShakes: this.pendingRun?.creditedSpecialShakes ?? 0, profile: this.profile, alreadyFinished: true };
      }
      const beforeShakes = this._profile.inventory.shake;
      const earnedGems = this._awardRun(score, mergedFruits, extras);
      this._save();
      this._emit();
      return { earnedGems, earnedShakes: this._profile.inventory.shake - beforeShakes, runEarnedGems: run.earnedGems, creditedFruits: run.creditedFruits, creditedSpecialShakes: run.creditedSpecialShakes, profile: this.profile, alreadyFinished: false };
    });
  }

  async finishRun(score, mergedFruits, extras = {}) {
    return this._mutate(() => {
      if (this._pendingRevival) throw progressError('구매한 부활 상태를 먼저 불러와 주세요.', 'REVIVAL_PENDING');
      const run = this.pendingRun;
      const existingReceipt = run && this._settledRuns.find(receipt => receipt.id === run.id);
      if (!run || run.finished || existingReceipt) {
        if (existingReceipt) this.pendingRun = completedRun(existingReceipt);
        return { earnedGems: 0, earnedShakes: 0, runEarnedGems: this.pendingRun?.earnedGems ?? 0, creditedSpecialShakes: this.pendingRun?.creditedSpecialShakes ?? 0, profile: this.profile, alreadyFinished: true };
      }
      const beforeShakes = this._profile.inventory.shake;
      const earnedGems = this._awardRun(score, mergedFruits, extras);
      run.finished = true;
      run.result = { mode:run.mode, score: run.score, mergedFruits: run.creditedFruits, earnedGems: run.earnedGems, completedAt: Date.now(), creditedSpecialShakes: run.creditedSpecialShakes };
      this._settledRuns.unshift({ id: run.id, ...run.result });
      this._settledRuns.length = Math.min(this._settledRuns.length, RECEIPT_LIMIT);
      this._save();
      this._emit();
      return { earnedGems, earnedShakes: this._profile.inventory.shake - beforeShakes, runEarnedGems: run.earnedGems, creditedSpecialShakes: run.creditedSpecialShakes, profile: this.profile, alreadyFinished: false };
    });
  }

  async unlockAchievement(id,{mode='classic',runId}={}) {
    return this._mutate(() => {
      const achievement = ACHIEVEMENTS.find(item => item.id === id);
      if (!achievement) throw progressError('이 업적을 찾을 수 없어요.', 'INVALID_ACHIEVEMENT');
      if(mode!=='classic'||(this.pendingRun&&this.pendingRun.mode!=='classic')||(runId&&this.pendingRun?.id!==runId))return {unlocked:false,earnedGems:0,profile:this.profile};
      if (this._profile.unlockedAchievements.includes(id)) return { unlocked: false, earnedGems: 0, profile: this.profile };
      const earnedGems = Math.min(achievement.reward, Number.MAX_SAFE_INTEGER - this._profile.gems);
      this._profile.unlockedAchievements.push(id);
      this._profile.gems += earnedGems;
      this._save();
      this._emit();
      return { unlocked: true, earnedGems, profile: this.profile };
    });
  }

  getPendingRevival() {
    return this._pendingRevival ? JSON.parse(JSON.stringify(this._pendingRevival)) : null;
  }

  async purchaseRevival({ requestId, runId, score, mergedFruits, snapshot } = {}) {
    return this._mutate(() => {
      if (!validRevivalId(requestId) || !validRunId(runId)) throw progressError('부활 요청 정보를 확인해 주세요.', 'INVALID_REVIVAL');
      const receipt = this._revivalReceipts.find(item => item.requestId === requestId);
      if (receipt) {
        if (receipt.runId !== runId) throw progressError('부활 요청 번호가 다른 게임에 사용되었어요.', 'REVIVAL_REQUEST_CONFLICT');
        return { purchased: false, alreadyPurchased: true, profile: this.profile, recovery: this.getPendingRevival()?.requestId === requestId ? this.getPendingRevival() : null };
      }
      if (this._pendingRevival) throw progressError('구매한 부활 상태를 먼저 불러와 주세요.', 'REVIVAL_PENDING');
      if (this.pendingRun?.id !== runId || this.pendingRun.finished || this._settledRuns.some(item => item.id === runId)) throw progressError('이 게임에서는 부활할 수 없어요.', 'REVIVAL_NOT_AVAILABLE');
      let durable;
      try { durable = JSON.parse(this.storage?.getItem(STORAGE_KEY) || 'null'); } catch {}
      if (!durable || durable.activeRun?.id !== runId || durable.activeRun.finished || (Array.isArray(durable.settledRuns) && durable.settledRuns.some(item => item?.id === runId))) throw progressError('진행 중인 게임을 저장한 뒤 다시 시도해 주세요.', 'STORAGE_UNAVAILABLE');
      const board = normalizeGameRecord(snapshot);
      if (board.runId !== runId || board.mode!==this.pendingRun.mode || !['playing', 'paused'].includes(board.world.state) || board.world.score !== score || board.roundCleared !== mergedFruits || !Number.isSafeInteger(board.world.tick) || board.world.tick < 0) throw progressError('부활할 게임판 정보를 확인해 주세요.', 'INVALID_REVIVAL');
      if (board.world.tick <= this.pendingRun.lastRevivalTick) throw progressError('이미 처리한 게임판에서는 다시 결제하지 않아요.', 'REVIVAL_STALE');
      const previous = JSON.parse(JSON.stringify({ profile: this._profile, run: this.pendingRun, receipts: this._revivalReceipts, recovery: this._pendingRevival }));
      try {
        this._awardRun(score, mergedFruits, { specialShakeRewards: board.specialShakeRewards, discoveredLevels: board.discoveredLevels });
        if (this._profile.gems < REVIVAL_COST) throw progressError('부활하려면 보석 10개가 필요해요.', 'INSUFFICIENT_GEMS');
        this._profile.gems -= REVIVAL_COST;
        this.pendingRun.lastRevivalTick = board.world.tick;
        const payment = { requestId, runId, cost: REVIVAL_COST, paidAt: Date.now() };
        this._pendingRevival = { ...payment, snapshot: board };
        this._revivalReceipts.unshift(payment);
        this._revivalReceipts.length = Math.min(this._revivalReceipts.length, RECEIPT_LIMIT);
        if (!this._save()) throw progressError('부활 결제를 저장하지 못했어요. 보석은 차감하지 않았어요.', 'STORAGE_UNAVAILABLE');
      } catch (error) {
        this._profile = previous.profile; this.pendingRun = previous.run;
        this._revivalReceipts = previous.receipts; this._pendingRevival = previous.recovery;
        throw error;
      }
      this._emit();
      return { purchased: true, alreadyPurchased: false, profile: this.profile, recovery: this.getPendingRevival() };
    });
  }

  async acknowledgeRevival(requestId) {
    return this._mutate(() => {
      if (this._pendingRevival?.requestId !== requestId) return false;
      const recovery = this._pendingRevival;
      let board;
      try { board = normalizeGameRecord(JSON.parse(this.storage?.getItem('suika-garden-run-v1') || 'null')); } catch {}
      if (!board || board.runId !== recovery.runId || board.world.state === 'over' || board.world.tick !== recovery.snapshot.world.tick || board.roundCleared !== recovery.snapshot.roundCleared) {
        throw progressError('구매한 부활 게임판을 먼저 저장해 주세요.', 'REVIVAL_NOT_SAVED');
      }
      this._pendingRevival = null;
      if (!this._save()) {
        this._pendingRevival = recovery;
        throw progressError('부활 상태의 저장을 마치지 못했어요. 다시 시도해 주세요.', 'STORAGE_UNAVAILABLE');
      }
      return true;
    });
  }

  async buySkin(id) {
    return this._buyPermanent(id, SKIN_CATALOG, 'ownedSkins', 'INVALID_SKIN');
  }

  async equipSkin(id) {
    return this._equipPermanent(id, SKIN_CATALOG, 'ownedSkins', 'equippedSkin', 'INVALID_SKIN', 'SKIN_NOT_OWNED');
  }

  async buyBackground(id) {
    return this._buyPermanent(id, BACKGROUNDS, 'ownedBackgrounds', 'INVALID_BACKGROUND');
  }

  async equipBackground(id) {
    return this._equipPermanent(id, BACKGROUNDS, 'ownedBackgrounds', 'equippedBackground', 'INVALID_BACKGROUND', 'BACKGROUND_NOT_OWNED');
  }

  async buyBasket(id) {
    return this._buyPermanent(id, BASKETS, 'ownedBaskets', 'INVALID_BASKET');
  }

  async equipBasket(id) {
    return this._equipPermanent(id, BASKETS, 'ownedBaskets', 'equippedBasket', 'INVALID_BASKET', 'BASKET_NOT_OWNED');
  }

  _commitCommerce(change) {
    const previous = JSON.parse(JSON.stringify(this._profile));
    change();
    // A purchase and its balance are one durable wallet entry. If that write
    // fails, leave both sides unchanged and let the caller show a retry message.
    if (!this._save()) {
      this._profile = previous;
      throw progressError('구매 내역을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.', 'STORAGE_UNAVAILABLE');
    }
  }

  _buyPermanent(id, catalog, ownedField, invalidCode) {
    return this._mutate(() => {
      const item = catalog.find(item => item.id === id);
      if (!item) throw progressError('이 상품을 찾을 수 없어요.', invalidCode);
      if (!this._profile[ownedField].includes(id)) {
        if (this._profile.gems < item.price) throw progressError('보석이 부족해요. 과일을 더 합쳐 보세요!', 'INSUFFICIENT_GEMS');
        this._commitCommerce(() => {
          this._profile.gems -= item.price;
          this._profile[ownedField].push(id);
        });
      }
      this._emit();
      return this.profile;
    });
  }

  _equipPermanent(id, catalog, ownedField, equippedField, invalidCode, unownedCode) {
    return this._mutate(() => {
      if (!catalog.some(item => item.id === id)) throw progressError('이 상품을 찾을 수 없어요.', invalidCode);
      if (!this._profile[ownedField].includes(id)) throw progressError('먼저 상품을 구매해 주세요.', unownedCode);
      if (this._profile[equippedField] !== id) this._commitCommerce(() => { this._profile[equippedField] = id; });
      this._emit();
      return this.profile;
    });
  }

  async buyItem(id, quantity = 1) {
    return this._mutate(() => {
      const item = ITEMS.find(item => item.id === id);
      if (!item) throw progressError('이 아이템을 찾을 수 없어요.', 'INVALID_ITEM');
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw progressError('아이템은 한 번에 1~99개 구매할 수 있어요.', 'INVALID_QUANTITY');
      if (this._profile.inventory[id] + quantity > ITEM_LIMIT) throw progressError('아이템은 종류별로 999개까지 보관할 수 있어요.', 'STOCK_LIMIT');
      const cost = item.price * quantity;
      if (this._profile.gems < cost) throw progressError('보석이 부족해요. 과일을 더 합쳐 보세요!', 'INSUFFICIENT_GEMS');
      this._commitCommerce(() => {
        this._profile.gems -= cost;
        this._profile.inventory[id] += quantity;
      });
      this._emit();
      return this.profile;
    });
  }

  specialReward(index) {
    const id=this.pendingRun?.id||'garden';
    let hash=2166136261;for(const c of `${id}:${index}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);
    return (hash>>>0)%2?'shake':'eraser';
  }

  async creditGemMerge(id, amount) {
    return this._mutate(()=>{
      const run=this.pendingRun;
      if(!run||run.finished||this._profile.equippedSkin!=='royalGem'||!Number.isSafeInteger(id)||id<1||![1,10].includes(amount)||id<=(run.gemMergeId||0))return false;
      const before=run.gemMergeId||0,beforeEarned=run.earnedGems;
      try{this._commitCommerce(()=>{run.gemMergeId=id;this._profile.gems=Math.min(Number.MAX_SAFE_INTEGER,this._profile.gems+amount);run.earnedGems+=amount;});}
      catch(error){run.gemMergeId=before;run.earnedGems=beforeEarned;throw error;}
      this._emit();return true;
    });
  }

  async recordHub(seconds=0, watermelons=0) {
    return this._mutate(()=>{this._commitCommerce(()=>{
      this._profile.hubStats.seconds+=Math.max(0,Math.min(60,Math.floor(seconds)));
      this._profile.hubStats.watermelons+=watermelons===1?1:0;
    });this._emit();});
  }

  async claimTier(metric, tier) {
    return this._mutate(()=>{
      const goals={seconds:[300,3600,36000],merges:[100,1000,10000],score:[1000,10000,100000],watermelons:[1,10,100]};
      if(!goals[metric]||![0,1,2].includes(tier))throw progressError('업적을 확인해 주세요.','INVALID_ACHIEVEMENT');
      const values={seconds:this._profile.hubStats.seconds,merges:this._profile.classicMergedFruits,score:this._profile.bestScore,watermelons:this._profile.hubStats.watermelons};
      const key=`${metric}:${tier}`;
      if(values[metric]<goals[metric][tier]||this._profile.hubStats.claims.includes(key))return false;
      this._commitCommerce(()=>{this._profile.hubStats.claims.push(key);this._profile.gems+=[10,30,100][tier];this._profile.inventory.shake=Math.min(999,this._profile.inventory.shake+tier+1);if(tier===2&&!this._profile.ownedHats.includes('crown'))this._profile.ownedHats.push('crown');});
      this._emit();return true;
    });
  }

  async buyHat(id) {await this._buyPermanent(id,HATS,'ownedHats','INVALID_HAT');return this._equipPermanent(id,HATS,'ownedHats','equippedHat','INVALID_HAT','HAT_NOT_OWNED');}

  async consumeItem(id) {
    return this._mutate(() => {
      if (!ITEMS.some(item => item.id === id)) throw progressError('이 아이템을 찾을 수 없어요.', 'INVALID_ITEM');
      if (this._profile.inventory[id] < 1) return { used: false, profile: this.profile };
      this._commitCommerce(() => { this._profile.inventory[id]--; });
      this._emit();
      return { used: true, profile: this.profile };
    });
  }
}
