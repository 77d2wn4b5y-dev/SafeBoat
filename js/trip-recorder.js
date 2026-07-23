(function () {
  'use strict';

  const TRIPS_KEY = 'safeboat.trips.v1';
  const ACTIVE_KEY = 'safeboat.trip.active.v1';
  const METRES_PER_NM = 1852;
  const KNOTS_PER_MPS = 1.943844;
  const MAX_TRIPS = 20;
  let state = 'IDLE';
  let activeTrip = null;
  let trips = [];
  let lastPosition = null;
  let activeRoute = null;
  let activeStart = null;
  let activeFinish = null;
  let savedRoute = null;
  let savedStart = null;
  let savedFinish = null;
  let wakeLock = null;
  let timer = null;

  const ui = {};
  const finite = Number.isFinite;
  function coordsOf(position) { return position && position.coords ? position.coords : position; }
  function timestampOf(position) { return finite(position && position.timestamp) ? position.timestamp : Date.now(); }
  function safeParse(value, fallback) { try { return JSON.parse(value); } catch (_) { return fallback; } }
  function storageGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { message('Nema dovoljno prostora za čuvanje vožnje.'); return false; } }
  function storageRemove(key) { try { localStorage.removeItem(key); } catch (_) { /* storage remains optional */ } }
  function message(text) { const node = document.querySelector('#message'); if (!node) return; node.textContent = text; node.classList.add('show'); window.setTimeout(() => node.classList.remove('show'), 5000); }
  function validPoint(point) { return point && finite(point.latitude) && Math.abs(point.latitude) <= 90 && finite(point.longitude) && Math.abs(point.longitude) <= 180; }
  function radians(value) { return value * Math.PI / 180; }
  function distanceBetween(a, b) {
    const dLat = radians(b.latitude - a.latitude); const dLon = radians(b.longitude - a.longitude);
    const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }
  function headingDelta(a, b) { if (!finite(a) || !finite(b)) return 0; return Math.abs(((a - b + 540) % 360) - 180); }
  function formatTime(seconds) { const value = Math.max(0, Math.floor(seconds || 0)); return [Math.floor(value / 3600), Math.floor(value % 3600 / 60), value % 60].map(number => String(number).padStart(2, '0')).join(':'); }
  function elapsed(trip) { return Math.max(0, (trip._elapsedMs || 0) + (state === 'RECORDING' && trip._segmentStartedAt ? Date.now() - trip._segmentStartedAt : 0)) / 1000; }
  function defaultName(date) { const d = new Date(date); return `Vožnja ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function markerIcon(colour) { return L.divIcon({ className: 'trip-marker', html: `<span style="background:${colour}"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] }); }
  function removeLayer(layer) { const map = window.SafeBoatMap && window.SafeBoatMap.map; if (map && layer) map.removeLayer(layer); }
  function clearActiveMap() { [activeRoute, activeStart, activeFinish].forEach(removeLayer); activeRoute = activeStart = activeFinish = null; }
  function hideSavedRoute() { [savedRoute, savedStart, savedFinish].forEach(removeLayer); savedRoute = savedStart = savedFinish = null; if (ui.hideRoute) ui.hideRoute.hidden = true; }
  function renderActiveRoute() {
    const map = window.SafeBoatMap && window.SafeBoatMap.map;
    if (!map || !window.L || !activeTrip) return;
    const latlngs = activeTrip.points.filter(validPoint).map(point => [point.latitude, point.longitude]);
    if (!activeRoute) activeRoute = L.polyline(latlngs, { color: '#00d7ff', weight: 5, opacity: state === 'PAUSED' ? 0.45 : 0.92 }).addTo(map);
    else activeRoute.setLatLngs(latlngs).setStyle({ opacity: state === 'PAUSED' ? 0.45 : 0.92 });
    if (latlngs.length && !activeStart) activeStart = L.marker(latlngs[0], { icon: markerIcon('#20b966') }).addTo(map).bindTooltip('Početak');
    if (state === 'IDLE' && latlngs.length) activeFinish = L.marker(latlngs[latlngs.length - 1], { icon: markerIcon('#dc3545') }).addTo(map).bindTooltip('Kraj');
  }
  function calculateStats(trip) {
    trip.durationSeconds = Math.round(elapsed(trip));
    trip.averageSpeedKnots = trip.movingSeconds > 0 ? (trip.distanceMeters / trip.movingSeconds) * KNOTS_PER_MPS : 0;
  }
  function persistActive() { if (!activeTrip) return; calculateStats(activeTrip); storageSet(ACTIVE_KEY, activeTrip); }
  function render() {
    if (!ui.panel) return;
    const trip = activeTrip;
    if (trip) calculateStats(trip);
    ui.panel.dataset.state = state;
    ui.state.textContent = state === 'RECORDING' ? 'SNIMANJE' : state === 'PAUSED' ? 'PAUZIRANO' : 'MIROVANJE';
    ui.elapsed.textContent = formatTime(trip ? trip.durationSeconds : 0);
    ui.distance.textContent = ((trip ? trip.distanceMeters : 0) / METRES_PER_NM).toFixed(2);
    ui.max.textContent = (trip ? trip.maxSpeedKnots : 0).toFixed(1);
    ui.points.textContent = trip ? trip.points.length : 0;
    ui.start.hidden = state !== 'IDLE'; ui.pause.hidden = state !== 'RECORDING'; ui.resume.hidden = state !== 'PAUSED'; ui.stop.hidden = state === 'IDLE';
    renderActiveRoute();
  }
  async function requestWakeLock() { if (!navigator.wakeLock || state !== 'RECORDING' || wakeLock) return; try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } catch (_) { wakeLock = null; } }
  async function releaseWakeLock() { if (!wakeLock) return; const lock = wakeLock; wakeLock = null; try { await lock.release(); } catch (_) { /* already released */ } }
  function start() {
    if (state !== 'IDLE') return false;
    clearActiveMap(); hideSavedRoute();
    const now = Date.now(); activeTrip = { id: `trip-${now}-${Math.random().toString(36).slice(2, 8)}`, name: '', startedAt: new Date(now).toISOString(), endedAt: null, durationSeconds: 0, movingSeconds: 0, distanceMeters: 0, maxSpeedKnots: 0, averageSpeedKnots: 0, points: [], events: [], _elapsedMs: 0, _segmentStartedAt: now };
    state = 'RECORDING'; lastPosition = null; persistActive(); render(); requestWakeLock();
    if (window.SafeBoatVoice && window.SafeBoatVoice.speakStatus) window.SafeBoatVoice.speakStatus('Započeto snimanje vožnje.');
    return true;
  }
  function pause() { if (state !== 'RECORDING') return false; activeTrip._elapsedMs = (activeTrip._elapsedMs || 0) + Date.now() - activeTrip._segmentStartedAt; activeTrip._segmentStartedAt = null; state = 'PAUSED'; persistActive(); releaseWakeLock(); render(); return true; }
  function resume() { if (state !== 'PAUSED') return false; activeTrip._segmentStartedAt = Date.now(); state = 'RECORDING'; lastPosition = null; persistActive(); requestWakeLock(); render(); return true; }
  function stop() {
    if (state === 'IDLE' || !activeTrip) return null;
    if (state === 'RECORDING') activeTrip._elapsedMs = (activeTrip._elapsedMs || 0) + Date.now() - activeTrip._segmentStartedAt;
    state = 'IDLE'; activeTrip._segmentStartedAt = null; activeTrip.endedAt = new Date().toISOString(); activeTrip.name = activeTrip.name || defaultName(activeTrip.startedAt); calculateStats(activeTrip);
    delete activeTrip._elapsedMs; delete activeTrip._segmentStartedAt;
    trips.push(activeTrip); trips.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)); trips = trips.slice(-MAX_TRIPS); storageSet(TRIPS_KEY, trips); storageRemove(ACTIVE_KEY); releaseWakeLock(); render(); renderLogbook();
    const finished = activeTrip; if (window.SafeBoatVoice && window.SafeBoatVoice.speakStatus) window.SafeBoatVoice.speakStatus('Snimanje vožnje je završeno.'); return finished;
  }
  function updatePosition(position) {
    const coords = coordsOf(position); if (!coords || !finite(coords.latitude) || !finite(coords.longitude)) return false;
    lastPosition = { latitude: coords.latitude, longitude: coords.longitude };
    if (state !== 'RECORDING' || !activeTrip || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180 || (finite(coords.accuracy) && coords.accuracy > 100)) return false;
    const timestamp = timestampOf(position); const speedKnots = finite(coords.speed) && coords.speed >= 0 ? coords.speed * KNOTS_PER_MPS : 0;
    const point = { latitude: coords.latitude, longitude: coords.longitude, accuracy: finite(coords.accuracy) ? coords.accuracy : null, speedKnots, heading: finite(coords.heading) ? coords.heading : null, timestamp };
    const previous = activeTrip.points[activeTrip.points.length - 1];
    if (previous) {
      const metres = distanceBetween(previous, point); const seconds = Math.max(0, (timestamp - previous.timestamp) / 1000);
      if (metres < 1 && seconds < 1) return false;
      if (metres < 5 && seconds < 5 && !(speedKnots >= 1 && headingDelta(previous.heading, point.heading) >= 15)) return false;
      const unrealistic = (seconds <= 5 && metres > 500) || (seconds > 0 && metres / seconds * KNOTS_PER_MPS > 80);
      if (!unrealistic) {
        activeTrip.distanceMeters += metres;
        if (speedKnots >= 0.8) activeTrip.movingSeconds += seconds;
      }
    }
    activeTrip.maxSpeedKnots = Math.max(activeTrip.maxSpeedKnots, speedKnots); activeTrip.points.push(point); persistActive(); render(); return true;
  }
  function isRecording() { return state === 'RECORDING'; }
  function isPaused() { return state === 'PAUSED'; }
  function getCurrentTrip() { return activeTrip; }
  function getTrips() { return trips.slice(); }
  function deleteTrip(id) { const original = trips.length; trips = trips.filter(trip => trip.id !== id); if (trips.length === original) return false; storageSet(TRIPS_KEY, trips); renderLogbook(); return true; }
  function clearTrips() { trips = []; storageSet(TRIPS_KEY, trips); hideSavedRoute(); renderLogbook(); }
  function geoJSON(trip) {
    const points = trip.points.filter(validPoint); const properties = { tripId: trip.id, name: trip.name, startedAt: trip.startedAt, endedAt: trip.endedAt, durationSeconds: trip.durationSeconds, distanceMeters: trip.distanceMeters, maxSpeedKnots: trip.maxSpeedKnots, averageSpeedKnots: trip.averageSpeedKnots };
    const features = [{ type: 'Feature', properties: Object.assign({ role: 'route' }, properties), geometry: { type: 'LineString', coordinates: points.map(point => [point.longitude, point.latitude]) } }];
    if (points.length) features.push({ type: 'Feature', properties: Object.assign({ role: 'start' }, properties), geometry: { type: 'Point', coordinates: [points[0].longitude, points[0].latitude] } }, { type: 'Feature', properties: Object.assign({ role: 'finish' }, properties), geometry: { type: 'Point', coordinates: [points[points.length - 1].longitude, points[points.length - 1].latitude] } });
    return { type: 'FeatureCollection', features };
  }
  function exportTripGeoJSON(id) {
    const trip = trips.find(item => item.id === id) || (activeTrip && activeTrip.id === id ? activeTrip : null); if (!trip) return null;
    const output = geoJSON(trip);
    try { const date = new Date(trip.startedAt); const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`; const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/geo+json' })); const link = document.createElement('a'); link.href = url; link.download = `safeboat-trip-${stamp}.geojson`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (_) { message('GeoJSON nije moguće preuzeti.'); }
    return output;
  }
  function showTrip(id) {
    const trip = trips.find(item => item.id === id); const map = window.SafeBoatMap && window.SafeBoatMap.map; if (!trip || !map || !window.L) { message('Ruta nije dostupna za prikaz.'); return; }
    const points = trip.points.filter(validPoint); if (!points.length) { message('Ova vožnja nema ispravne GPS tačke.'); return; }
    hideSavedRoute(); const latlngs = points.map(point => [point.latitude, point.longitude]); savedRoute = L.polyline(latlngs, { color: '#f3a712', weight: 5, opacity: .9, dashArray: '10 7' }).addTo(map); savedStart = L.marker(latlngs[0], { icon: markerIcon('#20b966') }).addTo(map); savedFinish = L.marker(latlngs[latlngs.length - 1], { icon: markerIcon('#dc3545') }).addTo(map); map.fitBounds(savedRoute.getBounds().pad(.15)); ui.hideRoute.hidden = false; ui.dialog.close();
  }
  function renderLogbook() {
    if (!ui.list) return; ui.list.textContent = ''; ui.clear.disabled = !trips.length;
    if (!trips.length) { const empty = document.createElement('p'); empty.className = 'empty-logbook'; empty.textContent = 'Još nema sačuvanih vožnji.'; ui.list.appendChild(empty); return; }
    trips.slice().reverse().forEach(trip => { const article = document.createElement('article'); article.className = 'trip-entry'; const title = document.createElement('h3'); title.textContent = trip.name || defaultName(trip.startedAt); article.appendChild(title); const stats = document.createElement('p'); stats.textContent = `${new Date(trip.startedAt).toLocaleString('sr-RS')} · ${formatTime(trip.durationSeconds)} · ${(trip.distanceMeters / METRES_PER_NM).toFixed(2)} NM · max ${Number(trip.maxSpeedKnots).toFixed(1)} čv · prosek ${Number(trip.averageSpeedKnots).toFixed(1)} čv · ${trip.points.length} tačaka`; article.appendChild(stats); const actions = document.createElement('div'); actions.className = 'trip-entry-actions'; [['Prikaži na mapi', () => showTrip(trip.id)], ['Preimenuj', () => { const name = window.prompt('Novi naziv vožnje:', trip.name || ''); if (name && name.trim()) { trip.name = name.trim().slice(0, 100); storageSet(TRIPS_KEY, trips); renderLogbook(); } }], ['Izvezi GeoJSON', () => exportTripGeoJSON(trip.id)], ['Obriši', () => { if (window.confirm(`Obrisati vožnju „${trip.name}“?`)) deleteTrip(trip.id); }]].forEach(([label, action]) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', action); actions.appendChild(button); }); article.appendChild(actions); ui.list.appendChild(article); });
  }
  function restore() {
    const storedTrips = safeParse(storageGet(TRIPS_KEY), []); trips = Array.isArray(storedTrips) ? storedTrips.filter(trip => trip && typeof trip.id === 'string' && Array.isArray(trip.points)).slice(-MAX_TRIPS) : [];
    const storedActive = safeParse(storageGet(ACTIVE_KEY), null); if (storedActive && typeof storedActive.id === 'string' && Array.isArray(storedActive.points)) { activeTrip = storedActive; activeTrip.events = Array.isArray(activeTrip.events) ? activeTrip.events : []; activeTrip._elapsedMs = finite(activeTrip._elapsedMs) ? activeTrip._elapsedMs : Number(activeTrip.durationSeconds || 0) * 1000; activeTrip._segmentStartedAt = null; state = 'PAUSED'; persistActive(); }
  }
  function init() {
    Object.assign(ui, { panel: document.querySelector('#trip-panel'), state: document.querySelector('#trip-state'), elapsed: document.querySelector('#trip-elapsed'), distance: document.querySelector('#trip-distance'), max: document.querySelector('#trip-max-speed'), points: document.querySelector('#trip-points'), start: document.querySelector('#trip-start'), pause: document.querySelector('#trip-pause'), resume: document.querySelector('#trip-resume'), stop: document.querySelector('#trip-stop'), dialog: document.querySelector('#logbook-dialog'), list: document.querySelector('#logbook-list'), clear: document.querySelector('#trips-clear'), hideRoute: document.querySelector('#saved-route-hide') });
    restore(); if (!ui.panel) return window.SafeBoatTrip;
    ui.start.addEventListener('click', start); ui.pause.addEventListener('click', pause); ui.resume.addEventListener('click', resume); ui.stop.addEventListener('click', stop); document.querySelector('#logbook-open').addEventListener('click', () => { renderLogbook(); ui.dialog.showModal(); }); document.querySelector('#logbook-close').addEventListener('click', () => ui.dialog.close()); ui.hideRoute.addEventListener('click', hideSavedRoute); ui.clear.addEventListener('click', () => { if (trips.length && window.confirm('Obrisati sve sačuvane vožnje?')) clearTrips(); });
    window.addEventListener('safeboat:safety-alert', event => { const detail = event.detail || {}; if (!activeTrip || state !== 'RECORDING' || !['WARNING', 'DANGER'].includes(detail.level) || !lastPosition) return; activeTrip.events.push({ type: 'SAFETY_ALERT', level: detail.level, hazardName: String(detail.hazardName || 'Nepoznata opasnost'), distance: Number(detail.distance) || 0, timestamp: detail.timestamp || Date.now(), latitude: lastPosition.latitude, longitude: lastPosition.longitude }); persistActive(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state === 'RECORDING') requestWakeLock(); });
    timer = window.setInterval(render, 1000); render(); renderLogbook(); return window.SafeBoatTrip;
  }
  window.SafeBoatTrip = { init, start, pause, resume, stop, updatePosition, isRecording, isPaused, getCurrentTrip, getTrips, deleteTrip, clearTrips, exportTripGeoJSON };
}());
