export const INSTALL_KEY = 'garden-install-v1';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export function installPlatform(navigator = {}) {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua) || (/Mac/i.test(navigator.platform || '') && navigator.maxTouchPoints > 1)) return 'ios';
  return /Android/i.test(ua) ? 'android' : 'desktop';
}

/** The browser owns installation; this dialog only offers it after real play. */
export class GardenInstall {
  constructor({ window: win = globalThis, document: doc = globalThis.document, navigator = globalThis.navigator,
    storage, openDialog, isPlaying = () => false, beforeInstall = () => {}, onClose = () => {}, onInstalled = () => {},
    clock = () => Date.now(), delay = 35 } = {}) {
    Object.assign(this, { win, doc, navigator, openDialog, isPlaying, beforeInstall, onClose, onInstalled, clock, delay });
    try { this.storage = storage ?? win.localStorage; } catch { this.storage = null; }
    this.promptEvent = null; this.elapsed = 0; this.shown = false; this.busy = false; this.manual = false;
    this.installed = !!navigator?.standalone || !!win.matchMedia?.('(display-mode: standalone)').matches;
    this.platform = installPlatform(navigator); this.listeners = [];
    this.lastTick = clock(); this.build();
  }

  read() { try { return JSON.parse(this.storage?.getItem(INSTALL_KEY) || '{}') || {}; } catch { return {}; } }
  remember(patch) { try { this.storage?.setItem(INSTALL_KEY, JSON.stringify({ ...this.read(), ...patch })); } catch {} }
  listen(target, type, listener) { target?.addEventListener(type, listener); this.listeners.push(() => target?.removeEventListener(type, listener)); }

  build() {
    if (!this.doc) return;
    const dialog = this.doc.createElement('dialog'); dialog.id = 'install-dialog'; dialog.className = 'install-dialog';
    dialog.setAttribute('aria-labelledby', 'install-title'); dialog.setAttribute('aria-describedby', 'install-description');
    dialog.innerHTML = '<button class="dialog-close" type="button" aria-label="나중에 추가하기">×</button><img class="install-app-icon" src="./app-icon-192.png" width="76" height="76" alt=""><p class="eyebrow">내 작은 게임방</p><h2 id="install-title">홈 화면에 바로가기 추가하기</h2><p id="install-description">수박정원을 앱처럼 열고<br>원하는 때 바로 한 판 더!</p><p class="install-save-note">로그인 없이 이 브라우저에 자동 저장돼요.</p><div id="install-guide" hidden><ol id="install-steps"></ol><p class="install-browser-note" id="install-browser-note"></p></div><p id="install-status" role="status" aria-live="polite"></p><button id="install-confirm" class="start-button" type="button">홈 화면에 추가</button><button id="install-later" class="text-link" type="button">나중에 할게요</button>';
    this.doc.body.append(dialog); this.dialog = dialog;
    dialog.querySelector('.dialog-close').onclick = () => this.dismiss();
    this.$('install-later').onclick = () => this.dismiss();
    this.$('install-confirm').onclick = () => { this.install(); };
    this.listen(dialog, 'close', () => { this.remember({ dismissedUntil: this.clock() + WEEK }); this.onClose(); });
    const menu = this.doc.querySelector('.menu-list');
    if (menu) {
      const button = this.doc.createElement('button'); button.className = 'menu-action'; button.type = 'button'; button.id = 'install-menu';
      button.innerHTML = '<span aria-hidden="true">＋</span><span>홈 화면에 추가</span><span aria-hidden="true">↗</span>';
      button.onclick = () => { this.$('menu-dialog')?.close(); this.open(); }; menu.append(button);
    }
  }

