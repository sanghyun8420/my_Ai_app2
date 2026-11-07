const COOKIE = '__Host-suika_social';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const LIMIT_MS = 600000;
const ITERATIONS = 100000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_SCORE = 100000000;
const GAMES = new Set(['suika','apple','blocks']);
const MODES = new Set(['classic', 'apple', 'free', 'water', 'space', 'watermelon', 'timed', 'challenge', 'science']);
const EXTERNAL_GAME_ORIGINS = new Set(['https://sanghyun8420.github.io']);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
class ApiError extends Error {
  constructor(status, code, message, headers = {}) { super(message); Object.assign(this, { status, code, headers }); }
}
const fail = (status, code, message, headers) => { throw new ApiError(status, code, message, headers); };
const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
const rows = async statement => (await statement.all()).results || [];
const changes = result => Number(result?.meta?.changes ?? result?.changes ?? 0);
const timestamp = () => Date.now();
const integer = (value, max = MAX_SCORE) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const publicAccount = user => user ? { id: user.id, username: user.username, displayName: user.display_name, friendCode: user.friend_code, bestScore: user.best_score } : null;
function encoded(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''); }
function decoded(text) {
  const padded = text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - text.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}
function randomToken(size = 32) { return encoded(crypto.getRandomValues(new Uint8Array(size))); }
function randomCode(length) { return Array.from(crypto.getRandomValues(new Uint8Array(length)), byte => ALPHABET[byte & 31]).join(''); }
async function hash(value) { return encoded(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
async function passwordHash(password, salt, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}
function constantEqual(a, b) {
  let different = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index++) different |= (a[index] || 0) ^ (b[index] || 0);
  return different === 0;
}
function username(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(value)) fail(400, 'INVALID_USERNAME', '아이디는 영문·숫자·밑줄로 3~20자 입력해 주세요.');
  return value.toLowerCase();
}
function password(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) fail(400, 'INVALID_PASSWORD', '비밀번호는 8~128자로 입력해 주세요.');
  return value;
}
function displayName(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') fail(400, 'INVALID_DISPLAY_NAME', '별명을 확인해 주세요.');
  const name = value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim();
  if (!name || [...name].length > 16) fail(400, 'INVALID_DISPLAY_NAME', '별명은 1~16자로 입력해 주세요.');
  return name;
}
async function bodyJson(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) fail(415, 'JSON_REQUIRED', 'JSON 형식으로 다시 요청해 주세요.');
  if (Number(request.headers.get('Content-Length')) > 16384) fail(413, 'BODY_TOO_LARGE', '요청이 너무 큽니다.');
  const reader = request.body?.getReader(), decoder = new TextDecoder();
  let text = '', size = 0;
  if (reader) {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16384) { await reader.cancel(); fail(413, 'BODY_TOO_LARGE', '요청이 너무 큽니다.'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  }
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { fail(400, 'INVALID_JSON', '요청 형식을 확인해 주세요.'); }
}
function externalGame(request) {
  return EXTERNAL_GAME_ORIGINS.has(request.headers.get('Origin'));
}
function checkOrigin(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin && !externalGame(request)) fail(403, 'ORIGIN_REJECTED', '수박정원 화면에서 다시 시도해 주세요.');
}
function cookie(token, maxAge = SESSION_MS / 1000) { return `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax${maxAge===null?'':`; Max-Age=${maxAge}`}`; }
function sessionToken(request) {
  const authorization = request.headers.get('Authorization');
  if (authorization !== null) return authorization.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1] || null;
  // The external game authenticates explicitly; cookies stay on the original site.
  if (externalGame(request)) return null;
  return (request.headers.get('Cookie') || '').match(/(?:^|;\s*)__Host-suika_social=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1] || null;
}
async function optionalAccount(request, db) {
  const token = sessionToken(request); if (!token) return null;
  return stmt(db, 'SELECT a.* FROM garden_sessions s JOIN garden_accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?', await hash(token), timestamp()).first();
}
async function account(request, db) {
  const user = await optionalAccount(request, db);
  if (!user) fail(401, 'SIGN_IN_REQUIRED', '회원가입하거나 로그인해 주세요.');
  return user;
}
async function newSession(db, user, request, remember=true) {
  const token = randomToken(), time = timestamp();
  await stmt(db, 'INSERT INTO garden_sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)', await hash(token), user.id, time, time + SESSION_MS).run();
  return externalGame(request)
    ? json({ user: publicAccount(user), accessToken: token })
    : json({ user: publicAccount(user) }, 200, { 'Set-Cookie': cookie(token,remember?SESSION_MS/1000:null) });
}
async function authLimit(db, request, name) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const keys = [await hash(`pair:${name}:${ip}`), await hash(`ip:${ip}`)], time = timestamp();
  const upsert = key => stmt(db, 'INSERT INTO garden_login_limits (key_hash, window_started, attempts) VALUES (?, ?, 1) ON CONFLICT(key_hash) DO UPDATE SET attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END, window_started = CASE WHEN window_started <= ? THEN excluded.window_started ELSE window_started END', key, time, time - LIMIT_MS, time - LIMIT_MS);
  await db.batch([upsert(keys[0]), upsert(keys[1]), stmt(db, 'DELETE FROM garden_login_limits WHERE key_hash IN (SELECT key_hash FROM garden_login_limits WHERE window_started < ? LIMIT 25)', time - LIMIT_MS * 2)]);
  for (let index = 0; index < keys.length; index++) {
    const limit = await stmt(db, 'SELECT * FROM garden_login_limits WHERE key_hash = ?', keys[index]).first();
    if (limit.attempts > (index === 0 ? 8 : 40)) fail(429, 'TOO_MANY_ATTEMPTS', '로그인을 너무 많이 시도했어요. 잠시 후 다시 시도해 주세요.', { 'Retry-After': String(Math.max(1, Math.ceil((limit.window_started + LIMIT_MS - time) / 1000))) });
  }
  return keys[0];
}
function pair(a, b) { return a < b ? [a, b] : [b, a]; }
function validAccountId(value) { return typeof value === 'string' && /^ga_[A-Za-z0-9_-]{24}$/.test(value); }
async function friendList(db, user) {
  const records = await rows(stmt(db, 'SELECT a.id, a.username, a.display_name, f.status, f.requested_by FROM garden_friends f JOIN garden_accounts a ON a.id = CASE WHEN f.account_low = ? THEN f.account_high ELSE f.account_low END WHERE f.account_low = ? OR f.account_high = ? ORDER BY f.status ASC, a.display_name ASC, a.username ASC', user.id, user.id, user.id));
  return records.map(row => ({ id: row.id, username: row.username, displayName: row.display_name, status: row.status === 'accepted' ? 'accepted' : row.requested_by === user.id ? 'outgoing' : 'incoming' }));
}
async function friendship(db, a, b, accepted) {
  const [low, high] = pair(a, b), time = timestamp();
  await stmt(db, "INSERT INTO garden_friends (account_low, account_high, requested_by, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(account_low, account_high) DO UPDATE SET status = CASE WHEN excluded.status = 'accepted' OR garden_friends.requested_by != excluded.requested_by THEN 'accepted' ELSE garden_friends.status END, updated_at = excluded.updated_at", low, high, a, accepted ? 'accepted' : 'pending', time, time).run();
}
function roomCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!/^[A-Z2-9]{7}$/.test(code)) fail(400, 'INVALID_ROOM_CODE', '방 코드 7자리를 확인해 주세요.');
  return code;
}
async function roomRecord(db, code) {
  const room = await stmt(db, 'SELECT * FROM garden_rooms WHERE code = ?', code).first();
  if (!room) fail(404, 'ROOM_NOT_FOUND', '이 방을 찾을 수 없어요.');
  if (room.expires_at <= timestamp()) fail(410, 'ROOM_EXPIRED', '방의 유효 시간이 지났어요. 새 방을 만들어 주세요.');
  return room;
}
async function roomView(db, room, user, requireMember = true) {
  const players = await rows(stmt(db, 'SELECT a.id, a.display_name, p.score, p.fruit_count, p.playing, p.updated_at FROM garden_room_players p JOIN garden_accounts a ON a.id = p.account_id WHERE p.room_id = ? ORDER BY p.joined_at ASC, a.id ASC', room.id));
  if (requireMember && !players.some(player => player.id === user.id)) fail(403, 'ROOM_MEMBERS_ONLY', '방 코드로 먼저 참가해 주세요.');
  return { id: room.id, code: room.code, seed: room.seed, game:room.game||'suika', mode: room.mode, hostId: room.host_id, expiresAt: room.expires_at,
    players: players.map(player => ({ id: player.id, displayName: player.display_name, score: player.score, fruitCount: player.fruit_count, playing: !!player.playing, updatedAt: player.updated_at })) };
}

