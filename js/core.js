(function () {
  'use strict';

  const VERSION = '1.1.1';
  const BUILD = '2026.07.24';
  const LOG_KEY = 'safeboat.logs';
  const THEME_KEY = 'safeboat.theme';
  const levels = { INFO: 0, WARN: 1, ERROR: 2 };
  let debug = false;

  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } }
  function remove(key) { try { localStorage.removeItem(key); return true; } catch (_) { return false; } }
  function log(level, message, context) {
    if (!(level in levels)) level = 'INFO';
    const entry = { level, message: String(message), time: new Date().toISOString() };
    if (context) entry.context = String(context);
    try {
      const previous = JSON.parse(read(LOG_KEY) || '[]');
      write(LOG_KEY, JSON.stringify(previous.concat(entry).slice(-50)));
    } catch (_) { /* logging must never interrupt navigation */ }
    if (debug && window.console) console[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'info']('[SafeBoat]', message, context || '');
  }

  function clearKeys(keys) { keys.forEach(remove); window.dispatchEvent(new CustomEvent('safeboat:storage-changed')); }
  async function clearCache() { if ('caches' in window) await Promise.all((await caches.keys()).map(key => caches.delete(key))); }
  function localUsage() { let bytes = 0; try { for (let i = 0; i < localStorage.length; i += 1) { const key = localStorage.key(i); bytes += (key.length + (localStorage.getItem(key) || '').length) * 2; } } catch (_) { return null; } return bytes; }
  async function estimate() {
    const local = localUsage();
    if (navigator.storage && navigator.storage.estimate) {
      try { const value = await navigator.storage.estimate(); return { used: value.usage || local || 0, quota: value.quota || null, local }; } catch (_) { /* use local estimate */ }
    }
    return { used: local || 0, quota: null, local };
  }

  function systemDark() { return matchMedia('(prefers-color-scheme: dark)').matches; }
  function applyTheme(value) {
    const theme = ['system', 'light', 'dark'].includes(value) ? value : 'system';
    document.documentElement.dataset.theme = theme === 'system' ? (systemDark() ? 'dark' : 'light') : theme;
    document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
    return theme;
  }
  const media = matchMedia('(prefers-color-scheme: dark)');
  const followSystem = () => { if ((read(THEME_KEY) || 'system') === 'system') applyTheme('system'); };
  if (media.addEventListener) media.addEventListener('change', followSystem);
  applyTheme(read(THEME_KEY) || 'system');

  window.SafeBoat = {
    version: VERSION, build: BUILD,
    logger: { info: (message, context) => log('INFO', message, context), warn: (message, context) => log('WARN', message, context), error: (message, context) => log('ERROR', message, context), clear: () => remove(LOG_KEY), setDebug: value => { debug = Boolean(value); } },
    storage: { read, write, remove, estimate, clearCache, clearLogs: () => remove(LOG_KEY), clearRoutes: () => clearKeys(['safeboat.routes.v1']), clearTrips: () => clearKeys(['safeboat.trips.v1', 'safeboat.trip.active.v1']) },
    theme: { get: () => read(THEME_KEY) || 'system', set(value) { const theme = applyTheme(value); write(THEME_KEY, theme); return theme; } }
  };
}());
