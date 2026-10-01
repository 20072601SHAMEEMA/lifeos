import { get, run, now } from '../db.js';

export const toUser = (r) =>
  r && {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone || '',
    photo: r.photo || null,
    createdAt: r.created_at,
  };

export const toContact = (r) =>
  r && {
    id: r.id,
    name: r.name,
    relationship: r.relationship,
    phone: r.phone,
    email: r.email || '',
    priority: r.priority,
    isPrimary: Boolean(r.is_primary),
    createdAt: r.created_at,
  };

export const toJourney = (r) => {
  if (!r) return null;
  const contact = r.contact_id ? get('SELECT * FROM contacts WHERE id = ?', r.contact_id) : null;
  return {
    id: r.id,
    start: { label: r.start_label, lat: r.start_lat, lng: r.start_lng },
    destination: { label: r.dest_label, lat: r.dest_lat, lng: r.dest_lng },
    lastLocation: r.last_lat != null ? { lat: r.last_lat, lng: r.last_lng } : null,
    contact: toContact(contact),
    startedAt: r.started_at,
    expectedArrival: r.expected_arrival,
    status: r.status,
    checkins: r.checkins,
    lastCheckinAt: r.last_checkin_at,
    endedAt: r.ended_at,
  };
};

export const toSos = (r) =>
  r && {
    id: r.id,
    status: r.status,
    location: r.lat != null ? { lat: r.lat, lng: r.lng, accuracy: r.accuracy } : null,
    contacts: JSON.parse(r.contacts || '[]'),
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    simulated: true,
  };

export const toHistory = (r) =>
  r && {
    id: r.id,
    type: r.type,
    title: r.title,
    detail: r.detail || '',
    location: r.lat != null ? { lat: r.lat, lng: r.lng } : null,
    createdAt: r.created_at,
  };

export function logEvent(userId, type, title, detail = null, lat = null, lng = null, at = now()) {
  run(
    'INSERT INTO safety_history (user_id, type, title, detail, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId, type, title, detail, lat, lng, at,
  );
}
