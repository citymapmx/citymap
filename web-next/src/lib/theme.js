import { getT, CITY_TZ } from './constants.js';

export function readThemeMode(storage) {
  try {
    const mode = storage.getItem('cg_theme_mode');
    if (['auto', 'light', 'dark'].includes(mode)) return mode;
    const legacy = storage.getItem('cg_dark');
    return legacy === 'true' ? 'dark' : legacy === 'false' ? 'light' : 'auto';
  } catch { return 'auto'; }
}

export function readThemePreference(storage) {
  const mode = readThemeMode(storage);
  return mode === 'auto' ? null : mode === 'dark';
}

export function isScheduledDark(now = new Date(), timeZone) {
  let hour;
  try {
    hour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  } catch { hour = now.getHours(); }
  return hour < 7 || hour >= 19;
}

export function resolveTheme(storage, now = new Date(), timeZone) {
  return readThemePreference(storage) ?? isScheduledDark(now, timeZone);
}

export function applyTheme(dark) {
  if (typeof document === 'undefined') return;
  const T = getT(dark);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
  for (const [name, value] of Object.entries({ '--bg': T.bg, '--text': T.sub, '--text-h': T.text, '--border': T.border, '--code-bg': T.card })) {
    root.style.setProperty(name, value);
  }
  if (document.body) document.body.style.backgroundColor = T.bg;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', T.bg);
}

export function saveThemeMode(mode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('cg_theme_mode', mode);
    if (mode === 'auto') window.localStorage.removeItem('cg_dark');
    else window.localStorage.setItem('cg_dark', String(mode === 'dark'));
  } catch { /* Keep the session usable when storage is blocked. */ }
}

export function saveThemePreference(dark) {
  saveThemeMode(dark ? 'dark' : 'light');
  applyTheme(dark);
}

export function initializeTheme(store) {
  if (typeof window === 'undefined') return () => {};
  let storage;
  try { storage = window.localStorage; } catch { storage = { getItem: () => null }; }
  const applyCurrent = () => {
    const state = store.getState();
    const dark = state.themeMode === 'auto'
      ? isScheduledDark(new Date(), CITY_TZ[state.activeCity])
      : state.themeMode === 'dark';
    if (state.dark !== dark) store.setState({ dark });
    applyTheme(dark);
  };
  const syncStorage = () => {
    store.setState({ themeMode: readThemeMode(storage) });
    applyCurrent();
  };
  syncStorage();
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.themeMode !== previous.themeMode || state.activeCity !== previous.activeCity) applyCurrent();
    else if (state.dark !== previous.dark) applyTheme(state.dark);
  });
  const onStorage = event => {
    if (event.key === 'cg_theme_mode' || event.key === 'cg_dark' || event.key === null) syncStorage();
  };
  const onResume = () => { if (document.visibilityState !== 'hidden') applyCurrent(); };
  // Check the clock while open, and immediately after returning to a suspended tab.
  const timer = setInterval(applyCurrent, 60000);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', onResume);
  document.addEventListener('visibilitychange', onResume);
  return () => {
    clearInterval(timer);
    unsubscribe();
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', onResume);
    document.removeEventListener('visibilitychange', onResume);
  };
}
