/* Lahore Lawyers — service worker.  Bump VERSION to force an update. */
const VERSION = 'll-v7';
const SHELL = 'shell-' + VERSION;
const PHOTOS = 'photos-v1';   // stable across app updates so photos aren't re-downloaded

const SHELL_ASSETS = [
  '.', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'data/lawyers.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(SHELL).then((c) =>
      Promise.allSettled(SHELL_ASSETS.map((u) => c.add(u)))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL && k !== PHOTOS).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Photos: cache-first, stored in dedicated cache (fills up as viewed/precached).
  if (url.pathname.includes('/photos/')) {
    e.respondWith(
      caches.open(PHOTOS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (err) {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // Shell + data: cache-first, fall back to network, then update cache.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && (url.origin === location.origin)) {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