async function route(request, env) {
  const path = new URL(request.url).pathname, method = request.method;
  if (!env.DB) fail(503, 'DATABASE_NOT_CONFIGURED', '계정과 친구 저장소를 준비 중입니다.');
  const db = env.DB;
  if(path==='/api/leaderboard'&&method==='GET'){
    const game=new URL(request.url).searchParams.get('game')||'suika';
    if(!GAMES.has(game))fail(400,'INVALID_GAME','게임을 확인해 주세요.');
    const scores=game==='suika'?await rows(stmt(db,'SELECT a.id,a.display_name AS displayName,MAX(a.best_score,COALESCE(g.best_score,0)) AS score FROM garden_accounts a LEFT JOIN garden_game_scores g ON g.account_id=a.id AND g.game=? WHERE MAX(a.best_score,COALESCE(g.best_score,0))>0 ORDER BY score DESC,a.id LIMIT 50',game)):
      await rows(stmt(db,'SELECT a.id,a.display_name AS displayName,g.best_score AS score FROM garden_game_scores g JOIN garden_accounts a ON a.id=g.account_id WHERE g.game=? AND g.best_score>0 ORDER BY g.best_score DESC,a.id LIMIT 50',game));
    return json({game,scores,notice:'클라이언트 제출 기록 · 기기 점수는 검증되지 않습니다.'});
  }
  if (method === 'POST') checkOrigin(request);
  if(path==='/api/messages'&&['GET','POST'].includes(method)){
    const user=await account(request,db),body=method==='POST'?await bodyJson(request):null;
    const friend=body?.friendId||new URL(request.url).searchParams.get('friend');
    if(!validAccountId(friend))fail(400,'INVALID_FRIEND','친구를 선택해 주세요.');
    const [low,high]=pair(user.id,friend);
    if(!await stmt(db,"SELECT account_low FROM garden_friends WHERE account_low=? AND account_high=? AND status='accepted'",low,high).first())fail(403,'FRIENDS_ONLY','수락한 친구에게만 메시지를 보낼 수 있어요.');
    if(method==='POST'){
      const text=typeof body.text==='string'?body.text.trim():'';
      if(!text||text.length>500)fail(400,'INVALID_MESSAGE','메시지는 1~500자로 적어 주세요.');
      let room=null;if(body.roomCode){room=await roomRecord(db,roomCode(body.roomCode));if(!await stmt(db,'SELECT account_id FROM garden_room_players WHERE room_id=? AND account_id=?',room.id,user.id).first())fail(403,'ROOM_MEMBERS_ONLY','참여한 방만 공유할 수 있어요.');}
      const time=timestamp();const result=await stmt(db,'INSERT INTO garden_messages(sender_id,receiver_id,body,room_code,created_at) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM garden_messages WHERE sender_id=? AND created_at>?)<20',user.id,friend,text,room?.code||null,time,user.id,time-60000).run();
      if(!changes(result))fail(429,'MESSAGE_LIMIT','잠깐 쉬었다가 보내 주세요.');
    }
    const messages=await rows(stmt(db,'SELECT id,sender_id AS senderId,receiver_id AS receiverId,body AS text,room_code AS roomCode,created_at AS createdAt FROM garden_messages WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY id DESC LIMIT 80',user.id,friend,friend,user.id));
    return json({messages:messages.reverse()});
  }
  if (path === '/api/me' && method === 'GET') return json({ user: publicAccount(await optionalAccount(request, db)) });
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await bodyJson(request), name = username(body.username), secret = password(body.password), display = displayName(body.displayName, name);
    if(!/[a-zA-Z]/.test(secret)||!/[0-9]/.test(secret))fail(400,'WEAK_PASSWORD','비밀번호는 8~128자이며 영문과 숫자를 각각 포함해야 해요.');
    const limitKey = await authLimit(db, request, name);
    const existing = await stmt(db, 'SELECT id FROM garden_accounts WHERE username = ?', name).first();
    if (existing) fail(409, 'USERNAME_TAKEN', '이미 사용 중인 아이디예요. 다른 아이디를 골라 주세요.');
    const salt = crypto.getRandomValues(new Uint8Array(16)), hashed = await passwordHash(secret, salt), time = timestamp();
    const id = `ga_${randomToken(18)}`, friendCode = `SG-${randomCode(8)}`;
    try { await stmt(db, 'INSERT INTO garden_accounts (id, username, display_name, friend_code, password_salt, password_hash, password_iterations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', id, name, display, friendCode, encoded(salt), encoded(hashed), ITERATIONS, time, time).run(); }
    catch (error) {
      if (await stmt(db, 'SELECT id FROM garden_accounts WHERE username = ?', name).first()) fail(409, 'USERNAME_TAKEN', '이미 사용 중인 아이디예요. 다른 아이디를 골라 주세요.');
      throw error;
    }
    await stmt(db, 'DELETE FROM garden_login_limits WHERE key_hash = ?', limitKey).run();
    const response = await newSession(db, await stmt(db, 'SELECT * FROM garden_accounts WHERE id = ?', id).first(), request, body.remember!==false);
    return new Response(response.body, { status: 201, headers: response.headers });
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const body = await bodyJson(request), name = username(body.username), secret = password(body.password);
    const limitKey = await authLimit(db, request, name);
    const user = await stmt(db, 'SELECT * FROM garden_accounts WHERE username = ?', name).first();
    const salt = user ? decoded(user.password_salt) : new Uint8Array(16);
    const tested = await passwordHash(secret, salt, user?.password_iterations || ITERATIONS);
    if (!user || !constantEqual(tested, decoded(user.password_hash))) fail(401, 'INVALID_CREDENTIALS', '아이디 또는 비밀번호가 맞지 않아요.');
    await stmt(db, 'DELETE FROM garden_login_limits WHERE key_hash = ?', limitKey).run();
    return newSession(db, user, request, body.remember!==false);
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    await bodyJson(request); const token = sessionToken(request);
    if (token) await stmt(db, 'DELETE FROM garden_sessions WHERE token_hash = ?', await hash(token)).run();
    return json({ user: null }, 200, externalGame(request) ? {} : { 'Set-Cookie': cookie('', 0) });
  }
  if (path === '/api/profile/stats' && method === 'POST') {
    const user = await account(request, db), body = await bodyJson(request);
    if (!integer(body.score)) fail(400, 'INVALID_SCORE', '점수는 0~100,000,000 사이의 정수여야 해요.');
    const game=body.game??'suika';if(!GAMES.has(game))fail(400,'INVALID_GAME','게임을 확인해 주세요.');
    const classic = (body.mode ?? 'classic') === 'classic';
    if(classic)await stmt(db,'INSERT INTO garden_game_scores(account_id,game,best_score,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,game) DO UPDATE SET best_score=MAX(best_score,excluded.best_score),updated_at=excluded.updated_at',user.id,game,body.score,timestamp()).run();
    if(game!=='suika')return json({user:publicAccount(user)});
    if (classic) await stmt(db, 'UPDATE garden_accounts SET best_score = MAX(best_score, ?), updated_at = ? WHERE id = ?', body.score, timestamp(), user.id).run();
    return json({ user: publicAccount(await stmt(db, 'SELECT * FROM garden_accounts WHERE id = ?', user.id).first()), updated: classic });
  }
  if (path === '/api/friends' && method === 'GET') { const user = await account(request, db); return json({ friends: await friendList(db, user) }); }
  if (path === '/api/friends/request' && method === 'POST') {
    const user = await account(request, db), body = await bodyJson(request);
    const query = typeof body.usernameOrCode === 'string' ? body.usernameOrCode.trim() : '';
    if (query.length > 32 || !query) fail(400, 'INVALID_FRIEND', '친구의 아이디나 친구 코드를 입력해 주세요.');
    const target = await stmt(db, 'SELECT id FROM garden_accounts WHERE username = ? OR friend_code = ? LIMIT 1', query.toLowerCase(), query.toUpperCase()).first();
    if (!target) fail(404, 'FRIEND_NOT_FOUND', '친구를 찾지 못했어요. 아이디나 친구 코드를 확인해 주세요.');
    if (target.id === user.id) fail(400, 'CANNOT_FRIEND_SELF', '내 계정은 친구로 추가할 수 없어요.');
    await friendship(db, user.id, target.id, false);
    return json({ friends: await friendList(db, user) });
  }
  if (path === '/api/friends/respond' && method === 'POST') {
    const user = await account(request, db), body = await bodyJson(request);
    if (!validAccountId(body.friendId) || typeof body.accept !== 'boolean') fail(400, 'INVALID_FRIEND_RESPONSE', '친구 요청을 다시 확인해 주세요.');
    const [low, high] = pair(user.id, body.friendId);
    const relation = await stmt(db, 'SELECT * FROM garden_friends WHERE account_low = ? AND account_high = ?', low, high).first();
    if (!relation || relation.status !== 'pending' || relation.requested_by === user.id) fail(404, 'REQUEST_NOT_FOUND', '받은 친구 요청을 찾지 못했어요.');
    if (body.accept) await stmt(db, "UPDATE garden_friends SET status = 'accepted', updated_at = ? WHERE account_low = ? AND account_high = ? AND status = 'pending' AND requested_by != ?", timestamp(), low, high, user.id).run();
    else await stmt(db, "DELETE FROM garden_friends WHERE account_low = ? AND account_high = ? AND status = 'pending' AND requested_by != ?", low, high, user.id).run();
    return json({ friends: await friendList(db, user) });
  }
  if (path === '/api/friends/remove' && method === 'POST') {
    const user = await account(request, db), body = await bodyJson(request);
    if (!validAccountId(body.friendId)) fail(400, 'INVALID_FRIEND', '친구 정보를 확인해 주세요.');
    const [low, high] = pair(user.id, body.friendId);
    await stmt(db, 'DELETE FROM garden_friends WHERE account_low = ? AND account_high = ?', low, high).run();
    return json({ friends: await friendList(db, user) });
  }
  if (path === '/api/invites' && method === 'POST') {
    const user = await account(request, db); await bodyJson(request);
    const token = randomToken(), time = timestamp();
    await stmt(db, 'INSERT INTO garden_invites (token_hash, owner_id, created_at, expires_at) VALUES (?, ?, ?, ?)', await hash(token), user.id, time, time + 7 * 86400000).run();
    return json({ token, url: `${new URL(request.url).origin}/?invite=${encodeURIComponent(token)}` }, 201);
  }
  if (path === '/api/invites/accept' && method === 'POST') {
    const user = await account(request, db), body = await bodyJson(request);
    if (typeof body.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) fail(400, 'INVALID_INVITE', '초대 링크가 올바르지 않아요.');
    const invite = await stmt(db, 'SELECT * FROM garden_invites WHERE token_hash = ?', await hash(body.token)).first();
    if (!invite || invite.expires_at <= timestamp()) fail(410, 'INVITE_EXPIRED', '초대 링크가 만료됐어요. 친구에게 새 링크를 받아 주세요.');
    if (invite.owner_id === user.id) fail(400, 'CANNOT_FRIEND_SELF', '내 초대 링크는 수락할 수 없어요.');
    await friendship(db, invite.owner_id, user.id, true);
    return json({ friends: await friendList(db, user) });
  }
  if (path === '/api/rooms' && method === 'POST') {
    const user = await account(request, db), body = await bodyJson(request), mode = body.mode ?? 'classic';
    const game=body.game??'suika';if(!GAMES.has(game))fail(400,'INVALID_GAME','게임을 확인해 주세요.');
    if (!MODES.has(mode)) fail(400, 'INVALID_MODE', '게임 모드를 확인해 주세요.');
    const id = `gr_${randomToken(18)}`, code = randomCode(7), time = timestamp(), seed = crypto.getRandomValues(new Uint32Array(1))[0];
    await db.batch([
      stmt(db, 'INSERT INTO garden_rooms (id, code, host_id, seed, mode, game, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, code, user.id, seed, mode, game, time, time + 86400000),
      stmt(db, 'INSERT INTO garden_room_players (room_id, account_id, joined_at, updated_at) VALUES (?, ?, ?, ?)', id, user.id, time, time),
    ]);
    return json({ room: await roomView(db, await roomRecord(db, code), user) }, 201);
  }
  if (path === '/api/rooms/join' && method === 'POST') {
    const user = await account(request, db), body = await bodyJson(request), code = roomCode(body.code), room = await roomRecord(db, code), time = timestamp();
    await stmt(db, 'INSERT OR IGNORE INTO garden_room_players (room_id, account_id, joined_at, updated_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM garden_room_players WHERE room_id = ?) < 4', room.id, user.id, time, time, room.id).run();
    const joined = await stmt(db, 'SELECT account_id FROM garden_room_players WHERE room_id = ? AND account_id = ?', room.id, user.id).first();
    if (!joined) fail(409, 'ROOM_FULL', '이 방은 4명이 모두 참가했어요. 새 방을 만들어 주세요.');
    return json({ room: await roomView(db, room, user) });
  }
  const roomMatch = path.match(/^\/api\/rooms\/([A-Za-z2-9]{7})(?:\/(state|leave))?$/);
  if (roomMatch) {
    const user = await account(request, db), code = roomCode(roomMatch[1]), room = await roomRecord(db, code);
    if (!roomMatch[2] && method === 'GET') return json({ room: await roomView(db, room, user) });
    if (roomMatch[2] === 'state' && method === 'POST') {
      const body = await bodyJson(request);
      if (!integer(body.score) || !integer(body.fruitCount, 10000) || typeof body.playing !== 'boolean') fail(400, 'INVALID_ROOM_STATE', '점수와 과일 상태를 확인해 주세요.');
      const updated = await stmt(db, 'UPDATE garden_room_players SET score = MAX(score, ?), fruit_count = ?, playing = ?, updated_at = ? WHERE room_id = ? AND account_id = ?', body.score, body.fruitCount, body.playing ? 1 : 0, timestamp(), room.id, user.id).run();
      if (!changes(updated)) fail(403, 'ROOM_MEMBERS_ONLY', '방에 참가한 뒤 기록을 보낼 수 있어요.');
      return json({ room: await roomView(db, room, user) });
    }
    if (roomMatch[2] === 'leave' && method === 'POST') {
      await bodyJson(request);
      if (!await stmt(db, 'SELECT account_id FROM garden_room_players WHERE room_id = ? AND account_id = ?', room.id, user.id).first()) fail(403, 'ROOM_MEMBERS_ONLY', '참가한 방에서만 나갈 수 있어요.');
      await db.batch([
        stmt(db, 'DELETE FROM garden_room_players WHERE room_id = ? AND account_id = ?', room.id, user.id),
        stmt(db, 'UPDATE garden_rooms SET host_id = COALESCE((SELECT account_id FROM garden_room_players WHERE room_id = ? ORDER BY joined_at ASC, account_id ASC LIMIT 1), host_id) WHERE id = ? AND host_id = ?', room.id, room.id, user.id),
        stmt(db, 'DELETE FROM garden_rooms WHERE id = ? AND NOT EXISTS (SELECT 1 FROM garden_room_players WHERE room_id = ?)', room.id, room.id),
      ]);
      return json({ room: null });
    }
  }
  fail(404, 'NOT_FOUND', '요청한 기능을 찾을 수 없어요.');
}

