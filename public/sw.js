const CACHE_NAME = 'noteio-v2';
const STATIC_ASSETS = ['/', '/index.html', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Firebase/external API calls — always go to network
  if (url.hostname !== self.location.hostname) return;

  // Only cache successful responses (C5 fix: skip error responses)
  function cacheIfOk(req, response) {
    if (!response || response.status !== 200 || response.type === 'opaque') return response;
    const clone = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
    return response;
  }

  // For navigation requests — network first, fall back to cached index.html (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(r => cacheIfOk(request, r)).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For JS/CSS assets (hashed filenames) — cache first, fall back to network
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(r => cacheIfOk(request, r));
      })
    );
    return;
  }

  // For everything else — network first, cache fallback
  event.respondWith(
    fetch(request).then(r => cacheIfOk(request, r)).catch(() => caches.match(request))
  );
});
