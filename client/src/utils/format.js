export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) : '—';

export const formatDateTime = (iso) => (iso ? `${formatDate(iso)}, ${formatTime(iso)}` : '—');

export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
}

export function relativeTime(iso, now = Date.now()) {
  if (!iso) return '';
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return `${Math.round(diff / 86400)} d ago`;
}

/** "18 min", "1 h 5 min", "45 s" */
export function formatDuration(ms) {
  const abs = Math.abs(ms);
  const totalMin = Math.floor(abs / 60_000);
  if (totalMin < 1) return `${Math.max(0, Math.floor(abs / 1000))} s`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || '?';
}

const toRad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceMeters(a, b) {
  if (!a || !b) return null;
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m) {
  if (m == null) return '—';
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

export const formatCoord = (n) => (typeof n === 'number' ? n.toFixed(5) : '—');

export const telHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
export const smsHref = (phone, body) => `sms:${String(phone || '').replace(/[^\d+]/g, '')}?body=${encodeURIComponent(body)}`;
export const mapsLink = ({ lat, lng }) => `https://www.google.com/maps?q=${lat},${lng}`;
export const directionsLink = ({ lat, lng }) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Converts "HH:MM" from a time input to the next occurrence of that time (today or tomorrow). */
export function nextOccurrence(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

export function timeInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
