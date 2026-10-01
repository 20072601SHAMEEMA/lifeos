/**
 * DEMO DATA — clearly fictional emergency services, placed around the user's position.
 * Used only when live OpenStreetMap data is unavailable or when the user switches to demo mode.
 */
const TEMPLATES = [
  { type: 'hospital', name: 'City General Hospital (Demo)', phone: '+91 80 4000 1000', dLat: 0.012, dLng: 0.008, street: 'Hospital Road' },
  { type: 'hospital', name: 'Sunrise Multispeciality Clinic (Demo)', phone: '+91 80 4000 2000', dLat: -0.018, dLng: 0.015, street: 'Lake View Avenue' },
  { type: 'hospital', name: 'St. Mary’s Medical Centre (Demo)', phone: '+91 80 4000 3000', dLat: 0.025, dLng: -0.02, street: 'Church Street' },
  { type: 'police', name: 'Central Police Station (Demo)', phone: '100', dLat: -0.006, dLng: -0.01, street: 'MG Road' },
  { type: 'police', name: 'North Division Police Post (Demo)', phone: '100', dLat: 0.02, dLng: 0.004, street: 'Station Road' },
  { type: 'fire', name: 'Fire & Rescue Station No. 4 (Demo)', phone: '101', dLat: 0.009, dLng: -0.017, street: 'Ring Road' },
  { type: 'fire', name: 'East Fire Station (Demo)', phone: '101', dLat: -0.021, dLng: 0.024, street: 'Industrial Layout' },
  { type: 'pharmacy', name: '24×7 Care Pharmacy (Demo)', phone: '+91 80 4100 1111', dLat: 0.003, dLng: 0.004, street: 'Market Street' },
  { type: 'pharmacy', name: 'HealthPlus Medicals (Demo)', phone: '+91 80 4100 2222', dLat: -0.004, dLng: 0.007, street: '5th Cross Road' },
  { type: 'pharmacy', name: 'GreenLeaf Chemist (Demo)', phone: '+91 80 4100 3333', dLat: 0.007, dLng: -0.005, street: 'Park Lane' },
];

/** Used when the user has not shared a location (Bengaluru city centre). */
export const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

export function buildMockServices(center = DEFAULT_CENTER) {
  return TEMPLATES.map((t, i) => ({
    id: `demo-${i}`,
    name: t.name,
    type: t.type,
    lat: center.lat + t.dLat,
    lng: center.lng + t.dLng,
    address: `${10 + i * 7}, ${t.street}`,
    phone: t.phone,
    source: 'demo',
  }));
}
