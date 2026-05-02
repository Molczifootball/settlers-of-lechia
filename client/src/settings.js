// Persisted user preferences. Read once on app start; language change reloads.
import { useState, useEffect } from 'react';
const KEY = 'lechia_settings';
const listeners = new Set();

const DEFAULTS = {
  lang: 'pl',          // 'pl' | 'en'
  sound: true,
  animations: true,
  colorblind: false,
  viewMode: 'iso',     // 'flat' | 'iso'
};

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach(fn => fn(next));
  return next;
}

// Subscribe to setting changes; returns unsubscribe fn.
export function subscribeSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// React hook that returns current settings and re-renders on change.
export function useSettings() {
  const [s, setS] = useState(loadSettings);
  useEffect(() => subscribeSettings(setS), []);
  return s;
}

// Apply settings that are read by CSS (animations off / colorblind palette).
export function applySettingsToDOM() {
  const s = loadSettings();
  document.body.classList.toggle('no-anim', !s.animations);
  document.body.classList.toggle('colorblind', !!s.colorblind);
}

