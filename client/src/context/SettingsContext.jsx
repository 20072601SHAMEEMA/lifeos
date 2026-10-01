import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { settingsService } from '../services/index.js';
import { storage, KEYS } from '../utils/storage.js';
import { useAuth } from './AuthContext.jsx';

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  notifications: true,
  checkinReminders: true,
  countdownSeconds: 5,
  shareLocationOnSos: true,
  autoLocate: false,
  alertMode: 'primary',
  emergencyNumber: '112',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...storage.get(KEYS.settings, {}),
    theme: storage.get(KEYS.theme, 'dark'),
  }));

  // Apply theme to <html> and remember it locally so the first paint is correct.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'light' ? '#f3f6fc' : '#070b14');
    storage.set(KEYS.theme, settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    if (!isAuthenticated) return;
    settingsService
      .get()
      .then((s) => {
        setSettings(s);
        storage.set(KEYS.settings, s);
      })
      .catch(() => {
        /* keep cached settings when offline */
      });
  }, [isAuthenticated]);

  /** Optimistic update; rolls back if the server rejects it. */
  const update = useCallback(
    async (patch) => {
      const previous = settings;
      const next = { ...settings, ...patch };
      setSettings(next);
      storage.set(KEYS.settings, next);
      if (!isAuthenticated) return next;
      try {
        const saved = await settingsService.update(patch);
        setSettings(saved);
        storage.set(KEYS.settings, saved);
        return saved;
      } catch (err) {
        setSettings(previous);
        storage.set(KEYS.settings, previous);
        throw err;
      }
    },
    [settings, isAuthenticated],
  );

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
