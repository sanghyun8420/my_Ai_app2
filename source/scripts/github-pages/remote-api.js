import {createSessionFetcher} from '../../dist/api-session.js';
/** Explicit session authentication for a game hosted separately from its API. */
export function createApiFetcher(base, { fetcher = globalThis.fetch?.bind(globalThis), storage } = {}) {
  const api = new URL(base);
  if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw new Error('HTTPS API 원본 주소를 확인해 주세요.');
  if (!fetcher) throw new Error('친구 서버에 연결할 수 없어요.');
  const session=createSessionFetcher({origin:api.origin,storage,explicit:false,fetcher:(path,init)=>fetcher(new URL(path,api).href,{...init,credentials:'omit',mode:'cors',redirect:'error'})});
  return async (path, init = {}) => {
    if (typeof path !== 'string' || !/^\/api(?:\/|$)/.test(path)) throw new Error('API 경로를 확인해 주세요.');
    const url = new URL(path, api);
    if (url.origin !== api.origin) throw new Error('API 원본을 확인해 주세요.');
    return session(path,init);
  };
}
