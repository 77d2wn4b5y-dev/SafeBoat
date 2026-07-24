(function () {
  'use strict';

  const SITHONIA = [40.1855, 23.8250];
  const defaultZoom = () => window.innerWidth < 500 ? 12 : 13;
  const map = L.map('map', { zoomControl: false, preferCanvas: true, zoomAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches, markerZoomAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches }).setView(SITHONIA, defaultZoom());

  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  tiles.on('tileerror', () => window.SafeBoat && window.SafeBoat.logger.warn('Pozadinska mapa trenutno nije dostupna'));
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  // Canvas-rendered paths share the map canvas as their DOM target. Mark their
  // Leaflet click before it bubbles to the empty-map panel gesture.
  map.on('layeradd', event => {
    if (event.layer instanceof L.Path) event.layer.on('click', layerEvent => {
      if (layerEvent.originalEvent) layerEvent.originalEvent._safeBoatInteractive = true;
    });
  });

  const labels = {
    beaches: { emoji: '🏖', className: '' },
    rocks: { emoji: '⚠', className: 'poi-rock' },
    marinas: { emoji: '⚓', className: 'poi-marina' },
    fuel: { emoji: '⛽', className: 'poi-fuel' }
  };

  function popup(feature) {
    const properties = feature.properties || {};
    const wrapper = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = properties.name || 'Tačka na mapi';
    wrapper.appendChild(title);
    if (properties.description) {
      wrapper.appendChild(document.createElement('br'));
      wrapper.appendChild(document.createTextNode(properties.description));
    }
    return wrapper;
  }

  async function loadLayer(name) {
    const response = await fetch(`data/${name}.geojson`);
    if (!response.ok) throw new Error(`${name}.geojson (${response.status})`);
    const config = labels[name];
    const data = await response.json();
    return L.geoJSON(data, {
      pointToLayer(feature, latlng) {
        return L.marker(latlng, { icon: L.divIcon({
          className: `poi-icon ${config.className}`,
          html: config.emoji,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        }) });
      },
      onEachFeature(feature, layer) {
        layer.bindPopup(popup(feature));
        layer.on('click', event => { if (event.originalEvent) event.originalEvent._safeBoatInteractive = true; });
      }
    }).addTo(map);
  }

  window.SafeBoatMap = {
    map,
    setDefaultSithoniaView() { map.setView(SITHONIA, defaultZoom()); return map; },
    async loadAllLayers() {
      const results = await Promise.allSettled(Object.keys(labels).map(loadLayer));
      const failed = results.filter(result => result.status === 'rejected');
      if (failed.length === results.length) throw new Error('Tačke na mapi trenutno nisu dostupne.');
      if (failed.length && window.SafeBoat) window.SafeBoat.logger.warn(`${failed.length} slojeva mape nije učitano`);
      return results;
    }
  };
  let resizeFrame = null;
  window.addEventListener('resize', () => { if (resizeFrame) cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { resizeFrame = null; map.invalidateSize({ pan: false, debounceMoveend: true }); }); }, { passive: true });
}());
