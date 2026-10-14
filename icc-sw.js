// ICC Logger service worker. Only touches its own files so other tools on the same origin are unaffected.
const CACHE = 'icc-logger-v1';
const FILES = ['./', './index.html', './icc-manifest.json', './icc-icon-180.png', './icc-icon-192.png', './icc-icon-512.png', './icc-icon-maskable-512.png'];
const MINE = new Set(FILES.map(f => new URL(f, self.location).pathname));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('icc-logger-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// stale-while-revalidate: opens instantly offline, picks up updates on next launch. Data lives in localStorage/IndexedDB, never in this cache.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !MINE.has(url.pathname)) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      return cached || (await net) || new Response('Offline', { status: 503 });
    })
  );
});
