/* =========================================================
   Service Worker — Антитабак PWA
   Просто скопируй этот файл как sw.js
   ========================================================= */

const VERSION = 'antitabak-v1.0.0';
const CACHE_NAME = 'antitabak-cache-' + VERSION;

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        PRECACHE_ASSETS.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function (err) {
            console.warn('[SW] Не удалось закэшировать:', url, err);
          });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key.indexOf('antitabak-cache-') === 0 && key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

/* ---------- Network First (навигация) ---------- */
function networkFirstNavigation(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(request, copy);
      });
    }
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      if (cached) return cached;
      return caches.match('./index.html').then(function (fallback) {
        if (fallback) return fallback;
        return new Response(
          '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>Офлайн</title><style>' +
          'body{margin:0;min-height:100vh;display:flex;align-items:center;' +
          'justify-content:center;background:#0f172a;color:#e2e8f0;' +
          'font-family:-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:24px}' +
          'h1{color:#4ade80}</style></head><body><div><h1>📴 Нет соединения</h1>' +
          '<p>Приложение доступно офлайн, но страница ещё не закэширована.<br>' +
          'Подключись к интернету и обнови.</p></div></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      });
    });
  });
}

/* ---------- Stale While Revalidate (статика) ---------- */
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var networkFetch = fetch(request).then(function (response) {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function () {
        return null;
      });

      if (cached) return cached;

      return networkFetch.then(function (response) {
        return response || new Response('', { status: 504, statusText: 'Offline' });
      });
    });
  });
}

/* ---------- MESSAGE ---------- */
self.addEventListener('message', function (event) {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) { return caches.delete(key); }));
      })
    );
  }
});
