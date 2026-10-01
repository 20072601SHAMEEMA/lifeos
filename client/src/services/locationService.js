/**
 * Browser Geolocation + OpenStreetMap Nominatim geocoding.
 * Location is only read when the user asks (or has already granted permission) — never tracked in the background.
 */

export class LocationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const MESSAGES = {
  unsupported: 'Your browser does not support location services.',
  denied: 'Location permission was denied. You can enable it in your browser’s site settings.',
  unavailable: 'Your location could not be determined right now. Try again in the open or check your device’s location setting.',
  timeout: 'Getting your location took too long. Please try again.',
  insecure: 'Location needs a secure connection (https or localhost).',
};

export const isGeolocationSupported = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

export async function getPermissionState() {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'unknown';
  }
}

export function getCurrentPosition({ timeout = 15000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) return reject(new LocationError('unsupported', MESSAGES.unsupported));
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return reject(new LocationError('insecure', MESSAGES.insecure));
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
          timestamp: new Date(p.timestamp).toISOString(),
        }),
      (err) => {
        const code = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable';
        reject(new LocationError(code, MESSAGES[code]));
      },
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 30_000 },
    );
  });
}

/** Live position updates. Returns a function that stops watching. */
export function watchPosition(onChange, onError) {
  if (!isGeolocationSupported()) {
    onError?.(new LocationError('unsupported', MESSAGES.unsupported));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onChange({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
    (err) => {
      const code = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable';
      onError?.(new LocationError(code, MESSAGES[code]));
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const cache = new Map();

/** Best-effort human readable address. Resolves to null instead of throwing. */
export async function reverseGeocode({ lat, lng }) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const short = [a.road || a.neighbourhood || a.suburb, a.city || a.town || a.village || a.county].filter(Boolean).join(', ');
    const result = { short: short || data.display_name?.split(',').slice(0, 2).join(','), full: data.display_name || '' };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

/** Place search for journey destinations. Resolves to [] on failure. */
export async function searchPlaces(query, near) {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    let url = `${NOMINATIM}/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
    if (near) {
      const d = 0.5; // ~50 km bias box
      url += `&viewbox=${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`;
    }
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((p) => ({
      id: p.place_id,
      label: p.name || p.display_name.split(',')[0],
      address: p.display_name,
      lat: Number(p.lat),
      lng: Number(p.lon),
    }));
  } catch {
    return [];
  }
}
