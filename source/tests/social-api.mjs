import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { handleApi } from '../worker/api.js';
import { createApiFetcher } from '../scripts/github-pages/remote-api.js';
import { GardenSocial } from '../dist/social.js';

class D1 {
  constructor() { this.sqlite = new DatabaseSync(':memory:'); this.sqlite.exec('PRAGMA foreign_keys = ON'); }
  prepare(sql) {
    const db = this;
    return { bind(...values) { return {
      sql, values,
      async first() { return db.sqlite.prepare(sql).get(...values) || null; },
      async all() { return { results: db.sqlite.prepare(sql).all(...values) }; },
      async run() { const result = db.sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
    }; } };
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const result = statements.map(statement => ({ success: true, meta: { changes: Number(this.sqlite.prepare(statement.sql).run(...statement.values).changes) } }));
      this.sqlite.exec('COMMIT'); return result;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
}
const db = new D1();
db.sqlite.exec(await readFile(new URL('../drizzle/0001_game_accounts.sql', import.meta.url), 'utf8'));
db.sqlite.exec(await readFile(new URL('../drizzle/0002_social.sql', import.meta.url), 'utf8'));
db.sqlite.exec(await readFile(new URL('../drizzle/0003_arcade_social.sql', import.meta.url), 'utf8'));
const origin = 'https://garden.example';
const password = 'garden-password-123';
async function call(path, { method = 'GET', body, cookie, ip = '192.0.2.10', headers = {}, environment = { DB: db } } = {}) {
  const requestHeaders = { 'CF-Connecting-IP': ip, ...headers };
  if (method === 'POST') { requestHeaders.Origin ??= origin; requestHeaders['Content-Type'] ??= 'application/json'; }
  if (cookie) requestHeaders.Cookie = cookie;
  const response = await handleApi(new Request(origin + path, { method, headers: requestHeaders, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), environment, {});
  return { status: response.status, data: await response.json(), response };
}
async function register(username, displayName = username, ip = '192.0.2.10') {
  const response = await call('/api/auth/register', { method: 'POST', body: { username, password, displayName }, ip });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.match(response.response.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Lax/);
  return { ...response.data.user, cookie: response.response.headers.get('Set-Cookie').split(';')[0] };
}
async function post(path, body, user, options = {}) { return call(path, { method: 'POST', body, cookie: user?.cookie, ...options }); }
async function get(path, user) { return call(path, { cookie: user?.cookie }); }

try {
  assert.equal((await call('/api/me', { environment: {} })).status, 503);
  assert.equal((await get('/api/me')).data.user, null);
  assert.equal((await get('/api/friends')).status, 401);
  assert.equal((await post('/api/auth/register', { username: 'aa', password }, null)).status, 400);
  assert.equal((await post('/api/auth/register', { username: 'newuser', password: 'short' }, null)).status, 400);
  assert.equal((await post('/api/auth/register', { username: 'newuser', password, displayName: 'x'.repeat(17) }, null)).status, 400);
  assert.equal((await post('/api/auth/register', {}, null, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await post('/api/auth/register', {}, null, { headers: { 'Content-Type': 'text/plain' } })).status, 415);

  const alice = await register('Alice_1', '앨리스');
  const bob = await register('bob_22', '밥');
  const carol = await register('carol33', '캐롤');
  const dave = await register('dave_44', '데이브');
  const eve = await register('eve_555', '이브');
  assert.equal(alice.username, 'alice_1'); assert.match(alice.friendCode, /^SG-[A-Z2-9]{8}$/);
  assert.deepEqual(Object.keys((await get('/api/me', alice)).data.user).sort(), ['bestScore', 'displayName', 'friendCode', 'id', 'username']);
  assert.equal((await post('/api/auth/register', { username: 'ALICE_1', password }, null)).status, 409);
  const passwordRow = db.sqlite.prepare('SELECT password_salt, password_hash, password_iterations FROM garden_accounts WHERE id = ?').get(alice.id);
  assert.equal(passwordRow.password_iterations, 100000);
  assert.equal(Buffer.from(passwordRow.password_salt, 'base64url').length, 16);
  assert.equal(Buffer.from(passwordRow.password_hash, 'base64url').length, 32);
  assert.notEqual(passwordRow.password_hash, password);
  assert.notEqual(db.sqlite.prepare('SELECT token_hash FROM garden_sessions WHERE account_id = ?').get(alice.id).token_hash, alice.cookie.split('=')[1]);
  const login = await post('/api/auth/login', { username: 'ALICE_1', password }, null);
  assert.equal(login.status, 200); assert.equal(login.data.user.id, alice.id);
  assert.equal((await post('/api/auth/login', { username: 'unknown_777', password }, null)).status, 401);

  assert.equal((await post('/api/profile/stats', { score: 100 }, null)).status, 401);
  assert.equal((await post('/api/profile/stats', { score: 100, mode: 'apple' }, alice)).data.user.bestScore, 0);
  assert.equal((await post('/api/profile/stats', { score: 999, mode: 'science' }, alice)).data.user.bestScore, 0);
  assert.equal((await post('/api/profile/stats', { score: 100, mode: 'classic' }, alice)).data.user.bestScore, 100);
  assert.equal((await post('/api/profile/stats', { score: 20 }, alice)).data.user.bestScore, 100);
  assert.equal((await post('/api/profile/stats', { score: 90, id: alice.id }, bob)).data.user.id, bob.id);
  assert.equal((await get('/api/me', alice)).data.user.bestScore, 100);
  for (const score of [-1, 1.5, 100000001, '100']) assert.equal((await post('/api/profile/stats', { score }, alice)).status, 400);

  assert.equal((await post('/api/friends/request', { usernameOrCode: bob.username }, alice)).data.friends[0].status, 'outgoing');
  assert.equal((await get('/api/friends', bob)).data.friends[0].status, 'incoming');
  assert.equal((await post('/api/friends/respond', { friendId: bob.id, accept: true }, alice)).status, 404);
  assert.equal((await post('/api/friends/respond', { friendId: alice.id, accept: true }, carol)).status, 404);
  assert.equal((await post('/api/friends/respond', { friendId: alice.id, accept: true }, bob)).data.friends[0].status, 'accepted');
  assert.equal((await get('/api/friends', alice)).data.friends[0].status, 'accepted');
  assert.equal((await post('/api/friends/request', { usernameOrCode: alice.friendCode }, alice)).status, 400);
  assert.deepEqual((await post('/api/friends/remove', { friendId: bob.id }, alice)).data.friends, []);
  await post('/api/friends/request', { usernameOrCode: alice.friendCode }, bob);
  assert.equal((await post('/api/friends/request', { usernameOrCode: bob.friendCode }, alice)).data.friends[0].status, 'accepted');
  await post('/api/friends/request', { usernameOrCode: eve.username }, dave);
  assert.deepEqual((await post('/api/friends/respond', { friendId: dave.id, accept: false }, eve)).data.friends, []);
  assert.deepEqual((await get('/api/friends', dave)).data.friends, []);

  const invite = await post('/api/invites', {}, alice);
  assert.equal(invite.status, 201); assert.match(invite.data.url, /^https:\/\/garden\.example\/\?invite=/);
  assert.notEqual(db.sqlite.prepare('SELECT token_hash FROM garden_invites WHERE owner_id = ?').get(alice.id).token_hash, invite.data.token);
  assert.equal((await post('/api/invites/accept', { token: invite.data.token }, alice)).status, 400);
  assert.equal((await post('/api/invites/accept', { token: invite.data.token }, carol)).data.friends[0].id, alice.id);
  assert.equal((await post('/api/invites/accept', { token: invite.data.token }, carol)).data.friends.length, 1);
  assert.equal((await post('/api/invites/accept', { token: 'bad' }, carol)).status, 400);
  db.sqlite.prepare('UPDATE garden_invites SET expires_at = 0').run();
  assert.equal((await post('/api/invites/accept', { token: invite.data.token }, eve)).status, 410);

  assert.equal((await post('/api/rooms', { mode: 'unknown' }, alice)).status, 400);
  const created = await post('/api/rooms', { mode: 'classic' }, alice);
  assert.equal(created.status, 201); const room = created.data.room;
  assert.match(room.code, /^[A-Z2-9]{7}$/); assert.equal(room.players[0].id, alice.id);
  assert.ok(Number.isInteger(room.seed) && room.seed >= 0);
  assert.equal(room.expiresAt > Date.now(), true);
  assert.equal((await get(`/api/rooms/${room.code}`, carol)).status, 403);
  assert.equal((await post(`/api/rooms/${room.code}/state`, { score: 999, fruitCount: 1, playing: true }, carol)).status, 403);
  assert.equal((await post(`/api/rooms/${room.code}/leave`, {}, eve)).status, 403);
  assert.equal((await post('/api/rooms/join', { code: room.code.toLowerCase() }, bob)).data.room.seed, room.seed);
  let state = await post(`/api/rooms/${room.code}/state`, { score: 45, fruitCount: 6, playing: true, id: alice.id }, bob);
  assert.equal(state.status, 200); assert.equal(state.data.room.players.find(player => player.id === bob.id).score, 45);
  assert.equal(state.data.room.players.find(player => player.id === alice.id).score, 0);
  state = await post(`/api/rooms/${room.code}/state`, { score: 20, fruitCount: 7, playing: false }, bob);
  assert.equal(state.data.room.players.find(player => player.id === bob.id).score, 45);
  assert.equal(state.data.room.players.find(player => player.id === bob.id).playing, false);
  assert.equal((await post(`/api/rooms/${room.code}/state`, { score: -1, fruitCount: 0, playing: true }, bob)).status, 400);
  assert.equal((await post('/api/rooms/join', { code: room.code }, carol)).status, 200);
  assert.equal((await post('/api/rooms/join', { code: room.code }, dave)).status, 200);
  assert.equal((await post('/api/rooms/join', { code: room.code }, eve)).status, 409);
  assert.equal((await post('/api/rooms/join', { code: room.code }, bob)).status, 200);
  assert.equal((await get(`/api/rooms/${room.code}`, alice)).data.room.players.length, 4);
  assert.deepEqual(Object.keys((await get(`/api/rooms/${room.code}`, alice)).data.room.players[0]).sort(), ['displayName', 'fruitCount', 'id', 'playing', 'score', 'updatedAt']);
  assert.equal((await post(`/api/rooms/${room.code}/leave`, {}, alice)).data.room, null);
  assert.notEqual((await get(`/api/rooms/${room.code}`, bob)).data.room.hostId, alice.id);
  await post(`/api/rooms/${room.code}/leave`, {}, bob); await post(`/api/rooms/${room.code}/leave`, {}, carol); await post(`/api/rooms/${room.code}/leave`, {}, dave);
  assert.equal((await get(`/api/rooms/${room.code}`, alice)).status, 404);
  for (const mode of ['apple', 'free', 'water', 'space', 'science']) assert.equal((await post('/api/rooms', { mode }, alice)).data.room.mode, mode);
  const expired = (await post('/api/rooms', {}, bob)).data.room;
  db.sqlite.prepare('UPDATE garden_rooms SET expires_at = 0 WHERE id = ?').run(expired.id);
  assert.equal((await get(`/api/rooms/${expired.code}`, bob)).status, 410);
  assert.equal((await post('/api/rooms/join', { code: expired.code }, carol)).status, 410);

  // Arcade ranking, friend-only conversations and direct challenges.
  assert.equal((await post('/api/auth/register',{username:'weak_password',password:'onlyletters'},null)).status,400);
  const temporary=await post('/api/auth/login',{username:alice.username,password,remember:false},null);
  assert.equal(temporary.status,200);assert(!temporary.response.headers.get('Set-Cookie').includes('Max-Age'));
  await post('/api/profile/stats',{score:1700,mode:'classic',game:'apple'},alice);
  await post('/api/profile/stats',{score:2400,mode:'classic',game:'blocks'},alice);
  assert.equal((await get('/api/me',alice)).data.user.bestScore,100);
  for(const game of ['apple','blocks']){const rank=await get('/api/leaderboard?game='+game);assert.equal(rank.status,200);assert.equal(rank.data.scores[0].id,alice.id);}
  assert.equal((await post('/api/messages',{friendId:bob.id,text:'<b>안녕!</b>'},alice)).status,200);
  const thread=await get('/api/messages?friend='+alice.id,bob);assert.equal(thread.data.messages[0].text,'<b>안녕!</b>');
  assert.equal((await get('/api/messages?friend='+alice.id,eve)).status,403);
  assert.equal((await post('/api/messages',{friendId:eve.id,text:'unauthorized'},alice)).status,403);
  assert.equal((await post('/api/messages',{friendId:bob.id,text:'x'.repeat(501)},alice)).status,400);
  const duel=await post('/api/rooms',{mode:'classic',game:'blocks'},alice);assert.equal(duel.data.room.game,'blocks');
  const inviteDuel=await post('/api/messages',{friendId:bob.id,text:'대결 신청',roomCode:duel.data.room.code},alice);assert.equal(inviteDuel.data.messages.at(-1).roomCode,duel.data.room.code);
  assert.equal((await post('/api/rooms/join',{code:duel.data.room.code},bob)).data.room.game,'blocks');
  for(let i=0;i<18;i++)assert.equal((await post('/api/messages',{friendId:bob.id,text:'hello '+i},alice)).status,200);
  assert.equal((await post('/api/messages',{friendId:bob.id,text:'too fast'},alice)).status,429);
  console.log('PASS expansion API: separate leaderboards, password policy, optional session cookie, accepted-friend messaging, HTML-as-text, outsider/length/rate rejection and game-specific room challenges.');

  // Pair throttling persists across requests and resets after its ten-minute window.
  for (let attempt = 0; attempt < 8; attempt++) assert.equal((await post('/api/auth/login', { username: alice.username, password: 'incorrect-password' }, null, { ip: '192.0.2.99' })).status, 401);
  let throttled = await post('/api/auth/login', { username: alice.username, password }, null, { ip: '192.0.2.99' });
  assert.equal(throttled.status, 429); assert.ok(Number(throttled.response.headers.get('Retry-After')) <= 600);
  assert.equal(throttled.data.code, 'TOO_MANY_ATTEMPTS');
  db.sqlite.prepare('UPDATE garden_login_limits SET window_started = ?').run(Date.now() - 600001);
  assert.equal((await post('/api/auth/login', { username: alice.username, password }, null, { ip: '192.0.2.99' })).status, 200);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM garden_login_limits WHERE key_hash LIKE ?').get('%alice%').count, 0);

  // GitHub Pages uses its own explicit session, without third-party cookies.
  const pagesOrigin = 'https://sanghyun8420.github.io';
  const preflight = (site, method = 'POST', requestedHeaders = 'content-type,authorization') => handleApi(new Request(origin + '/api/auth/login', { method: 'OPTIONS', headers: { Origin: site, 'Access-Control-Request-Method': method, 'Access-Control-Request-Headers': requestedHeaders } }), {}, {});
  const allowed = await preflight(pagesOrigin);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), pagesOrigin);
  assert.equal(allowed.headers.has('Access-Control-Allow-Credentials'), false);
  assert.equal((await preflight('https://another-owner.github.io')).status, 403);
  assert.equal((await preflight('null')).status, 403);
  assert.equal((await preflight(pagesOrigin, 'DELETE')).status, 403);
  assert.equal((await preflight(pagesOrigin, 'POST', 'x-unexpected')).status, 403);
  assert.equal((await call('/api/me', { headers: { Origin: 'https://another-owner.github.io' }, cookie: alice.cookie })).response.headers.has('Access-Control-Allow-Origin'), false);
  assert.equal((await call('/api/me', { headers: { Origin: pagesOrigin }, cookie: alice.cookie })).data.user, null);
  const stored = new Map(), requests = [];
  const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) };
  const browserFetch = async (url, init) => {
    assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    const headers = new Headers(init.headers); headers.set('Origin', pagesOrigin);
    requests.push({ path: new URL(url).pathname, authorization: headers.get('Authorization') });
    return handleApi(new Request(url, { ...init, headers }), { DB: db }, {});
  };
  let remote = createApiFetcher(origin, { fetcher: browserFetch, storage });
  const remoteLogin = await remote('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: alice.username, password }) });
  assert.equal(remoteLogin.status, 200); assert.equal(remoteLogin.headers.has('Set-Cookie'), false);
  const remotePayload = await remoteLogin.json();
  assert.match(remotePayload.accessToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(db.sqlite.prepare('SELECT token_hash FROM garden_sessions WHERE token_hash = ?').get(remotePayload.accessToken), undefined);
  remote = createApiFetcher(origin, { fetcher: browserFetch, storage });
  assert.equal((await (await remote('/api/me')).json()).user.id, alice.id);
  assert.match(requests.at(-1).authorization, /^Bearer /);
  let inviteUrl;
  const pagesSocial = new GardenSocial({ fetcher: remote, document: null, location: { origin: pagesOrigin, pathname: '/suika-garden/', href: pagesOrigin + '/suika-garden/', search: '' }, navigator: { clipboard: { writeText: async url => { inviteUrl = url; } } } });
  pagesSocial._acceptUser(remotePayload);
  assert.equal(await pagesSocial.copyInvite(), true);
  assert.equal(new URL(inviteUrl).origin, pagesOrigin); assert.equal(new URL(inviteUrl).pathname, '/suika-garden/');
  assert.match(new URL(inviteUrl).searchParams.get('invite'), /^[A-Za-z0-9_-]{43}$/);
  assert.equal((await remote('/api/friends')).status, 200);
  const remoteRoom = await (await remote('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'classic' }) })).json();
  assert.equal((await remote(`/api/rooms/${remoteRoom.room.code}`)).status, 200);
  const invalid = await call('/api/friends', { headers: { Origin: pagesOrigin, Authorization: 'Bearer invalid' } });
  assert.equal(invalid.status, 401); assert.equal(invalid.response.headers.get('Access-Control-Allow-Origin'), pagesOrigin);
  await assert.rejects(() => remote('https://evil.example/api/me'));
  await remote('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(stored.size, 0);
  assert.equal((await (await remote('/api/me')).json()).user, null);
  assert.equal((await get('/api/me', alice)).data.user.id, alice.id, 'GitHub logout leaves the original site session intact');
  const crossRegister = await call('/api/auth/register', { method: 'POST', headers: { Origin: pagesOrigin }, body: { username: 'github_user9', password } });
  assert.equal(crossRegister.status, 201); assert.match(crossRegister.data.accessToken, /^[A-Za-z0-9_-]{43}$/); assert.equal(crossRegister.response.headers.has('Set-Cookie'), false);
  assert.equal((await get('/api/me', alice)).data.accessToken, undefined, 'cookie sessions never expose their tokens');
  console.log('PASS GitHub Pages API: exact-origin CORS, preflight limits, no ambient cookies, hashed bearer sessions, tab reload, same-page login/friends/rooms, project-path invite links and independent logout.');

  const logout = await post('/api/auth/logout', {}, bob);
  assert.equal(logout.status, 200); assert.match(logout.response.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal((await get('/api/me', bob)).data.user, null);
  assert.equal((await get('/api/friends', bob)).status, 401);
  db.sqlite.prepare('UPDATE garden_sessions SET expires_at = 0 WHERE account_id = ?').run(eve.id);
  assert.equal((await get('/api/me', eve)).data.user, null);
  // Old Google-owned tables remain present and untouched by the new feature.
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
  console.log('PASS social API: real salted PBKDF2 registration/login and session hashing, validation/CSRF, persisted throttling, classic best-score isolation, mutual friend requests, invite links, authorized shared rooms/max4/score polling/host transfer/expiry, logout, and immutable old tables.');
} finally { db.sqlite.close(); }
