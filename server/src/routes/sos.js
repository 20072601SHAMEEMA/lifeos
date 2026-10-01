import { Router } from 'express';
import { get, all, run, now } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toSos, logEvent } from '../utils/serializers.js';
import { badRequest, notFound, lat, lng, num } from '../utils/validate.js';

/**
 * SOS events are recorded in the database, but this project does NOT contact
 * emergency services or send messages automatically. Every SOS is "simulated: true".
 */
const router = Router();
router.use(requireAuth);

const active = (userId) => get("SELECT * FROM sos_events WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1", userId);

router.get('/', (req, res) => {
  res.json({ events: all('SELECT * FROM sos_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', req.userId).map(toSos) });
});

router.get('/active', (req, res) => {
  res.json({ sos: toSos(active(req.userId)) });
});

router.post('/', (req, res) => {
  const existing = active(req.userId);
  if (existing) return res.json({ sos: toSos(existing) });

  const b = req.body || {};
  const pLat = lat(b.lat);
  const pLng = lng(b.lng);
  const contacts = all(
    `SELECT name, relationship, phone, is_primary FROM contacts WHERE user_id = ?
     ORDER BY is_primary DESC, CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`,
    req.userId,
  ).map((c) => ({ name: c.name, relationship: c.relationship, phone: c.phone, isPrimary: Boolean(c.is_primary) }));

  const ts = now();
  const r = run(
    'INSERT INTO sos_events (user_id, status, lat, lng, accuracy, contacts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    req.userId, 'active', pLat, pLng, num(b.accuracy), JSON.stringify(contacts), ts,
  );
  logEvent(req.userId, 'sos', 'SOS activated (simulation)', 'Emergency mode was activated. No services were contacted automatically.', pLat, pLng, ts);
  res.status(201).json({ sos: toSos(get('SELECT * FROM sos_events WHERE id = ?', r.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const row = get('SELECT * FROM sos_events WHERE id = ? AND user_id = ?', Number(req.params.id), req.userId);
  if (!row) throw notFound('SOS event not found.');
  const { action } = req.body || {};
  if (!['resolve', 'cancel'].includes(action)) throw badRequest('Unknown SOS action.');
  if (row.status !== 'active') return res.json({ sos: toSos(row) });

  const status = action === 'resolve' ? 'resolved' : 'cancelled';
  const ts = now();
  run('UPDATE sos_events SET status = ?, resolved_at = ? WHERE id = ?', status, ts, row.id);
  logEvent(
    req.userId,
    'sos_resolved',
    action === 'resolve' ? 'Marked safe after SOS' : 'SOS cancelled',
    action === 'resolve' ? 'You confirmed you are safe.' : 'Emergency mode was cancelled.',
    null, null, ts,
  );
  res.json({ sos: toSos(get('SELECT * FROM sos_events WHERE id = ?', row.id)) });
});

export default router;
