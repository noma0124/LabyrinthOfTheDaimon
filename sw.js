const CACHE_NAME = 'wizard-tensei-v1';
const urlsToCache = [
  './',
  './index.html',
  './shop_styles.css',
  './gamedata.js'
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// ネットワーク優先のフェッチ戦略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});