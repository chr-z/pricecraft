// PriceCraft service worker (PWA offline-first). Serves the built Vite bundle.
// CACHE_VERSION is rewritten by CI to the git short SHA on every deploy,
// so clients pick up new bundles immediately.
const CACHE = 'pricecraft-v2-' + self.__PRICECRAFT_CACHE_VERSION__;

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './locales/en.json',
  './locales/pt-BR.json',
  './manifest.json',
  './js/pay.js',
  './upgrade.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Offline-first: cache falls back to network; hashed Vite assets (.wasm included)
// are cached on first fetch.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
