(function () {
  'use strict';

  const LEVELS = { INFO: 1, WARNING: 2, DANGER: 3 };
  const REPEAT_MS = 12000;
  const STORAGE_ENABLED = 'safeboat.voice.enabled';
  const STORAGE_LANGUAGE = 'safeboat.voice.language';
  const LANGUAGES = ['sr-RS', 'en-US', 'el-GR'];
  const VIBRATION = {
    INFO: [150], WARNING: [250, 120, 250], DANGER: [400, 150, 400, 150, 600]
  };
  const TONES = { INFO: 1, WARNING: 2, DANGER: 3 };
  function stored(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* preferences remain optional */ } }
  let enabled = stored(STORAGE_ENABLED) !== 'false';
  let language = LANGUAGES.includes(stored(STORAGE_LANGUAGE)) ? stored(STORAGE_LANGUAGE) : 'sr-RS';
  let currentLevel = null;
  let generation = 0;
  let audioContext = null;
  let audioUnlocked = false;
  const lastAnnouncements = new Map();

  const voiceButton = document.querySelector('#voice-toggle');
  const voiceState = document.querySelector('#voice-state');
  const languageSelect = document.querySelector('#voice-language');

  function messageFor(level, hazardName, distance) {
    const metres = Math.max(0, Math.round(Number(distance) || 0));
    const name = String(hazardName || 'Nepoznata opasnost');
    const messages = {
      'sr-RS': {
        INFO: `Informacija. Opasnost ${name} je udaljena približno ${metres} metara.`,
        WARNING: `Upozorenje. Približavate se opasnosti ${name}. Udaljenost je približno ${metres} metara.`,
        DANGER: `Opasnost! ${name} je udaljena samo ${metres} metara. Odmah usporite i promenite kurs.`
      },
      'en-US': {
        INFO: `Information. The hazard ${name} is approximately ${metres} metres away.`,
        WARNING: `Warning. You are approaching the hazard ${name}. It is approximately ${metres} metres away.`,
        DANGER: `Danger! ${name} is only ${metres} metres away. Slow down immediately and change course.`
      },
      'el-GR': {
        INFO: `Πληροφορία. Ο κίνδυνος ${name} απέχει περίπου ${metres} μέτρα.`,
        WARNING: `Προειδοποίηση. Πλησιάζετε τον κίνδυνο ${name}. Η απόσταση είναι περίπου ${metres} μέτρα.`,
        DANGER: `Κίνδυνος! ${name} απέχει μόνο ${metres} μέτρα. Μειώστε αμέσως ταχύτητα και αλλάξτε πορεία.`
      }
    };
    return messages[language][level];
  }

  function updateUI() {
    if (voiceButton) {
      voiceButton.textContent = enabled ? '🔊' : '🔇';
      voiceButton.title = enabled ? 'Isključi glasovna upozorenja' : 'Uključi glasovna upozorenja';
      voiceButton.setAttribute('aria-label', voiceButton.title);
      voiceButton.setAttribute('aria-pressed', String(enabled));
    }
    if (voiceState) voiceState.textContent = enabled ? 'Glasovna upozorenja su uključena' : 'Glasovna upozorenja su isključena';
    if (languageSelect) languageSelect.value = language;
  }

  function getAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioContext) audioContext = new AudioContext();
    return audioContext;
  }

  function unlockAudio() {
    const context = getAudioContext();
    if (!context) return Promise.resolve(false);
    return context.resume().then(() => {
      audioUnlocked = context.state === 'running';
      return audioUnlocked;
    }).catch(() => false);
  }

  function playTone(level) {
    const context = getAudioContext();
    if (!context || !audioUnlocked || context.state !== 'running') return;
    const start = context.currentTime;
    for (let index = 0; index < TONES[level]; index += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = start + index * (level === 'DANGER' ? 0.2 : 0.28);
      oscillator.frequency.value = level === 'DANGER' ? 880 : level === 'WARNING' ? 660 : 520;
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(0.22, toneStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.14);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + 0.15);
    }
  }

  function fallback(level, token) {
    if (enabled && token === generation) playTone(level);
  }

  function announce(detail, bypassRepeat) {
    const level = detail && String(detail.level || '').toUpperCase();
    if (!enabled || !LEVELS[level]) return false;
    const hazardName = String(detail.hazardName || 'Nepoznata opasnost');
    const key = `${level}:${hazardName}`;
    const now = Date.now();
    if (!bypassRepeat && now - (lastAnnouncements.get(key) || 0) < REPEAT_MS) return false;
    if (currentLevel && LEVELS[level] < LEVELS[currentLevel]) return false;

    lastAnnouncements.set(key, now);
    generation += 1;
    const token = generation;
    if (navigator.vibrate) navigator.vibrate(VIBRATION[level]);

    const synthesis = window.speechSynthesis;
    if (!synthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
      currentLevel = null;
      fallback(level, token);
      return true;
    }

    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(detail.message || messageFor(level, hazardName, detail.distance));
    utterance.lang = language;
    currentLevel = level;
    utterance.onend = () => { if (token === generation) currentLevel = null; };
    utterance.onerror = () => {
      if (token !== generation) return;
      currentLevel = null;
      fallback(level, token);
    };
    try { synthesis.speak(utterance); } catch (error) {
      currentLevel = null;
      fallback(level, token);
    }
    return true;
  }

  function enable() {
    enabled = true;
    store(STORAGE_ENABLED, 'true');
    updateUI();
  }

  function disable() {
    enabled = false;
    generation += 1;
    currentLevel = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (navigator.vibrate) navigator.vibrate(0);
    store(STORAGE_ENABLED, 'false');
    updateUI();
  }

  function isEnabled() { return enabled; }
  function setLanguage(value) {
    if (!LANGUAGES.includes(value)) return false;
    language = value;
    store(STORAGE_LANGUAGE, language);
    updateUI();
    return true;
  }
  function getLanguage() { return language; }
  function announceTest(level) {
    const distances = { INFO: 250, WARNING: 120, DANGER: 50 };
    return announce({ level, hazardName: 'Test opasnosti', distance: distances[level] }, true);
  }

  function speakStatus(text) {
    if (!enabled || currentLevel || !text || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return false;
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = language;
    try { window.speechSynthesis.speak(utterance); } catch (error) { return false; }
    return true;
  }

  function init() {
    updateUI();
    return window.SafeBoatVoice;
  }

  window.addEventListener('safeboat:safety-alert', event => announce(event.detail));
  const routeMessages = {
    'sr-RS': { waypoint: name => `Stigli ste do tačke ${name}.`, caution: 'Pažnja. Udaljavate se od planirane rute.', offRoute: 'Upozorenje. Napustili ste planiranu rutu. Proverite kurs.', arrived: 'Stigli ste na odredište.' },
    'en-US': { waypoint: name => `You have reached waypoint ${name}.`, caution: 'Caution. You are moving away from the planned route.', offRoute: 'Warning. You have left the planned route. Check your course.', arrived: 'You have reached your destination.' },
    'el-GR': { waypoint: name => `Φτάσατε στο σημείο ${name}.`, caution: 'Προσοχή. Απομακρύνεστε από την προγραμματισμένη διαδρομή.', offRoute: 'Προειδοποίηση. Βγήκατε από την προγραμματισμένη διαδρομή. Ελέγξτε την πορεία σας.', arrived: 'Φτάσατε στον προορισμό σας.' }
  };
  window.addEventListener('safeboat:waypoint-arrived', event => announce({ level: 'INFO', hazardName: `route-waypoint-${event.detail.waypointIndex}`, message: routeMessages[language].waypoint(String(event.detail.waypointName || '')) }));
  window.addEventListener('safeboat:route-alert', event => announce({ level: 'WARNING', hazardName: `route-${event.detail.level}`, message: event.detail.level === 'OFF_ROUTE' ? routeMessages[language].offRoute : routeMessages[language].caution }));
  window.addEventListener('safeboat:route-arrived', () => announce({ level: 'INFO', hazardName: 'route-arrived', message: routeMessages[language].arrived }));
  function unlockOnControl(event) {
    if (!event.target.closest('button, select')) return;
    unlockAudio();
    document.removeEventListener('click', unlockOnControl, true);
  }
  document.addEventListener('click', unlockOnControl, true);
  if (voiceButton) voiceButton.addEventListener('click', () => enabled ? disable() : enable());
  if (languageSelect) languageSelect.addEventListener('change', event => setLanguage(event.target.value));

  window.SafeBoatVoice = { init, enable, disable, isEnabled, setLanguage, getLanguage, announceTest, speakStatus, unlockAudio };
}());
