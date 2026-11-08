/* LSP Games offline cache. The big files (3D engine, game code) are kept on the device so
 * the installed app opens fast. Pages always check for a newer version first. Sign-in,
 * points, payments and multiplayer always go to the server. */
const CACHE = 'lspgames-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/logo.png', '/logo-192.png', '/vendor/three.module.min.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /^\/(api|auth|ws)/.test(u.pathname)) return;
  const big = u.pathname.startsWith('/vendor/');
  if (big) { // the engine never changes for a given file name: cache first
    e.respondWith(caches.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; })));
    return;
  }
  // everything else: newest from the network, the saved copy when offline
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then((hit) => hit || caches.match('/index.html'))));
});