  $(id) { return this.doc?.getElementById(id); }
  render() {
    if (!this.dialog) return;
    const canPrompt = !!this.promptEvent && !this.installed;
    this.$('install-confirm').textContent = this.installed ? '게임 계속하기' : canPrompt ? '홈 화면에 추가' : this.manual ? '게임 계속하기' : '추가 방법 보기';
    this.$('install-confirm').disabled = this.busy;
    this.$('install-guide').hidden = !this.manual || canPrompt || this.installed;
    this.$('install-later').hidden = this.installed;
    const steps = this.$('install-steps'); steps.replaceChildren();
    const lines = this.platform === 'ios'
      ? ['Safari에서 이 게임 주소를 열어요.', '공유 버튼(□↑)을 누르고 ‘홈 화면에 추가’를 골라요.', '‘추가’를 누르면 수박정원 아이콘이 생겨요.']
      : this.platform === 'android'
        ? ['지금 사용하는 브라우저의 메뉴(⋮)를 열어요.', '‘홈 화면에 추가’ 또는 ‘앱 설치’를 골라요.', '‘설치’ 또는 ‘추가’를 눌러 마무리해요.']
        : ['Chrome 또는 Edge에서 이 게임 주소를 열어요.', '주소창의 설치 아이콘이나 브라우저 메뉴의 ‘앱 설치’를 골라요.', '설치 후 바탕화면이나 앱 목록에서 바로 열 수 있어요.'];
    for (const line of lines) { const li = this.doc.createElement('li'); li.textContent = line; steps.append(li); }
    this.$('install-browser-note').textContent = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\//i.test(this.navigator?.userAgent || '')
      ? '앱 안의 브라우저라면 ‘다른 브라우저로 열기’를 먼저 눌러 주세요.'
      : '브라우저에 따라 버튼 이름과 위치가 조금 다를 수 있어요.';
  }

  open() {
    this.manual = !this.promptEvent && this.platform === 'ios'; this.render();
    if (this.openDialog) this.openDialog('install-dialog'); else if (this.dialog && !this.dialog.open) this.dialog.showModal();
    this.$('install-confirm')?.focus();
  }
  dismiss() { this.remember({ dismissedUntil: this.clock() + WEEK }); this.dialog?.close(); }

  async install() {
    if (this.busy) return;
    if (this.installed || (!this.promptEvent && this.manual)) { this.dismiss(); return; }
    if (!this.promptEvent) { this.manual = true; this.render(); return; }
    const event = this.promptEvent; this.promptEvent = null; this.busy = true; this.render();
    try {
      // Keep prompt() in the click's activation; never await a save or network request first.
      this.beforeInstall(); await event.prompt(); const choice = await event.userChoice;
      if (choice?.outcome === 'accepted') {
        this.remember({ dismissedUntil: this.clock() + WEEK }); this.dialog?.close();
      } else this.dismiss();
    } catch {
      this.manual = true;
      if (this.$('install-status')) this.$('install-status').textContent = '브라우저 메뉴에서도 홈 화면에 추가할 수 있어요.';
    } finally { this.busy = false; this.render(); }
  }

  tick() {
    const now = this.clock(), dt = Math.max(0, Math.min(2, (now - this.lastTick) / 1000)); this.lastTick = now;
    const state = this.read();
    if (this.shown || this.installed || state.installedAt || state.dismissedUntil > now || this.doc?.hidden || this.doc?.querySelector('dialog[open]') || !this.isPlaying()) return;
    this.elapsed += dt;
    if (this.elapsed >= this.delay) { this.shown = true; this.open(); }
  }

  init() {
    this.listen(this.win, 'beforeinstallprompt', event => { event.preventDefault(); this.promptEvent = event; this.installed = false; this.remember({ installedAt: null }); this.render(); });
    this.listen(this.win, 'appinstalled', () => {
      this.installed = true; this.promptEvent = null; this.remember({ installedAt: this.clock() }); this.render(); this.dialog?.close(); this.onInstalled();
    });
    this.timer = this.win.setInterval(() => this.tick(), 1000); this.timer?.unref?.();
    try {
      const location = this.win.location;
      if (this.navigator?.serviceWorker && (location?.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location?.hostname))) {
        this.registration = Promise.resolve(this.navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })).catch(() => null);
      }
    } catch { /* Installation support must never interrupt a game or its device save. */ }
    return this;
  }
  dispose() { this.win.clearInterval(this.timer); for (const remove of this.listeners) remove(); }
}
