import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { get, run, transaction } from './db.js';
import { ensureCard } from './routes/card.js';
import { DEFAULT_SETTINGS } from './routes/settings.js';

export const DEMO_EMAIL = 'demo@lifeos.app';
export const DEMO_PASSWORD = 'demo1234';

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

/** Creates a realistic demo account so the dashboard looks alive during a presentation. */
export function seedDemo({ reset = false } = {}) {
  const existing = get('SELECT id FROM users WHERE email = ?', DEMO_EMAIL);
  if (existing && !reset) return false;

  transaction(() => {
    if (existing) run('DELETE FROM users WHERE id = ?', existing.id);

    const userId = Number(
      run(
        'INSERT INTO users (name, email, password_hash, phone, created_at) VALUES (?, ?, ?, ?, ?)',
        'Tejaswi', DEMO_EMAIL, bcrypt.hashSync(DEMO_PASSWORD, 10), '+91 98765 43210', ago(60 * 24 * 21),
      ).lastInsertRowid,
    );

    const contacts = [
      ['Mother', 'Mother', '+91 98450 11223', 'mom@example.com', 'high', 1],
      ['Arjun', 'Brother', '+91 99001 44556', 'arjun@example.com', 'high', 0],
      ['Priya', 'Best friend', '+91 97412 77889', '', 'medium', 0],
    ];
    for (const [name, rel, phone, email, priority, primary] of contacts) {
      run(
        'INSERT INTO contacts (user_id, name, relationship, phone, email, priority, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        userId, name, rel, phone, email || null, priority, primary, ago(60 * 24 * 20),
      );
    }
    const mother = get('SELECT id FROM contacts WHERE user_id = ? AND is_primary = 1', userId);

    // Past journeys (Bengaluru coordinates) so history and stats have content.
    const journeys = [
      ['Home', 'University', 12.9716, 77.5946, 12.9352, 77.6245, 60 * 24 * 6, 35],
      ['University', 'City Library', 12.9352, 77.6245, 12.9762, 77.6033, 60 * 24 * 3, 25],
      ['Home', 'Indiranagar Café', 12.9716, 77.5946, 12.9784, 77.6408, 60 * 24 * 1 + 180, 30],
      ['Office', 'Home', 12.9698, 77.75, 12.9716, 77.5946, 200, 40],
    ];
    for (const [from, to, sLat, sLng, dLat, dLng, startedAgo, duration] of journeys) {
      const started = ago(startedAgo);
      const ended = ago(startedAgo - duration);
      run(
        `INSERT INTO journeys (user_id, start_label, dest_label, start_lat, start_lng, dest_lat, dest_lng, contact_id,
           started_at, expected_arrival, status, checkins, last_checkin_at, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 1, ?, ?)`,
        userId, from, to, sLat, sLng, dLat, dLng, mother.id, started, ended, ended, ended,
      );
      const log = (type, title, detail, at) =>
        run('INSERT INTO safety_history (user_id, type, title, detail, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', userId, type, title, detail, null, null, at);
      log('journey_start', 'Journey started', `${from} → ${to}`, started);
      log('checkin', 'Safety check-in completed', `During journey to ${to}`, ago(startedAgo - Math.round(duration / 2)));
      log('arrived', 'Arrived safely', `${from} → ${to}`, ended);
    }
    run(
      'INSERT INTO safety_history (user_id, type, title, detail, created_at) VALUES (?, ?, ?, ?, ?)',
      userId, 'location_shared', 'Location shared', 'Shared live location link with Mother', ago(95),
    );
    run(
      'INSERT INTO safety_history (user_id, type, title, detail, created_at) VALUES (?, ?, ?, ?, ?)',
      userId, 'checkin', 'Safety check-in completed', 'Daily check-in', ago(20),
    );

    ensureCard(userId);
    run(
      `UPDATE emergency_cards SET sharing_enabled = 1, blood_group = 'B+', allergies = 'Penicillin', conditions = 'Mild asthma',
         medications = 'Salbutamol inhaler', notes = 'Inhaler is in the front pocket of my bag.', emergency_phone = '112', visibility = ?
       WHERE user_id = ?`,
      JSON.stringify({ photo: true, bloodGroup: true, allergies: true, conditions: false, medications: false, notes: false, emergencyContact: true, emergencyPhone: true }),
      userId,
    );
    run('INSERT INTO settings (user_id, data, updated_at) VALUES (?, ?, ?)', userId, JSON.stringify(DEFAULT_SETTINGS), ago(0));
  });
  return true;
}

// `npm run seed` resets the demo account.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemo({ reset: process.argv.includes('--reset') });
  console.log(`Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}
