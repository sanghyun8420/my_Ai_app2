const SAVE_KEY = 'suika-garden-run-v1';
const SAVE_VERSION = 2;
const READ_VERSIONS = new Set([1, 2]);
const MODES = new Set(['classic', 'apple', 'free', 'water', 'space']);
const MAX_BYTES = 512 * 1024;
const MAX_COUNTER = 10_000_000;
const MAX_DATE = 8_640_000_000_000_000;
const COUNTERS = ['dropCount', 'itemCount', 'roundCleared'];
const FLAGS = ['activeSpecial', 'nextSpecial', 'watermelonMade', 'secretDiscovered'];
const LEVELS = ['activeLevel', 'nextLevel', 'maxLevel'];
const TOOL_KEYS = ['eraser', 'calm'];
const MAX_TOOL_TIME = 1_000_003_600;

function saveError(message, code = 'INVALID_SAVE') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function finiteNumber(value, minimum = 0, maximum = Infinity) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function integer(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

/** Accept JSON data only; reject cycles, nonfinite numbers and prototype tricks. */
function validateJson(value, seen = new Set(), depth = 0, budget = { nodes: 0 }) {
  budget.nodes++;
  if (budget.nodes > 100000 || depth > 32) throw saveError('저장할 게임 데이터가 너무 복잡해요.');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw saveError('저장할 게임에 올바르지 않은 숫자가 있어요.');
    return;
  }
  if (typeof value !== 'object' || (!Array.isArray(value) && !plainObject(value))) throw saveError('저장할 게임 형식이 올바르지 않아요.');
  if (seen.has(value)) throw saveError('순환하는 게임 데이터는 저장할 수 없어요.');
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') throw saveError('저장할 게임의 속성이 올바르지 않아요.');
    validateJson(value[key], seen, depth + 1, budget);
  }
  seen.delete(value);
}

function knownRecord(value, savedAt) {
  if (!plainObject(value)) throw saveError('저장된 게임 형식이 올바르지 않아요.');
  const required = ['runId', 'world', 'aimX', 'shakes', 'shakeReadyAt', ...COUNTERS, ...FLAGS, ...LEVELS];
  if (!required.every(key => Object.hasOwn(value, key))) throw saveError('저장된 게임 정보가 부족해요.');
  if (typeof value.runId !== 'string' || !value.runId.trim() || value.runId.length > 128) throw saveError('저장된 게임 번호가 올바르지 않아요.');
  if (!integer(savedAt, 0, MAX_DATE)) throw saveError('저장된 게임 시간이 올바르지 않아요.');
  const world = value.world;
  if (!plainObject(world) || !READ_VERSIONS.has(world.version) || !Array.isArray(world.bodies) || world.bodies.length > 300 ||
      !integer(world.score) || !finiteNumber(world.time) || !['playing', 'paused', 'over'].includes(world.state)) {
    throw saveError('저장된 게임판 정보가 올바르지 않아요.');
  }
  if (!finiteNumber(value.aimX, 8, 592) || !integer(value.shakes, 0, 5) || !finiteNumber(value.shakeReadyAt)) throw saveError('저장된 조작 정보가 올바르지 않아요.');
  if (!COUNTERS.every(key => integer(value[key], 0, MAX_COUNTER)) || !FLAGS.every(key => typeof value[key] === 'boolean') || !LEVELS.every(key => integer(value[key], 0, 13))) throw saveError('저장된 게임 진행 정보가 올바르지 않아요.');
  if ((value.activeSpecial && value.activeLevel !== 4) || (value.nextSpecial && value.nextLevel !== 4)) throw saveError('저장된 반짝이는 사과 정보가 올바르지 않아요.');
  const mode = value.mode === undefined ? 'classic' : value.mode;
  const seedState = value.seedState === undefined ? 0 : value.seedState;
  const totalShakes = value.totalShakes === undefined ? 0 : value.totalShakes;
  if (!MODES.has(mode) || !integer(seedState, 0, 0xffffffff) || !integer(totalShakes, 0, MAX_COUNTER)) throw saveError('저장된 게임 모드 정보가 올바르지 않아요.');
  const specialShakeRewards = value.specialShakeRewards === undefined ? 0 : value.specialShakeRewards;
  const discovered = value.discoveredLevels === undefined ? [] : value.discoveredLevels;
  if (!integer(specialShakeRewards, 0, MAX_COUNTER) || !Array.isArray(discovered) || !Array.from(discovered).every(level => integer(level, 0, 13))) throw saveError('저장된 과일 발견 정보가 올바르지 않아요.');
  const discoveredLevels = [...new Set(discovered)].sort((a, b) => a - b);
  const deadlines = value.toolReadyAt === undefined ? {} : value.toolReadyAt;
  if (!plainObject(deadlines)) throw saveError('저장된 아이템 대기시간이 올바르지 않아요.');
  const toolReadyAt = {};
  for (const id of TOOL_KEYS) {
    const deadline = deadlines[id] === undefined ? 0 : deadlines[id];
    if (!finiteNumber(deadline, 0, Math.min(MAX_TOOL_TIME, world.time + 3600))) throw saveError('저장된 아이템 대기시간이 올바르지 않아요.');
    toolReadyAt[id] = deadline;
  }
  return {
    version: SAVE_VERSION,
    savedAt,
    runId: value.runId,
    world,
    activeLevel: value.activeLevel,
    nextLevel: value.nextLevel,
    activeSpecial: value.activeSpecial,
    nextSpecial: value.nextSpecial,
    aimX: value.aimX,
    shakes: value.shakes,
    shakeReadyAt: value.shakeReadyAt,
    dropCount: value.dropCount,
    itemCount: value.itemCount,
    roundCleared: value.roundCleared,
    maxLevel: value.maxLevel,
    watermelonMade: value.watermelonMade,
    secretDiscovered: value.secretDiscovered,
    mode,
    seedState,
    totalShakes,
    specialShakeRewards,
    discoveredLevels,
    toolReadyAt,
  };
}

