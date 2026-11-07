import { handleApi } from './api.js';

const STATIC_ASSETS = /*__STATIC_ASSETS__*/ {};

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api' || pathname.startsWith('/api/')) return handleApi(request, env, ctx);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const asset = STATIC_ASSETS[pathname === '/' ? '/index.html' : pathname];
    if (!asset) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : asset.encoding==='base64'?Uint8Array.from(atob(asset.body),character=>character.charCodeAt(0)):asset.body, {
      headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' },
    });
  },
};
