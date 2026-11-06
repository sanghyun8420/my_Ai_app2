const PREFERENCES_KEY = 'suika-garden-preferences-v1';
const THEMES = new Set(['light', 'dark']);
const MODES = new Set(['classic', 'apple', 'free', 'water', 'space', 'watermelon', 'timed', 'challenge']);
const DEFAULTS = Object.freeze({
  theme: 'light',
  sound: true,
  volume: 0.55,
  music: true,
  musicVolume: 0.45,
  effects: true,
  effectsVolume: 0.8,
  pageColor: null,
  boardColor: null,
  unlockedModes: Object.freeze(['classic']),
});

function resolveStorage(storage) {
  try { return storage === undefined ? globalThis.localStorage : storage; }
  catch { return null; }
}

function normalize(value, previous = DEFAULTS) {
  const next = {
    theme: previous.theme,
    sound: previous.sound,
    volume: previous.volume,
    music: previous.music,
    musicVolume: previous.musicVolume,
    effects: previous.effects,
    effectsVolume: previous.effectsVolume,
    pageColor:previous.pageColor,
    boardColor:previous.boardColor,
    unlockedModes: [...previous.unlockedModes],
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return next;
  if (THEMES.has(value.theme)) next.theme = value.theme;
  for(const field of ['pageColor','boardColor']){
    if(value[field]===null)next[field]=null;
    else if(typeof value[field]==='string'&&/^#[0-9a-f]{6}$/i.test(value[field]))next[field]=value[field].toLowerCase();
  }
  if (typeof value.sound === 'boolean') next.sound = value.sound;
  for (const field of ['music','effects']) if (typeof value[field] === 'boolean') next[field] = value[field];
  for (const field of ['musicVolume','effectsVolume']) if (typeof value[field] === 'number' && Number.isFinite(value[field])) next[field] = Math.max(0, Math.min(1, value[field]));
  if (typeof value.volume === 'number' && Number.isFinite(value.volume)) {
    next.volume = Math.max(0, Math.min(1, value.volume));
  }
  if (Array.isArray(value.unlockedModes)) {
    next.unlockedModes = ['classic', ...new Set(value.unlockedModes.filter(mode => mode !== 'classic' && MODES.has(mode)))];
  }
  return next;
}

/** Read local settings without requiring browser storage to be available. */
export function loadPreferences(storage) {
  try {
    const target = resolveStorage(storage);
    if (!target || typeof target.getItem !== 'function') return normalize(null);
    const text = target.getItem(PREFERENCES_KEY);
    return normalize(text == null ? null : JSON.parse(text));
  } catch { return normalize(null); }
}

/** Merge a partial update; the returned settings can also be used offline. */
export function savePreferences(next, storage) {
  const target = resolveStorage(storage);
  const preferences = normalize(next, loadPreferences(target));
  try {
    if (target && typeof target.setItem === 'function') target.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch { /* Settings remain usable for this session if storage is unavailable. */ }
  return preferences;
}