function checkSize(text) {
  if (text.length > MAX_BYTES || new TextEncoder().encode(text).byteLength > MAX_BYTES) throw saveError('저장할 게임 데이터가 너무 커요.', 'SAVE_TOO_LARGE');
}

/** Validate and detach a board for an atomic purchase/recovery record, without writing storage. */
export function normalizeGameRecord(record) {
  if (!plainObject(record) || (Object.hasOwn(record, 'version') && !READ_VERSIONS.has(record.version))) throw saveError('저장할 게임 버전이 올바르지 않아요.', 'UNSUPPORTED_SAVE_VERSION');
  validateJson(record);
  const next = knownRecord(record, Date.now());
  const text = JSON.stringify(next);
  checkSize(text);
  return JSON.parse(text);
}

/** One atomic local-storage entry for a resumable game; never touches the wallet. */
export class GameSave {
  constructor({ storage } = {}) {
    this.lastError = null;
    try { this.storage = storage === undefined ? globalThis.localStorage : storage; }
    catch (error) { this.storage = null; this.lastError = error; }
  }

  read() {
    this.lastError = null;
    try {
      if (!this.storage || typeof this.storage.getItem !== 'function') throw saveError('이 브라우저에서 게임 저장소를 사용할 수 없어요.', 'STORAGE_UNAVAILABLE');
      const text = this.storage.getItem(SAVE_KEY);
      if (text === null || text === undefined) return null;
      if (typeof text !== 'string') throw saveError('저장된 게임 형식이 올바르지 않아요.');
      checkSize(text);
      const value = JSON.parse(text);
      if (!plainObject(value) || !READ_VERSIONS.has(value.version)) throw saveError('이 저장된 게임 버전을 읽을 수 없어요.', 'UNSUPPORTED_SAVE_VERSION');
      validateJson(value);
      // Parsing creates detached plain data; picking known fields drops stale app fields.
      return knownRecord(value, value.savedAt);
    } catch (error) { this.lastError = error; return null; }
  }

  write(record) {
    this.lastError = null;
    try {
      if (!this.storage || typeof this.storage.setItem !== 'function') throw saveError('이 브라우저에서 게임 저장소를 사용할 수 없어요.', 'STORAGE_UNAVAILABLE');
      const next = normalizeGameRecord(record);
      const text = JSON.stringify(next);
      // Validate completely before this single write, so a bad save preserves the old one.
      this.storage.setItem(SAVE_KEY, text);
      return true;
    } catch (error) { this.lastError = error; return false; }
  }

  clear() {
    this.lastError = null;
    try {
      if (!this.storage || typeof this.storage.removeItem !== 'function') throw saveError('이 브라우저에서 게임 저장소를 사용할 수 없어요.', 'STORAGE_UNAVAILABLE');
      this.storage.removeItem(SAVE_KEY);
      return true;
    } catch (error) { this.lastError = error; return false; }
  }
}
