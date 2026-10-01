import { Router } from 'express';
import { get, all, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toHistory, logEvent } from '../utils/serializers.js';
import { badRequest, isoDate, lat, lng, str } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

// Event types the client is allowed to log directly. Others are created by the server.
const CLIENT_TYPES = {
  checkin: 'Safety check-in completed',
  location_shared: 'Location shared',
  contacts_alerted: 'Emergency contacts alerted',
  call: 'Emergency call started',
};

router.get('/', (req, res) => {
  const from = isoDate(req.query.from) || '0000';
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
  const events = all(
    'SELECT * FROM safety_history WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?',
    req.userId, from, limit,
  ).map(toHistory);

  const count = (sql, ...p) => get(sql, ...p).n;
  const stats = {
    checkins: count("SELECT COUNT(*) AS n FROM safety_history WHERE user_id = ? AND type = 'checkin' AND created_at >= ?", req.userId, from),
    journeysCompleted: count("SELECT COUNT(*) AS n FROM journeys WHERE user_id = ? AND status = 'completed' AND ended_at >= ?", req.userId, from),
    activeEmergencies: count("SELECT COUNT(*) AS n FROM sos_events WHERE user_id = ? AND status = 'active'", req.userId),
    totalEvents: events.length,
  };
  res.json({ events, stats });
});

router.post('/', (req, res) => {
  const type = str(req.body?.type, 30);
  if (!CLIENT_TYPES[type]) throw badRequest('Unsupported history event type.');
  const title = str(req.body.title, 120) || CLIENT_TYPES[type];
  logEvent(req.userId, type, title, str(req.body.detail, 300) || null, lat(req.body.lat), lng(req.body.lng));
  const row = get('SELECT * FROM safety_history WHERE user_id = ? ORDER BY id DESC LIMIT 1', req.userId);
  res.status(201).json({ event: toHistory(row) });
});

router.delete('/', (req, res) => {
  run('DELETE FROM safety_history WHERE user_id = ?', req.userId);
  res.json({ ok: true });
});

export default router;
