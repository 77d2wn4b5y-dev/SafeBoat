const CACHE = 'safeboat-v0.4.1';
const APP_SHELL = [
  './', './index.html', './css/styles.css', './manifest.webmanifest',
  './js/map.js', './js/gps.js', './js/app.js',
  './geojson/beaches.geojson', './geojson/rocks.geojson',
  './geojson/marinas.geojson', './geojson/fuel.geojson'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => {
    const network = fetch(event.request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    });
    return cached || network.catch(() => caches.match('./index.html'));
  }));
});
