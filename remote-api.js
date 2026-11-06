/** Explicit session authentication for a game hosted separately from its API. */
export function createApiFetcher(base, { fetcher = globalThis.fetch?.bind(globalThis), storage } = {}) {
  const api = new URL(base);
  if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw new Error('HTTPS API 원본 주소를 확인해 주세요.');
  if (!fetcher) throw new Error('친구 서버에 연결할 수 없어요.');
  if (storage === undefined) { try { storage = globalThis.sessionStorage; } catch { storage = null; } }
  const key = `suika-garden-api-session-v1:${api.origin}`;
  const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
  let token = null;
  try { const saved = storage?.getItem(key); if (valid(saved)) token = saved; } catch {}
  function remember(value) {
    token = valid(value) ? value : null;
    try { if (token) storage?.setItem(key, token); else storage?.removeItem(key); } catch {}
  }
  return async (path, init = {}) => {
    if (typeof path !== 'string' || !/^\/api(?:\/|$)/.test(path)) throw new Error('API 경로를 확인해 주세요.');
    const url = new URL(path, api);
    if (url.origin !== api.origin) throw new Error('API 원본을 확인해 주세요.');
    const headers = new Headers(init.headers);
    headers.delete('Authorization');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetcher(url.href, { ...init, headers, credentials: 'omit', mode: 'cors', redirect: 'error', cache: 'no-store' });
    if (response.status === 401) remember(null);
    if (response.ok && ['/api/auth/login', '/api/auth/register'].includes(url.pathname)) {
      const payload = await response.clone().json();
      if (!valid(payload.accessToken)) throw new Error('GitHub 게임과 로그인 서버 연결을 확인해 주세요.');
      remember(payload.accessToken);
    }
    if (response.ok && url.pathname === '/api/auth/logout') remember(null);
    return response;
  };
}
