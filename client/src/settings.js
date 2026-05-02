// Persisted user preferences. Read once on app start; language change reloads.
const KEY = 'lechia_settings';

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
  return next;
}

// Apply settings that are read by CSS (animations off / colorblind palette).
export function applySettingsToDOM() {
  const s = loadSettings();
  document.body.classList.toggle('no-anim', !s.animations);
  document.body.classList.toggle('colorblind', !!s.colorblind);
}

