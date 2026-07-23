(function () {
  'use strict';

  const METRES_PER_NAUTICAL_MILE = 1852;
  const ALERT_REPEAT_MS = 30000;
  const LEVELS = { SAFE: 0, INFO: 1, WARNING: 2, DANGER: 3 };
  const COLOURS = { SAFE: '#20b966', INFO: '#1294d8', WARNING: '#ed8b24', DANGER: '#dc3545' };
  let enabled = true;
  let hazards = [];
  let loadPromise;
  let hazardCircle;
  let approachLine;
  let lastAlert = null;
  let lastEvaluation = null;

  const panel = document.querySelector('#safety-panel');
  const toggleButton = document.querySelector('#safety-toggle');
  const testButton = document.querySelector('#safety-test');
  const statusElement = document.querySelector('#safety-status');
  const hazardElement = document.querySelector('#safety-hazard');
  const distanceElement = document.querySelector('#safety-distance');
  const accuracyElement = document.querySelector('#safety-accuracy');
  const approachElement = document.querySelector('#safety-approach');

  function toRadians(value) { return value * Math.PI / 180; }
  function toDegrees(value) { return value * 180 / Math.PI; }

  function distanceBetween(from, to) {
    const earthRadius = 6371000;
    const latitudeDelta = toRadians(to.latitude - from.latitude);
    const longitudeDelta = toRadians(to.longitude - from.longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bearingBetween(from, to) {
    const fromLatitude = toRadians(from.latitude);
    const toLatitude = toRadians(to.latitude);
    const longitudeDelta = toRadians(to.longitude - from.longitude);
    const y = Math.sin(longitudeDelta) * Math.cos(toLatitude);
    const x = Math.cos(fromLatitude) * Math.sin(toLatitude) -
      Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);
    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  function relativeAngle(bearing, heading) {
    return ((bearing - heading + 540) % 360) - 180;
  }

  function proximityLevel(distance, accuracy) {
    let level = distance < 75 ? 'DANGER' : distance <= 150 ? 'WARNING' : distance <= 300 ? 'INFO' : 'SAFE';
    if (level === 'DANGER' && accuracy > 50) level = 'WARNING';
    return level;
  }

  function alertRadius(level) {
    return level === 'DANGER' ? 75 : level === 'WARNING' ? 150 : 300;
  }

  function clearMapLayers() {
    const map = window.SafeBoatMap && window.SafeBoatMap.map;
    if (!map) return;
    if (hazardCircle) map.removeLayer(hazardCircle);
    if (approachLine) map.removeLayer(approachLine);
    hazardCircle = null;
    approachLine = null;
  }

  function drawMap(position, evaluation) {
    const map = window.SafeBoatMap && window.SafeBoatMap.map;
    if (!map || !window.L) return;
    const boat = [position.latitude, position.longitude];
    const hazard = [evaluation.hazard.latitude, evaluation.hazard.longitude];
    const options = {
      radius: alertRadius(evaluation.level), color: COLOURS[evaluation.level],
      weight: 2, fillColor: COLOURS[evaluation.level], fillOpacity: 0.1
    };
    if (!hazardCircle) hazardCircle = L.circle(hazard, options).addTo(map);
    else hazardCircle.setLatLng(hazard).setRadius(options.radius).setStyle(options);
    const lineOptions = { color: COLOURS[evaluation.level], weight: 3, dashArray: '8 8', opacity: 0.9 };
    if (!approachLine) approachLine = L.polyline([boat, hazard], lineOptions).addTo(map);
    else approachLine.setLatLngs([boat, hazard]).setStyle(lineOptions);
  }

  function approachLabel(state) {
    if (state === 'approaching') return 'Približavanje';
    if (state === 'moving-away') return 'Udaljavanje';
    return 'Nepoznato';
  }

  function render(evaluation) {
    if (!panel) return;
    panel.dataset.level = evaluation.level;
    statusElement.textContent = evaluation.level;
    hazardElement.textContent = evaluation.hazardName;
    distanceElement.textContent = `${Math.round(evaluation.distance)} m`;
    accuracyElement.textContent = Number.isFinite(evaluation.accuracy) ? `±${Math.round(evaluation.accuracy)} m` : '—';
    approachElement.textContent = approachLabel(evaluation.approachState);
  }

  function eventDetail(evaluation, level) {
    return {
      level: level || evaluation.level,
      hazardName: evaluation.hazardName,
      distance: Math.round(evaluation.distance),
      accuracy: Number.isFinite(evaluation.accuracy) ? evaluation.accuracy : null,
      approaching: evaluation.approaching,
      timestamp: Date.now()
    };
  }

  function maybeAlert(evaluation) {
    if (!evaluation.approaching || evaluation.level === 'SAFE') return;
    const now = Date.now();
    const sameHazard = lastAlert && lastAlert.hazardName === evaluation.hazardName;
    const increased = !sameHazard || LEVELS[evaluation.level] > LEVELS[lastAlert.level];
    const repeatDue = sameHazard && lastAlert.level === evaluation.level && now - lastAlert.timestamp >= ALERT_REPEAT_MS;
    if (!increased && !repeatDue) return;
    const detail = eventDetail(evaluation);
    lastAlert = { hazardName: evaluation.hazardName, level: evaluation.level, timestamp: now };
    window.dispatchEvent(new CustomEvent('safeboat:safety-alert', { detail }));
  }

  async function loadHazards() {
    const response = await fetch('data/rocks.geojson');
    if (!response.ok) throw new Error(`rocks.geojson (${response.status})`);
    const geojson = await response.json();
    hazards = geojson.features.filter(feature => feature.geometry && feature.geometry.type === 'Point').map(feature => ({
      name: (feature.properties && feature.properties.name) || 'Nepoznata opasnost',
      longitude: Number(feature.geometry.coordinates[0]),
      latitude: Number(feature.geometry.coordinates[1])
    })).filter(hazard => Number.isFinite(hazard.latitude) && Number.isFinite(hazard.longitude));
  }

  function init() {
    if (!loadPromise) loadPromise = loadHazards().catch(error => {
      hazardElement.textContent = 'Opasnosti nisu učitane';
      throw error;
    });
    return loadPromise;
  }

  async function updatePosition(positionEvent) {
    if (!enabled) return null;
    await init();
    const coords = positionEvent && positionEvent.coords ? positionEvent.coords : positionEvent;
    if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude) || !hazards.length) {
      clearMapLayers();
      return null;
    }
    const current = { latitude: coords.latitude, longitude: coords.longitude };
    const nearest = hazards.reduce((best, hazard) => {
      const distance = distanceBetween(current, hazard);
      return !best || distance < best.distance ? { hazard, distance } : best;
    }, null);
    const bearing = bearingBetween(current, nearest.hazard);
    const heading = Number.isFinite(coords.heading) ? ((coords.heading % 360) + 360) % 360 : null;
    const speedKnots = Number.isFinite(coords.speed) ? coords.speed * 3600 / METRES_PER_NAUTICAL_MILE : 0;
    const angle = heading === null ? null : relativeAngle(bearing, heading);
    let approachState = 'unknown';
    if (speedKnots >= 1 && angle !== null) {
      if (Math.abs(angle) <= 60) approachState = 'approaching';
      else if (Math.abs(angle) >= 120) approachState = 'moving-away';
    }
    const accuracy = Number.isFinite(coords.accuracy) ? coords.accuracy : Infinity;
    const evaluation = {
      level: proximityLevel(nearest.distance, accuracy), hazard: nearest.hazard,
      hazardName: nearest.hazard.name, distance: nearest.distance, accuracy,
      bearing, relativeAngle: angle, speedKnots, approachState,
      approaching: approachState === 'approaching'
    };
    if (nearest.distance > 350) lastAlert = null;
    lastEvaluation = evaluation;
    render(evaluation);
    drawMap(current, evaluation);
    window.dispatchEvent(new CustomEvent('safeboat:safety-update', { detail: eventDetail(evaluation) }));
    maybeAlert(evaluation);
    return evaluation;
  }

  function enable() {
    enabled = true;
    if (panel) panel.classList.remove('disabled');
    if (toggleButton) { toggleButton.textContent = '🛡️ Safety ON'; toggleButton.setAttribute('aria-pressed', 'true'); }
  }

  function disable() {
    enabled = false;
    clearMapLayers();
    if (panel) panel.classList.add('disabled');
    if (toggleButton) { toggleButton.textContent = '🛡️ Safety OFF'; toggleButton.setAttribute('aria-pressed', 'false'); }
  }

  function isEnabled() { return enabled; }

  function testAlert() {
    const source = lastEvaluation || {
      level: 'DANGER', hazardName: 'Test opasnosti', distance: 50,
      accuracy: 5, approaching: true
    };
    const evaluation = Object.assign({}, source, { approaching: true });
    window.dispatchEvent(new CustomEvent('safeboat:safety-alert', {
      detail: eventDetail(evaluation, 'DANGER')
    }));
  }

  if (toggleButton) toggleButton.addEventListener('click', () => enabled ? disable() : enable());
  if (testButton) testButton.addEventListener('click', testAlert);
  enable();
  window.SafeBoatSafety = { init, updatePosition, enable, disable, isEnabled, testAlert };
}());
