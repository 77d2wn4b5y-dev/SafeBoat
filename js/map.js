(function () {
  'use strict';

  const SITHONIA = [40.19, 23.79];
  const map = L.map('map', { zoomControl: false }).setView(SITHONIA, 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

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
    const response = await fetch(`geojson/${name}.geojson`);
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
      onEachFeature(feature, layer) { layer.bindPopup(popup(feature)); }
    }).addTo(map);
  }

  window.SafeBoatMap = {
    map,
    loadAllLayers() { return Promise.all(Object.keys(labels).map(loadLayer)); }
  };
}());
