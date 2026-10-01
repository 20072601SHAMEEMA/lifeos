import { buildMockServices } from '../data/mockServices.js';
import { distanceMeters } from '../utils/format.js';

/**
 * Nearby emergency services.
 *   live → OpenStreetMap Overpass API (free, no key, real data)
 *   demo → src/data/mockServices.js (fictional, clearly labelled)
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const TYPE_BY_AMENITY = {
  hospital: 'hospital',
  clinic: 'hospital',
  police: 'police',
  fire_station: 'fire',
  pharmacy: 'pharmacy',
};

function buildQuery({ lat, lng }, radius) {
  return `[out:json][timeout:20];
(
  nwr["amenity"="hospital"](around:${radius},${lat},${lng});
  nwr["amenity"="police"](around:${radius},${lat},${lng});
  nwr["amenity"="fire_station"](around:${radius},${lat},${lng});
  nwr["amenity"="pharmacy"](around:${Math.min(radius, 3000)},${lat},${lng});
);
out center tags 120;`;
}

function address(tags) {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:suburb'] || tags['addr:neighbourhood'],
    tags['addr:city'],
  ].filter(Boolean);
  return parts.join(', ') || tags['addr:full'] || 'Address not listed';
}

const withDistance = (list, origin) =>
  list
    .map((s) => ({ ...s, distance: distanceMeters(origin, s) }))
    .sort((a, b) => a.distance - b.distance);

export async function fetchLiveServices(origin, { radius = 5000, signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  signal?.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(buildQuery(origin, radius))}`,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
    const data = await res.json();
    const items = data.elements
      .map((el) => {
        const tags = el.tags || {};
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        const type = TYPE_BY_AMENITY[tags.amenity];
        if (!type || lat == null) return null;
        return {
          id: `${el.type}-${el.id}`,
          name: tags.name || tags['name:en'] || `Unnamed ${type === 'fire' ? 'fire station' : type}`,
          type,
          lat,
          lng,
          address: address(tags),
          phone: tags.phone || tags['contact:phone'] || null,
          source: 'live',
        };
      })
      .filter(Boolean);
    return withDistance(items, origin);
  } finally {
    clearTimeout(timer);
  }
}

export function getDemoServices(origin) {
  return withDistance(buildMockServices(origin), origin);
}
