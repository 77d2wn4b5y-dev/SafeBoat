(function () {
  'use strict';

  const map = window.SafeBoatMap.map;
  const locateButton = document.querySelector('#locate');
  const returnButton = document.querySelector('#return-home');
  const state = document.querySelector('#gps-state');
  const message = document.querySelector('#message');
  let positionMarker;
  let accuracyCircle;
  let homeMarker;
  let returnLine;
  let home = null;
  let firstFix = true;

  function showMessage(text) {
    message.textContent = text;
    message.classList.add('show');
    window.setTimeout(() => message.classList.remove('show'), 5000);
  }

  function compass(degrees) {
    if (!Number.isFinite(degrees)) return '—';
    const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return `${Math.round(degrees)}° ${points[Math.round(degrees / 45) % 8]}`;
  }

  function updatePosition(event) {
    const { latitude, longitude, accuracy, speed, heading } = event.coords;
    const latlng = L.latLng(latitude, longitude);
    if (!positionMarker) {
      positionMarker = L.circleMarker(latlng, { radius: 9, color: '#fff', weight: 3, fillColor: '#20b966', fillOpacity: 1 }).addTo(map);
      accuracyCircle = L.circle(latlng, { radius: accuracy, color: '#20b966', weight: 1, fillOpacity: .1 }).addTo(map);
      home = latlng;
      homeMarker = L.marker(home, { icon: L.divIcon({ className: 'home-marker', html: '⌂', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(map).bindPopup('Početna tačka');
      returnButton.disabled = false;
    } else {
      positionMarker.setLatLng(latlng);
      accuracyCircle.setLatLng(latlng).setRadius(accuracy);
    }
    if (returnLine) returnLine.setLatLngs([latlng, home]);
    if (firstFix) { map.setView(latlng, 16); firstFix = false; }
    document.querySelector('#speed').textContent = Number.isFinite(speed) ? (speed * 1.94384).toFixed(1) : '0.0';
    document.querySelector('#course').textContent = compass(heading);
    document.querySelector('#accuracy').textContent = `±${Math.round(accuracy)} m`;
    document.querySelector('#distance').textContent = (latlng.distanceTo(home) / 1852).toFixed(2);
    state.innerHTML = '<i></i> GPS aktivan';
    state.classList.add('active');
    if (window.SafeBoatSafety && window.SafeBoatSafety.updatePosition) {
      Promise.resolve(window.SafeBoatSafety.updatePosition(event)).catch(() => showMessage('Safety modul trenutno nije dostupan.'));
    }
    if (window.SafeBoatTrip && window.SafeBoatTrip.updatePosition) {
      try { window.SafeBoatTrip.updatePosition(event); } catch (error) { showMessage('Snimanje vožnje trenutno nije dostupno.'); }
    }
    if (window.SafeBoatRoute && window.SafeBoatRoute.updatePosition) {
      try { window.SafeBoatRoute.updatePosition(event); } catch (error) { showMessage('Navigacija rutom trenutno nije dostupna.'); }
    }
    if (window.SafeBoatEmergency && window.SafeBoatEmergency.updatePosition) {
      try { window.SafeBoatEmergency.updatePosition(event); } catch (error) { showMessage('Hitne funkcije trenutno nisu dostupne.'); }
    }
  }

  locateButton.addEventListener('click', () => {
    const started = window.SafeBoatGPS.start(updatePosition, error => {
      state.innerHTML = '<i></i> GPS greška';
      state.classList.remove('active');
      showMessage(error.message || 'Nije moguće dobiti GPS lokaciju.');
    });
    if (started) {
      locateButton.textContent = '◎ GPS praćenje aktivno';
      locateButton.disabled = true;
    }
  });

  returnButton.addEventListener('click', () => {
    if (!home || !positionMarker) return;
    const current = positionMarker.getLatLng();
    if (returnLine) map.removeLayer(returnLine);
    returnLine = L.polyline([current, home], { color: '#ef6c35', weight: 4, dashArray: '9 8' }).addTo(map);
    map.fitBounds(L.latLngBounds(current, home).pad(.25));
    homeMarker.openPopup();
  });

  window.SafeBoatMap.loadAllLayers().catch(error => showMessage(`Neke tačke nisu učitane: ${error.message}`));
  if (window.SafeBoatSafety) Promise.resolve().then(() => window.SafeBoatSafety.init()).catch(() => showMessage('Safety modul nije učitan.'));
  if (window.SafeBoatVoice) { try { window.SafeBoatVoice.init(); } catch (error) { showMessage('Glasovni modul nije učitan.'); } }
  if (window.SafeBoatTrip) { try { window.SafeBoatTrip.init(); } catch (error) { showMessage('Dnevnik vožnji nije učitan.'); } }
  if (window.SafeBoatRoute) { try { window.SafeBoatRoute.init(); } catch (error) { showMessage('Planer rute nije učitan.'); } }
  if (window.SafeBoatEmergency) { try { window.SafeBoatEmergency.init(); } catch (error) { showMessage('Hitne funkcije nisu učitane.'); } }
  const settingsDialog = document.querySelector('#settings-dialog');
  const aboutDialog = document.querySelector('#about-dialog');
  document.querySelector('#settings-open').addEventListener('click', () => settingsDialog.showModal());
  document.querySelector('#about-open').addEventListener('click', () => {
    settingsDialog.close();
    aboutDialog.showModal();
  });
  document.querySelectorAll('[data-voice-demo]').forEach(button => button.addEventListener('click', () => {
    window.SafeBoatVoice.announceTest(button.dataset.voiceDemo);
  }));
  window.addEventListener('safeboat:safety-alert', event => {
    const alert = event.detail;
    showMessage(`${alert.level}: ${alert.hazardName} — ${alert.distance} m`);
  });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}());
