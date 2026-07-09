/* Orgo Planner service worker — makes the app installable + offline-capable.
   App shell is precached; PDFs/resources are cached on first open. */
const CACHE = 'orgo-planner-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // let cross-origin requests pass through
  const isPDF = url.pathname.endsWith('.pdf');

  // App page navigations (not PDFs): network-first so updates land, fall back to cached shell offline.
  if (req.mode === 'navigate' && !isPDF) {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  // Everything else (assets + PDFs opened in a tab): cache-first, then network, and cache the result.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
