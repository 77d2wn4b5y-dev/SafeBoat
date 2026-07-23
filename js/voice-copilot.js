(function () {
  'use strict';

  const languageSelect = document.querySelector('#voice-language');
  const toggle = document.querySelector('#voice-toggle');
  const levels = { INFO: 1, WARNING: 2, DANGER: 3 };
  const phrases = {
    'sr-RS': { INFO: 'Informacija. Obratite pažnju na uslove plovidbe.', WARNING: 'Upozorenje. Približavate se mogućoj opasnosti.', DANGER: 'Opasnost! Odmah usporite i promenite kurs.' },
    'en-US': { INFO: 'Information. Pay attention to navigation conditions.', WARNING: 'Warning. You are approaching a possible hazard.', DANGER: 'Danger! Slow down immediately and change course.' },
    'el-GR': { INFO: 'Πληροφορία. Προσέξτε τις συνθήκες πλοήγησης.', WARNING: 'Προειδοποίηση. Πλησιάζετε πιθανό κίνδυνο.', DANGER: 'Κίνδυνος! Μειώστε αμέσως ταχύτητα και αλλάξτε πορεία.' }
  };
  const speechAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const recent = new Map();
  let enabled = localStorage.getItem('safeboat.voice.enabled') !== 'false';
  let currentLevel = 0;
  let currentUtterance = null;

  function selectedLanguage() { return phrases[languageSelect.value] ? languageSelect.value : 'sr-RS'; }
  function updateToggle() {
    toggle.textContent = enabled ? '🔊' : '🔇';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Isključi glasovna upozorenja' : 'Uključi glasovna upozorenja');
    toggle.classList.toggle('muted', !enabled);
  }
  function beep(level) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = level === 3 ? 880 : level === 2 ? 660 : 440;
    gain.gain.setValueAtTime(.16, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .35);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .35);
    oscillator.addEventListener('ended', () => context.close());
  }
  function announce(event) {
    if (!enabled) return;
    const detail = event.detail || {};
    const severity = String(detail.severity || detail.level || detail.type || 'INFO').toUpperCase();
    const level = levels[severity] || levels.INFO;
    const text = String(detail.voiceMessage || detail.message || phrases[selectedLanguage()][severity] || phrases[selectedLanguage()].INFO);
    const key = `${selectedLanguage()}|${severity}|${text}`;
    const now = Date.now();
    if (now - (recent.get(key) || 0) < 12000) return;
    recent.set(key, now);
    if (speechAvailable) {
      if (window.speechSynthesis.speaking && level <= currentLevel) return;
      if (window.speechSynthesis.speaking) {
        currentUtterance = null;
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage(); utterance.rate = .95; utterance.pitch = level === 3 ? 1.1 : 1;
      currentUtterance = utterance;
      currentLevel = level;
      utterance.addEventListener('end', () => {
        if (currentUtterance === utterance) { currentUtterance = null; currentLevel = 0; }
      });
      utterance.addEventListener('error', () => {
        if (currentUtterance === utterance) { currentUtterance = null; currentLevel = 0; beep(level); }
      });
      window.speechSynthesis.speak(utterance);
    } else beep(level);
  }

  languageSelect.value = localStorage.getItem('safeboat.voice.language') || 'sr-RS';
  if (!phrases[languageSelect.value]) languageSelect.value = 'sr-RS';
  languageSelect.addEventListener('change', () => localStorage.setItem('safeboat.voice.language', languageSelect.value));
  toggle.addEventListener('click', () => {
    enabled = !enabled; localStorage.setItem('safeboat.voice.enabled', String(enabled));
    if (!enabled && speechAvailable) { currentUtterance = null; window.speechSynthesis.cancel(); }
    currentLevel = 0; updateToggle();
  });
  window.addEventListener('safeboat:safety-alert', announce);
  window.SafeBoatVoice = { announce, isSupported: speechAvailable };
  updateToggle();
}());
