const MODES = new Set(['classic', 'apple', 'free', 'water', 'space', 'watermelon', 'timed', 'challenge', 'science']);
const ROOM_CODE = /^[A-Z0-9]{6,10}$/;
const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

function socialError(message, code = 'REQUEST_FAILED', status = 0) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

/** Real site accounts, friend invitations, and shared-seed score rooms. */
export class GardenSocial {
  constructor({
    onRoom = () => {}, onUser = () => {}, onError = () => {},
    onBeforeAccountChange = async () => {}, onNeedPlayer, openDialog, getMode = () => 'classic',
    fetcher, getGame=()=> 'suika', document: doc = globalThis.document, location = globalThis.location,
    navigator = globalThis.navigator, clock = () => Date.now(),
  } = {}) {
    this.document = doc;
    this.location = location;
    this.navigator = navigator;
    this.fetcher = fetcher || globalThis.fetch?.bind(globalThis);
    this.clock = clock;
    this.onRoom = onRoom;
    this.onUser = onUser;
    this.onError = onError;
    this.onBeforeAccountChange = onBeforeAccountChange;
    this.onNeedPlayer = onNeedPlayer;
    this.getMode = getMode;
    this.getGame=getGame;
    this.openDialog = openDialog || (id => { const dialog = this.$(id); if (dialog && !dialog.open) dialog.showModal(); });
    this.user = null;
    this.room = null;
    this._friends = [];
    this._mode = 'register';
    this._listeners = [];
    this._pollTimer = null;
    this._stateTimer = null;
    this._polling = false;
    this._updating = false;
    this._disposed = false;
    this._lastStateAt = 0;
    this._lastStateKey = '';
    this._latestGame = null;
    this._pollFailures = 0;
    this._authBusy = false;
    this._friendBusy = false;
    this._roomBusy = false;
    this._shareUrl = '';
    const query = new URLSearchParams(location?.search || '');
    this._pendingInvite = (query.get('invite') || '').slice(0, 160);
    this._pendingRoom = (query.get('room') || '').trim().toUpperCase();
    this._bind();
    this._renderAccount();
    this._renderRoom();
  }

  $(id) { return this.document?.getElementById(id) || null; }

  _text(id, text) {
    const element = this.$(id);
    if (element) element.textContent = text;
  }

  _feedback(id, message) {
    const element = this.$(id);
    if (element) {
      element.textContent = message;
      element.setAttribute('role', 'status');
      element.setAttribute('aria-live', 'polite');
    }
    if (id === 'auth-feedback' && this.user && this.$('auth-form')?.hidden && this.$('account-summary')) {
      this.$('account-summary').textContent = `${this.user.displayName}님 · @${this.user.username}\n내 친구 코드 ${this.user.friendCode}${message ? `\n${message}` : ''}`;
    }
  }

  _report(error, feedback = 'friend-feedback') {
    const message = error?.message || '잠시 연결이 어려워요. 다시 시도해주세요.';
    this._feedback(feedback, message);
    this.onError(error instanceof Error ? error : socialError(message));
  }

  _listen(id, type, handler, feedback) {
    const element = this.$(id);
    if (!element) return;
    const listener = event => {
      try { Promise.resolve(handler(event)).catch(error => this._report(error, feedback)); }
      catch (error) { this._report(error, feedback); }
    };
    element.addEventListener(type, listener);
    this._listeners.push(() => element.removeEventListener(type, listener));
  }

