var CACHE_NAME = 'moa-cache-v1.2.6';
var APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(APP_SHELL); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  // 가계부 연동(Firestore) 요청은 캐시하지 않는다
  if (req.url.indexOf('googleapis.com') !== -1) return;
  event.respondWith(caches.match(req).then(function (cached) {
    var network = fetch(req).then(function (res) {
      if (res && res.status === 200 && req.url.indexOf('http') === 0) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () { return cached; });
    return cached || network;
  }));
});
