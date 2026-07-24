const CACHE = 'safeboat-v1.1.1';
const APP_SHELL = [...new Set([
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/core.js', './js/map.js', './js/gps.js', './js/safety.js', './js/voice-copilot.js', './js/trip-recorder.js', './js/route-planner.js', './js/emergency.js', './js/sithonia-guide.js', './js/ui-panels.js', './js/app.js',
  './data/beaches.geojson', './data/rocks.geojson', './data/marinas.geojson', './data/fuel.geojson', './data/sithonia-places.geojson',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
])];

self.addEventListener('install', event => {
  const localShell = APP_SHELL.filter(url => url.startsWith('./'));
  const optionalRemote = APP_SHELL.filter(url => !url.startsWith('./'));
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(localShell);
    await Promise.allSettled(optionalRemote.map(url => cache.add(url)));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('safeboat-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok || response.type === 'opaque') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