  _bind() {
    if (this.$('auth-username')) this.$('auth-username').maxLength = 20;
    if (this.$('auth-name')) this.$('auth-name').maxLength = 16;
    this._listen('auth-login', 'click', () => this._setAccountMode('login'), 'auth-feedback');
    this._listen('auth-register', 'click', () => this._setAccountMode('register'), 'auth-feedback');
    this._listen('auth-form', 'submit', event => { event.preventDefault(); return this._submitAccount(); }, 'auth-feedback');
    this._listen('account-logout', 'click', () => this._logout(), 'auth-feedback');
    this._listen('friend-form', 'submit', event => { event.preventDefault(); return this._addFriend(); }, 'friend-feedback');
    this._listen('friend-invite', 'click', () => this.copyInvite({ share: true }), 'friend-feedback');
    this._listen('room-create', 'click', () => this.createRoom(this.getMode()), 'room-feedback');
    this._listen('room-join-form', 'submit', event => {
      event.preventDefault(); return this.joinRoom(this.$('room-join-code')?.value || '');
    }, 'room-feedback');
    this._listen('room-share', 'click', () => this.shareRoom(), 'room-feedback');
    this._listen('room-leave', 'click', () => this.leaveRoom(), 'room-feedback');
  }

  async _request(path, { method = 'GET', body } = {}) {
    if (!this.fetcher) throw socialError('친구 서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.', 'OFFLINE');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await this.fetcher(path, {
        method, credentials: 'same-origin', signal: controller.signal,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
      let payload;
      try { payload = response.status === 204 ? {} : await response.json(); }
      catch { throw socialError('서버 응답을 읽지 못했어요. 잠시 후 다시 시도해주세요.', 'INVALID_RESPONSE', response.status); }
      if (!response.ok) throw socialError(payload?.error || '요청을 처리하지 못했어요.', payload?.code || 'REQUEST_FAILED', response.status);
      return payload;
    } catch (error) {
      if (typeof error?.code === 'string') throw error;
      throw socialError(error?.name === 'AbortError' ? '연결이 늦어지고 있어요. 다시 시도해주세요.' : '친구 서버에 연결하지 못했어요. 혼자 플레이는 계속할 수 있어요.', 'NETWORK_ERROR');
    } finally { clearTimeout(timer); }
  }

  _acceptUser(payload) {
    const user = payload?.user;
    if (!user || typeof user.id !== 'string' || !user.id || typeof user.username !== 'string') {
      throw socialError('계정 정보를 확인하지 못했어요.', 'INVALID_RESPONSE');
    }
    this.user = {
      id: user.id, username: user.username,isGuest:!!user.isGuest,
      displayName: String(user.displayName || user.username).slice(0, 32),
      friendCode: String(user.friendCode || ''),
      bestScore: Number.isSafeInteger(user.bestScore) && user.bestScore >= 0 ? user.bestScore : 0,
    };
    this._renderAccount();
    Promise.resolve(this.onUser(this.user)).catch(error => this._report(error, 'auth-feedback'));
    return this.user;
  }

  async init() {
    try {
      const payload = await this._request('/api/me');
      if (payload.user) this._acceptUser(payload);
      else { this.user = null; this._renderAccount(); this.onUser(null); }
      if (this._pendingRoom || this._pendingInvite) {
        if (!this.user) {
          if(this.onNeedPlayer)this.onNeedPlayer();
          else this.openAccount('login');
          this._feedback('auth-feedback', '친구가 보낸 초대예요. 이름을 정하거나 기존 계정으로 로그인하면 함께할 수 있어요.');
        } else await this._handlePendingLinks();
      }
      return this.user;
    } catch (error) {
      this.user = null;
      this._renderAccount();
      this.onUser(null);
      this._feedback('auth-feedback', error.message);
      return null;
    }
  }

  _setAccountMode(mode) {
    this._mode = mode === 'login' ? 'login' : 'register';
    const registering = this._mode === 'register';
    this._text('auth-title', registering ? '함께 가꿀 계정을 만들어요' : '다시 만나서 반가워요');
    this._text('auth-submit', registering ? '회원가입하고 시작' : '로그인');
    if (this.$('auth-name-row')) this.$('auth-name-row').hidden = !registering;
    if (this.$('auth-password')) this.$('auth-password').autocomplete = registering ? 'new-password' : 'current-password';
    for (const [id, active] of [['auth-login', !registering], ['auth-register', registering]]) {
      const button = this.$(id);
      if (button) { button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); }
    }
    this._feedback('auth-feedback', '');
  }

