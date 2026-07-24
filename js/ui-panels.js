(function () {
  'use strict';

  const PREFERENCE_KEY = 'safeboat.ui.panels.expanded.v1';
  const HINT_KEY = 'safeboat.ui.mapTapHintSeen.v1';
  const sections = [
    { id: 'gps', title: 'GPS i telemetrija', status: 'GPS status', nodes: ['.telemetry'] },
    { id: 'safety', title: 'Bezbednost', status: 'Bezbednosni status', nodes: ['#safety-panel'] },
    { id: 'trip', title: 'Vožnja', status: 'Status vožnje', nodes: ['#trip-panel'] },
    { id: 'route', title: 'Ruta', status: 'Status rute', nodes: ['#route-panel'] },
    { id: 'anchor', title: 'Sidro', status: 'Anchor Watch status', nodes: ['#anchor-panel'] }
  ];
  const interactiveSelector = '.leaflet-marker-icon,.leaflet-popup,.leaflet-tooltip,.leaflet-control,.leaflet-interactive,button,a,input,select,textarea,label,summary,[role="button"],[data-prevent-map-toggle],.sithonia-marker,.route-marker,.route-waypoint,.mob-marker,.anchor-marker,.main-panels,.panel';
  let expanded = false;
  let activeSection = 'gps';
  let root;
  let toggleButton;
  let live;
  let chips;
  let statusTimer;

  function read(key) { try { return window.SafeBoat?.storage?.read(key) ?? localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { return window.SafeBoat?.storage?.write(key, value) ?? (localStorage.setItem(key, value), true); } catch (_) { return false; } }
  function isInteractiveMapTarget(target) { return Boolean(target && target.closest && target.closest(interactiveSelector)); }
  function dialogsOpen() { return Boolean(document.querySelector('dialog[open]')); }
  function invalidateMap() { requestAnimationFrame(() => window.SafeBoatMap?.map?.invalidateSize({ pan: false, debounceMoveend: true })); }
  function announce(text) { if (live) live.textContent = text; }
  function render() {
    document.body.classList.toggle('panels-expanded', expanded);
    document.body.classList.toggle('panels-collapsed', !expanded);
    if (root) root.setAttribute('aria-hidden', String(!expanded));
    if (toggleButton) {
      toggleButton.textContent = expanded ? '×' : '☰';
      toggleButton.setAttribute('aria-expanded', String(expanded));
      toggleButton.setAttribute('aria-label', expanded ? 'Sakrij kontrolne panele' : 'Prikaži kontrolne panele');
    }
    updateStatuses();
    invalidateMap();
  }
  function setExpanded(value, options = {}) {
    const changed = expanded !== Boolean(value);
    expanded = Boolean(value);
    if (options.persist !== false) write(PREFERENCE_KEY, String(expanded));
    if (expanded && !activeSection) activeSection = preferredSection();
    render();
    if (changed) announce(expanded ? 'Kontrolni paneli su otvoreni.' : 'Kontrolni paneli su sakriveni.');
    if (options.focus && expanded) document.querySelector('.accordion-toggle[aria-expanded="true"]')?.focus();
    return expanded;
  }
  function preferredSection() {
    if (window.SafeBoatRoute?.isNavigating?.()) return 'route';
    if (window.SafeBoatTrip?.isRecording?.()) return 'trip';
    if (window.SafeBoatEmergency?.isAnchorWatchActive?.()) return 'anchor';
    return 'gps';
  }
  function expand(options) { return setExpanded(true, options); }
  function collapse(options) { return setExpanded(false, options); }
  function toggle(options) { return setExpanded(!expanded, options); }
  function openSection(id, options = {}) {
    if (!sections.some(section => section.id === id)) return false;
    activeSection = id;
    document.querySelectorAll('.accordion-section').forEach(section => {
      const open = section.dataset.section === id;
      section.classList.toggle('section-expanded', open);
      section.querySelector('.accordion-toggle')?.setAttribute('aria-expanded', String(open));
      section.querySelector('.accordion-content')?.toggleAttribute('hidden', !open);
    });
    if (!expanded) expand(options);
    return true;
  }
  function closeSection(id) { if (activeSection !== id) return false; activeSection = null; openSectionState(); return true; }
  function openSectionState() {
    document.querySelectorAll('.accordion-section').forEach(section => {
      const open = section.dataset.section === activeSection;
      section.classList.toggle('section-expanded', open);
      section.querySelector('.accordion-toggle')?.setAttribute('aria-expanded', String(open));
      section.querySelector('.accordion-content')?.toggleAttribute('hidden', !open);
    });
  }
  function statusFor(id) {
    if (id === 'gps') return document.querySelector('#gps-state')?.textContent.trim() || 'GPS status nije dostupan';
    if (id === 'safety') return document.querySelector('#safety-status')?.textContent.trim() || 'Bezbednosni status';
    if (id === 'trip') return document.querySelector('#trip-state')?.textContent.trim() || 'Status vožnje';
    if (id === 'route') return document.querySelector('#route-summary')?.textContent.trim() || 'Status rute';
    return document.querySelector('#anchor-status')?.textContent.trim() || 'Anchor Watch status';
  }
  function activeStates() {
    const result = [];
    if (document.querySelector('#gps-state')?.classList.contains('active')) result.push(['gps', '● GPS aktivan', 'active']);
    if (['RECORDING', 'PAUSED'].includes(document.querySelector('#trip-panel')?.dataset.state)) result.push(['trip', '● Snimanje vožnje', 'active']);
    if (['NAVIGATING', 'PAUSED'].includes(document.querySelector('#route-panel')?.dataset.status)) result.push(['route', '● Navigacija aktivna', 'active']);
    if (window.SafeBoatEmergency?.isAnchorWatchActive?.()) result.push(['anchor', '⚓ Sidro aktivno', 'active']);
    const safety = document.querySelector('#safety-panel')?.dataset.level;
    if (['WARNING', 'DANGER'].includes(safety)) result.push(['safety', `⚠ ${safety === 'DANGER' ? 'OPASNOST' : 'Upozorenje'}`, safety.toLowerCase()]);
    if (!navigator.onLine) result.push(['gps', '⚠ Offline', 'warning']);
    return result;
  }
  function updateStatuses() {
    sections.forEach(section => { const node = document.querySelector(`#accordion-status-${section.id}`); if (node) node.textContent = statusFor(section.id); });
    if (!chips) return;
    chips.textContent = '';
    activeStates().forEach(([id, label, priority]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = `status-chip ${priority}`; button.textContent = label;
      button.addEventListener('click', event => { event.stopPropagation(); openSection(id, { persist: true }); }); chips.appendChild(button);
    });
  }
  function build() {
    root = document.createElement('section'); root.id = 'main-panels'; root.className = 'main-panels'; root.setAttribute('aria-label', 'Kontrolni paneli'); root.dataset.preventMapToggle = '';
    root.innerHTML = '<div class="sheet-handle" aria-hidden="true"></div><h2 class="visually-hidden">Kontrolni paneli</h2>';
    sections.forEach(section => {
      const wrap = document.createElement('section'); wrap.className = 'accordion-section'; wrap.dataset.section = section.id;
      const contentId = `accordion-content-${section.id}`;
      wrap.innerHTML = `<button type="button" class="accordion-toggle" aria-expanded="false" aria-controls="${contentId}"><span>${section.title}</span><small id="accordion-status-${section.id}">${section.status}</small></button><div id="${contentId}" class="accordion-content" hidden></div>`;
      section.nodes.forEach(selector => { const node = document.querySelector(selector); if (node) { node.classList.add('managed-panel'); wrap.lastElementChild.appendChild(node); } });
      wrap.firstElementChild.addEventListener('click', () => activeSection === section.id ? closeSection(section.id) : openSection(section.id)); root.appendChild(wrap);
    });
    document.body.appendChild(root);
    toggleButton = document.createElement('button'); toggleButton.id = 'panels-toggle'; toggleButton.type = 'button'; toggleButton.className = 'panels-toggle'; toggleButton.setAttribute('aria-controls', 'main-panels'); toggleButton.dataset.preventMapToggle = '';
    toggleButton.addEventListener('click', event => { event.stopPropagation(); toggle({ persist: true, focus: true }); }); document.body.appendChild(toggleButton);
    chips = document.createElement('div'); chips.id = 'active-status-chips'; chips.className = 'active-status-chips'; chips.setAttribute('aria-label', 'Aktivni statusi'); chips.dataset.preventMapToggle = ''; document.body.appendChild(chips);
    live = document.createElement('div'); live.className = 'visually-hidden'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live);
    openSectionState();
  }
  function onMapClick(event) {
    const original = event.originalEvent;
    if (!original || original._safeBoatInteractive || original.defaultPrevented || isInteractiveMapTarget(original.target) || dialogsOpen() || window.SafeBoatRoute?.isPlanning?.() || window.SafeBoatEmergency?.isMOBActive?.()) return;
    const opening = !expanded; toggle({ persist: true });
    if (opening && read(HINT_KEY) !== 'true') {
      write(HINT_KEY, 'true');
      const message = document.querySelector('#message');
      if (message) { message.textContent = 'Kontrolni paneli su otvoreni. Dodirnite praznu mapu ponovo da ih sakrijete.'; message.classList.add('show'); setTimeout(() => message.classList.remove('show'), 5000); }
    }
  }
  function init() {
    if (root) return window.SafeBoatPanels;
    expanded = read(PREFERENCE_KEY) === 'true'; activeSection = preferredSection(); build(); render();
    window.SafeBoatMap?.map?.on('click', onMapClick);
    statusTimer = window.setInterval(updateStatuses, 1000);
    window.addEventListener('online', updateStatuses); window.addEventListener('offline', updateStatuses);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && expanded && !dialogsOpen() && !window.SafeBoatEmergency?.isMOBActive?.()) collapse({ persist: true }); });
    return window.SafeBoatPanels;
  }
  function getState() { return { expanded, activeSection, preference: read(PREFERENCE_KEY) }; }
  window.SafeBoatPanels = { init, expand, collapse, toggle, isExpanded: () => expanded, openSection, closeSection, getState, isInteractiveMapTarget };
}());
