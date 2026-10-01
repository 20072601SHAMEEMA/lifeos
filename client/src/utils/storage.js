/**
 * Thin, failure-safe wrapper around localStorage.
 * Private browsing or blocked storage never crashes the app — reads fall back, writes are skipped.
 */
const PREFIX = 'lifeos.';

export const KEYS = {
  token: 'token',
  user: 'user',
  theme: 'theme',
  settings: 'settings',
  lastLocation: 'lastLocation',
  journeyDraft: 'journeyDraft',
};

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable — ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
  clearSession() {
    [KEYS.token, KEYS.user, KEYS.settings, KEYS.lastLocation, KEYS.journeyDraft].forEach((k) => this.remove(k));
  },
};
