import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentPosition, getPermissionState, isGeolocationSupported, reverseGeocode } from '../services/locationService.js';
import { storage, KEYS } from '../utils/storage.js';
import { useSettings } from './SettingsContext.jsx';
import { useAuth } from './AuthContext.jsx';

/**
 * Shares one "current location" across the dashboard, SOS, journey and nearby pages.
 * Location is requested on demand. It is fetched automatically only when the browser
 * permission is already granted or the user enabled "auto-locate" in Settings.
 */
const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const [position, setPosition] = useState(() => storage.get(KEYS.lastLocation));
  const [address, setAddress] = useState(null);
  const [status, setStatus] = useState(isGeolocationSupported() ? 'idle' : 'unsupported');
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('unknown');
  const inflight = useRef(null);

  const locate = useCallback(async () => {
    if (inflight.current) return inflight.current;
    setStatus('loading');
    setError(null);
    const job = (async () => {
      try {
        const pos = await getCurrentPosition();
        setPosition(pos);
        setStatus('success');
        setPermission('granted');
        storage.set(KEYS.lastLocation, pos);
        reverseGeocode(pos).then(setAddress);
        return pos;
      } catch (err) {
        setStatus('error');
        setError(err.message);
        if (err.code === 'denied') setPermission('denied');
        return null;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = job;
    return job;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    getPermissionState().then((state) => {
      setPermission(state);
      if (state === 'granted' || settings.autoLocate) locate();
    });
  }, [isAuthenticated, settings.autoLocate, locate]);

  useEffect(() => {
    if (position && !address) reverseGeocode(position).then(setAddress);
  }, [position, address]);

  const value = useMemo(
    () => ({ position, address, status, error, permission, locate, setPosition }),
    [position, address, status, error, permission, locate],
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useUserLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useUserLocation must be used inside LocationProvider');
  return ctx;
}