  _renderAccount() {
    const signedIn = !!this.user;
    if (this.$('auth-form')) this.$('auth-form').hidden = signedIn;
    if (this.$('account-logout')) this.$('account-logout').hidden = !signedIn;
    for (const id of ['auth-login', 'auth-register']) if (this.$(id)) this.$(id).hidden = signedIn;
    const summary = this.$('account-summary');
    if (summary) {
      summary.hidden = !signedIn;
      summary.textContent = signedIn ? `${this.user.displayName}님 · ${this.user.isGuest?'닉네임 플레이':'@'+this.user.username}\n내 친구 코드 ${this.user.friendCode}` : '';
    }
    if (this.$('account-label')) this._text('account-label', signedIn ? this.user.displayName : '회원가입');
    if (signedIn) this._text('auth-title', '내 정원 계정');
  }

  openAccount(mode = 'register') {
    this._setAccountMode(mode);
    this._renderAccount();
    this.openDialog('account-dialog');
    if (!this.user) this.$('auth-username')?.focus();
  }

  async _submitAccount() {
    if (this._authBusy) return;
    const username = String(this.$('auth-username')?.value || '').trim();
    const password = String(this.$('auth-password')?.value || '');
    const displayName = String(this.$('auth-name')?.value || username).trim();
    if (!USERNAME.test(username)) throw socialError('아이디는 영문·숫자·밑줄로 3~20자 입력해주세요.', 'INVALID_USERNAME');
    if (password.length < 8 || password.length > 128) throw socialError('비밀번호는 8~128자로 입력해주세요.', 'INVALID_PASSWORD');
    if (this._mode === 'register' && (!displayName || [...displayName].length > 16)) throw socialError('별명은 1~16자로 입력해주세요.', 'INVALID_NAME');
    if(this._mode==='register'&&(!/[a-zA-Z]/.test(password)||!/[0-9]/.test(password)))throw socialError('비밀번호에 영문과 숫자를 각각 넣어 주세요.','WEAK_PASSWORD');
    this._authBusy = true;
    if (this.$('auth-submit')) this.$('auth-submit').disabled = true;
    this._feedback('auth-feedback', '계정을 확인하고 있어요…');
    try {
      await this.onBeforeAccountChange();
      const payload = await this._request(`/api/auth/${this._mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', body: this._mode === 'register' ? { username, password, displayName,remember:this._remember() } : { username, password,remember:this._remember() },
      });
      this._acceptUser(payload);
      if (this.$('auth-password')) this.$('auth-password').value = '';
      this._feedback('auth-feedback', '로그인했어요. 친구를 초대해 함께 가꿔보세요!');
      this.$('account-dialog')?.close();
      await this._handlePendingLinks();
    } finally {
      this._authBusy = false;
      if (this.$('auth-submit')) this.$('auth-submit').disabled = false;
    }
  }

  async _logout() {
    if (this._authBusy) return;
    this._authBusy = true;
    try {
      await this.onBeforeAccountChange();
      await this._request('/api/auth/logout', { method: 'POST', body: {} });
      this.user = null;
      this._friends = [];
      this._setRoom(null);
      this._renderAccount(); this._renderFriends(); this.onUser(null);
      this._setAccountMode('login');
      this._feedback('auth-feedback', '로그아웃했어요. 기기에 저장한 보석과 스킨은 그대로예요.');
    } finally { this._authBusy = false; }
  }

  _remember(){try{return globalThis.localStorage?.getItem('suika-remember-login')!=='false';}catch{return false;}}

  _requireUser() {
    if (this.user) return true;
    this.$('friends-dialog')?.close();
    if(this.onNeedPlayer)this.onNeedPlayer();
    else this.openAccount('register');
    this._feedback('auth-feedback', '이름을 정하면 친구와 함께할 수 있어요.');
    return false;
  }

  async openFriends() {
    if (!this._requireUser()) return false;
    this.openDialog('friends-dialog');
    this._feedback('friend-feedback', '친구 목록을 불러오고 있어요…');
    try {
      const payload = await this._request('/api/friends');
      this._acceptFriends(payload);
      this._feedback('friend-feedback', `내 친구 코드 ${this.user.friendCode}`);
      return true;
    } catch (error) { this._report(error, 'friend-feedback'); return false; }
  }

  _acceptFriends(payload) {
    if (!Array.isArray(payload?.friends)) throw socialError('친구 목록을 확인하지 못했어요.', 'INVALID_RESPONSE');
    this._friends = payload.friends.filter(friend => friend && typeof friend.id === 'string' && ['accepted', 'incoming', 'outgoing'].includes(friend.status)).map(friend => ({
      id: friend.id, username: String(friend.username || ''),
      displayName: String(friend.displayName || friend.username || '정원사').slice(0, 32), status: friend.status,
    }));
    this._renderFriends();
  }

  _button(label, action, className = 'friend-action') {
    const button = this.document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = label;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await action(); }
      catch (error) { this._report(error, 'friend-feedback'); }
      finally { if (button.isConnected) button.disabled = false; }
    });
    return button;
  }

  _renderFriends() {
    const list = this.$('friends-list');
    if (!list) return;
    list.replaceChildren();
    if (this._pendingInvite) {
      const row = this.document.createElement('li'); row.className = 'friend-row invite-row';
      const text = this.document.createElement('span'); text.textContent = '친구가 정원 초대 링크를 보냈어요.';
      row.append(text, this._button('친구 초대 수락', () => this._acceptInvite()));
      list.append(row);
    }
    if (!this._friends.length) {
      const empty = this.document.createElement('li'); empty.className = 'friend-empty';
      empty.textContent = '아직 친구가 없어요. 아이디나 친구 코드로 첫 친구를 초대해보세요.';
      list.append(empty);
    }
    for (const friend of this._friends) {
      const row = this.document.createElement('li'); row.className = 'friend-row';
      const information = this.document.createElement('div'); information.className = 'friend-information';
      const name = this.document.createElement('strong'); name.textContent = friend.displayName;
      const status = this.document.createElement('span');
      status.textContent = `@${friend.username} · ${friend.status === 'accepted' ? '친구' : friend.status === 'incoming' ? '받은 요청' : '수락 기다리는 중'}`;
      information.append(name, status); row.append(information);
      const actions = this.document.createElement('div'); actions.className = 'friend-actions';
      if (friend.status === 'incoming') {
        actions.append(this._button('수락', () => this._respondFriend(friend.id, true)), this._button('거절', () => this._respondFriend(friend.id, false)));
      } else if (friend.status === 'accepted') {
        actions.append(this._button('함께하기', () => this.createRoom(this.getMode())), this._button('삭제', () => this._removeFriend(friend.id), 'friend-action subtle'));
      } else actions.append(this._button('요청 취소', () => this._removeFriend(friend.id), 'friend-action subtle'));
      row.append(actions); list.append(row);
    }
  }

  async _addFriend() {
    if (!this._requireUser() || this._friendBusy) return;
    const usernameOrCode = String(this.$('friend-input')?.value || '').trim();
    if (!usernameOrCode || usernameOrCode.length > 40) throw socialError('친구의 아이디 또는 친구 코드를 입력해주세요.', 'INVALID_FRIEND');
    this._friendBusy = true;
    if (this.$('friend-add')) this.$('friend-add').disabled = true;
    try {
      const result = await this._request('/api/friends/request', { method: 'POST', body: { usernameOrCode } });
      this._acceptFriends(result);
      if (this.$('friend-input')) this.$('friend-input').value = '';
      this._feedback('friend-feedback', '친구 요청을 보냈어요. 상대가 수락하면 함께할 수 있어요.');
    } finally {
      this._friendBusy = false;
      if (this.$('friend-add')) this.$('friend-add').disabled = false;
    }
  }

  async _respondFriend(friendId, accept) {
    this._acceptFriends(await this._request('/api/friends/respond', { method: 'POST', body: { friendId, accept } }));
    this._feedback('friend-feedback', accept ? '이제 친구예요! 같은 방에서 함께 도전해보세요.' : '친구 요청을 거절했어요.');
  }

  async _removeFriend(friendId) {
    this._acceptFriends(await this._request('/api/friends/remove', { method: 'POST', body: { friendId } }));
    this._feedback('friend-feedback', '친구 목록을 업데이트했어요.');
  }

  async _acceptInvite() {
    if (!this._requireUser() || !this._pendingInvite) return;
    const result = await this._request('/api/invites/accept', { method: 'POST', body: { token: this._pendingInvite } });
    this._pendingInvite = '';
    this._removeQuery('invite');
    this._acceptFriends(result);
    this._feedback('friend-feedback', '친구 초대를 수락했어요. 함께할 방을 만들어보세요!');
  }

  async _handlePendingLinks() {
    if (!this.user) return;
    if (this._pendingInvite) await this.openFriends();
    if (this._pendingRoom) {
      const code = this._pendingRoom;
      this._pendingRoom = '';
      try { await this.joinRoom(code); }
      catch (error) { this.openDialog('friends-dialog'); this._report(error, 'room-feedback'); }
    }
  }

  _removeQuery(key) {
    try {
      const url = new URL(this.location.href); url.searchParams.delete(key);
      globalThis.history?.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {}
  }

  _normalRoom(value) {
    if (!value || typeof value.code !== 'string' || !ROOM_CODE.test(value.code) || !Array.isArray(value.players) || !Number.isInteger(value.seed)) {
      throw socialError('친구 방 정보를 확인하지 못했어요.', 'INVALID_RESPONSE');
    }
    return {
      id: String(value.id || ''), code: value.code, seed: value.seed >>> 0,
      game:['suika','apple','blocks'].includes(value.game)?value.game:'suika',
      mode: MODES.has(value.mode) ? value.mode : 'classic', hostId: String(value.hostId || ''),
      expiresAt: Number(value.expiresAt) || 0,
      players: value.players.filter(player => player && typeof player.id === 'string').slice(0, 4).map(player => ({
        id: player.id, displayName: String(player.displayName || '정원사').slice(0, 32),
        score: Number.isSafeInteger(player.score) && player.score >= 0 ? player.score : 0,
        fruitCount: Number.isSafeInteger(player.fruitCount) && player.fruitCount >= 0 ? player.fruitCount : 0,
        playing: player.playing === true, updatedAt: Number(player.updatedAt) || 0,
      })),
    };
  }

  _setRoom(value) {
    const previous = this.room?.code;
    this.room = value ? this._normalRoom(value) : null;
    const joinedNew = !!this.room && this.room.code !== previous;
    this._renderRoom();
    Promise.resolve(this.onRoom({ room: this.room, joinedNew })).catch(error => this._report(error, 'room-feedback'));
    if (joinedNew) { this._lastStateAt = 0; this._lastStateKey = ''; this._pollFailures = 0; }
    this._schedulePoll();
    return this.room;
  }

  _renderRoom() {
    const panel = this.$('room-panel');
    if (panel) panel.hidden = !this.room;
    this._text('room-code', this.room ? this.room.code : '');
    const list = this.$('room-players');
    if (!list) return;
    list.replaceChildren();
    if (!this.room) return;
    for (const player of this.room.players) {
      const row = this.document.createElement('div'); row.className = 'room-player';
      if (player.id === this.user?.id) row.classList.add('is-me');
      const name = this.document.createElement('span'); name.textContent = `${player.displayName}${player.id === this.user?.id ? ' · 나' : ''}`;
      const score = this.document.createElement('strong'); score.textContent = player.score.toLocaleString('ko-KR');
      const state = this.document.createElement('small'); state.textContent = player.playing ? '플레이 중 · 방 최고점' : '대기 / 종료 · 방 최고점';
      row.append(name, score, state); list.append(row);
    }
  }

  async createRoom(mode = 'classic') {
    if (!['suika','apple','blocks'].includes(this.getGame())) throw socialError('대전은 수박정원·사과모아·블록정원에서 즐길 수 있어요. 게임을 선택해 주세요.', 'SINGLE_PLAYER_GAME');
    if (!this._requireUser() || this._roomBusy) return null;
    this._roomBusy = true;
    if (this.$('room-create')) this.$('room-create').disabled = true;
    try {
      const payload = await this._request('/api/rooms', { method: 'POST', body: { mode: MODES.has(mode) ? mode : 'classic',game:this.getGame() } });
      const room = this._setRoom(payload.room);
      this._feedback('room-feedback', `방 ${room.code}을 만들었어요. 초대 링크를 친구에게 보내주세요.`);
      this.$('friends-dialog')?.close();
      return room;
    } finally {
      this._roomBusy = false;
      if (this.$('room-create')) this.$('room-create').disabled = false;
    }
  }

  async joinRoom(code) {
    if (!this._requireUser() || this._roomBusy) return null;
    code = String(code || '').trim().toUpperCase();
    if (!ROOM_CODE.test(code)) throw socialError('친구가 보낸 6~10자리 방 코드를 입력해주세요.', 'INVALID_ROOM_CODE');
    this._roomBusy = true;
    if (this.$('room-join-submit')) this.$('room-join-submit').disabled = true;
    try {
      const payload = await this._request('/api/rooms/join', { method: 'POST', body: { code } });
      const room = this._setRoom(payload.room);
      this._pendingRoom = ''; this._removeQuery('room');
      this._feedback('room-feedback', `방 ${room.code}에 입장했어요. 같은 과일 순서로 함께 도전해요!`);
      this.$('friends-dialog')?.close();
      return room;
    } finally {
      this._roomBusy = false;
      if (this.$('room-join-submit')) this.$('room-join-submit').disabled = false;
    }
  }

  async leaveRoom() {
    const room = this.room;
    if (!room || !this.user) { this._setRoom(null); return; }
    await this._request(`/api/rooms/${encodeURIComponent(room.code)}/leave`, { method: 'POST', body: {} });
    this._setRoom(null);
    this._feedback('room-feedback', '친구 방에서 나왔어요. 내 정원은 계속 가꿀 수 있어요.');
  }

  _schedulePoll(delay = 2000) {
    clearTimeout(this._pollTimer); this._pollTimer = null;
    if (!this._disposed && this.user && this.room) this._pollTimer = setTimeout(() => this._pollRoom(), delay);
  }

  async _pollRoom() {
    if (this._disposed || !this.user || !this.room || this._polling) return;
    if (this.document?.hidden) { this._schedulePoll(4000); return; }
    this._polling = true;
    const code = this.room.code;
    try {
      const payload = await this._request(`/api/rooms/${encodeURIComponent(code)}`);
      if (this.room?.code === code) this._setRoom(payload.room);
      this._pollFailures = 0;
    } catch (error) {
      this._pollFailures++;
      if (error.status === 401) {
        this.user = null; this._setRoom(null); this._renderAccount(); this.onUser(null);
        this._feedback('room-feedback', '로그인이 만료됐어요. 다시 로그인하면 친구와 이어갈 수 있어요.');
      } else if (error.status === 404 || error.status === 410) {
        this._setRoom(null); this._feedback('room-feedback', '친구 방이 종료됐어요. 새 방을 만들어주세요.');
      } else this._feedback('room-feedback', '친구 방 연결을 다시 확인하고 있어요…');
    } finally {
      this._polling = false;
      this._schedulePoll(Math.min(15000, 2000 * 2 ** this._pollFailures));
    }
  }

  updateGame(game) {
    if (!this.room || !this.user || this._disposed) return Promise.resolve(false);
    this._latestGame = {
      score: Math.max(0, Math.min(100000000, Math.trunc(Number(game?.score) || 0))),
      fruitCount: Math.max(0, Math.min(500, Math.trunc(Number(game?.fruitCount) || 0))), playing: game?.playing === true,
    };
    const key = JSON.stringify(this._latestGame);
    const elapsed = this.clock() - this._lastStateAt;
    if (key === this._lastStateKey && elapsed < 5000) return Promise.resolve(false);
    if (this._updating || elapsed < 1000) {
      if (!this._stateTimer) this._stateTimer = setTimeout(() => { this._stateTimer = null; this._sendState(); }, Math.max(50, 1000 - elapsed));
      return Promise.resolve(false);
    }
    return this._sendState();
  }

  async _sendState() {
    if (this._disposed || this._updating || !this.room || !this.user || !this._latestGame) return false;
    this._updating = true;
    const code = this.room.code;
    const game = { ...this._latestGame };
    this._lastStateAt = this.clock(); this._lastStateKey = JSON.stringify(game);
    try {
      const payload = await this._request(`/api/rooms/${encodeURIComponent(code)}/state`, { method: 'POST', body: game });
      if (this.room?.code === code) this._setRoom(payload.room);
      return true;
    } catch (error) { this._feedback('room-feedback', error.message); return false; }
    finally { this._updating = false; }
  }

  async saveScore(score, mode = 'classic', game='suika') {
    if (!this.user || mode !== 'classic' || !Number.isSafeInteger(score) || score < 0) return null;
    const payload = await this._request('/api/profile/stats', { method: 'POST', body: { score, mode, game } });
    if (payload.user) this._acceptUser(payload);
    return this.user;
  }

  _roomUrl() {
    if (!this.room) return null;
    const url = new URL(this.location?.pathname || '/', this.location?.origin || 'https://suika.invalid');
    url.searchParams.set('room', this.room.code);
    return url.href;
  }

  async copyInvite({ share = false } = {}) {
    if (!this._requireUser()) return false;
    const payload = await this._request('/api/invites', { method: 'POST', body: {} });
    if (typeof payload.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(payload.token)) throw socialError('초대 링크를 만들지 못했어요.', 'INVALID_RESPONSE');
    const url = new URL(this.location?.pathname || '/', this.location?.origin);
    url.searchParams.set('invite', payload.token);
    return this._share(url.href, '수박정원 친구 초대', share, 'friend-feedback');
  }

  async shareRoom() {
    const url = this._roomUrl();
    if (!url) throw socialError('먼저 친구 방을 만들어주세요.', 'ROOM_REQUIRED');
    return this._share(url, '수박정원에서 같이 한 판!', true, 'room-feedback');
  }

  async _share(url, title, useShare, feedback) {
    this._shareUrl = url;
    const field = this.$('friend-share-link');
    if (field) { field.value = url; field.hidden = false; field.readOnly = true; }
    if (useShare && typeof this.navigator?.share === 'function') {
      try { await this.navigator.share({ title, text: '같은 과일 순서로 수박에 도전해요!', url }); this._feedback(feedback, '초대 링크를 보냈어요.'); return true; }
      catch (error) { if (error?.name === 'AbortError') { this._feedback(feedback, '공유를 취소했어요. 링크는 아래에서 복사할 수 있어요.'); return false; } }
    }
    try {
      if (typeof this.navigator?.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
      await this.navigator.clipboard.writeText(url);
      this._feedback(feedback, '초대 링크를 복사했어요. 친구에게 붙여넣어 보내주세요.');
      return true;
    } catch {
      this.openDialog('friends-dialog');
      field?.focus(); field?.select();
      this._feedback('friend-feedback', '아래 초대 링크를 길게 눌러 복사한 뒤 친구에게 보내주세요.');
      return false;
    }
  }

  dispose() {
    this._disposed = true;
    clearTimeout(this._pollTimer); clearTimeout(this._stateTimer);
    this._pollTimer = this._stateTimer = null;
    this._listeners.forEach(remove => remove()); this._listeners = [];
  }
}