export async function handleApi(request, env, ctx) {
  const origin = request.headers.get('Origin');
  const external = origin && origin !== new URL(request.url).origin;
  if (external && !externalGame(request)) return json({ error: '수박정원 화면에서 다시 시도해 주세요.', code: 'ORIGIN_REJECTED' }, 403);
  const cors = external ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  } : {};
  if (request.method === 'OPTIONS') {
    const method = request.headers.get('Access-Control-Request-Method');
    const headers = (request.headers.get('Access-Control-Request-Headers') || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!external || !['GET', 'POST'].includes(method) || headers.some(value => !['content-type', 'authorization'].includes(value))) return json({ error: '허용되지 않은 요청입니다.', code: 'PREFLIGHT_REJECTED' }, 403);
    return new Response(null, { status: 204, headers: cors });
  }
  let response;
  try { response = await route(request, env); }
  catch (error) {
    if (error instanceof ApiError) response = json({ error: error.message, code: error.code }, error.status, error.headers);
    else {
      console.error('Garden social API failed', error?.name || 'Error');
      response = json({ error: '저장소 연결이 잠시 지연되고 있어요. 다시 시도해 주세요.', code: 'INTERNAL_ERROR' }, 500);
    }
  }
  if (external) {
    response = new Response(response.body, response);
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
  }
  return response;
}
