import { Router } from 'express';
import { get, all, run, now } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toJourney, logEvent } from '../utils/serializers.js';
import { badRequest, notFound, HttpError, str, lat, lng, isoDate, num } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

const MAX_JOURNEY_MS = 24 * 60 * 60 * 1000;

const owned = (userId, id) => {
  const row = get('SELECT * FROM journeys WHERE id = ? AND user_id = ?', Number(id), userId);
  if (!row) throw notFound('Journey not found.');
  return row;
};

router.get('/', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const rows = all('SELECT * FROM journeys WHERE user_id = ? ORDER BY started_at DESC LIMIT ?', req.userId, limit);
  res.json({ journeys: rows.map(toJourney) });
});

router.get('/active', (req, res) => {
  const row = get("SELECT * FROM journeys WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1", req.userId);
  res.json({ journey: toJourney(row) });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const startLabel = str(b.start?.label, 120);
  const destLabel = str(b.destination?.label, 120);
  const expected = isoDate(b.expectedArrival);
  const contactId = b.contactId ? Number(b.contactId) : null;

  const errors = {};
  if (!startLabel) errors.start = 'Starting location is required.';
  if (!destLabel) errors.destination = 'Destination is required.';
  if (startLabel && destLabel && startLabel.toLowerCase() === destLabel.toLowerCase()) errors.destination = 'Destination must be different from the start.';
  if (!expected) errors.expectedArrival = 'Expected arrival time is required.';
  else {
    const diff = new Date(expected).getTime() - Date.now();
    if (diff < 60_000) errors.expectedArrival = 'Expected arrival must be in the future.';
    else if (diff > MAX_JOURNEY_MS) errors.expectedArrival = 'Journeys can be at most 24 hours long.';
  }
  if (contactId && !get('SELECT id FROM contacts WHERE id = ? AND user_id = ?', contactId, req.userId)) {
    errors.contactId = 'Please choose one of your saved contacts.';
  }
  if (Object.keys(errors).length) throw badRequest('Please check your journey details.', errors);

  if (get("SELECT id FROM journeys WHERE user_id = ? AND status = 'active'", req.userId)) {
    throw new HttpError(409, 'You already have an active journey. End it before starting a new one.');
  }

  const startedAt = now();
  const r = run(
    `INSERT INTO journeys (user_id, start_label, dest_label, start_lat, start_lng, dest_lat, dest_lng, last_lat, last_lng,
       contact_id, started_at, expected_arrival, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    req.userId, startLabel, destLabel,
    lat(b.start?.lat), lng(b.start?.lng), lat(b.destination?.lat), lng(b.destination?.lng),
    lat(b.start?.lat), lng(b.start?.lng),
    contactId, startedAt, expected,
  );
  logEvent(req.userId, 'journey_start', 'Journey started', `${startLabel} → ${destLabel}`, lat(b.start?.lat), lng(b.start?.lng), startedAt);
  res.status(201).json({ journey: toJourney(owned(req.userId, r.lastInsertRowid)) });
});

/**
 * Journey actions:
 *  checkin  – "I'm safe" during the journey
 *  complete – arrived safely, ends the journey
 *  cancel   – ends the journey without arrival
 *  extend   – push expected arrival by N minutes
 *  location – update the last known position
 */
router.put('/:id', (req, res) => {
  const j = owned(req.userId, req.params.id);
  const { action } = req.body || {};
  const pLat = lat(req.body?.lat);
  const pLng = lng(req.body?.lng);
  const ts = now();

  if (j.status !== 'active') throw badRequest('This journey has already ended.');

  if (pLat !== null && pLng !== null) {
    run('UPDATE journeys SET last_lat = ?, last_lng = ? WHERE id = ?', pLat, pLng, j.id);
  }

  switch (action) {
    case 'checkin':
      run('UPDATE journeys SET checkins = checkins + 1, last_checkin_at = ? WHERE id = ?', ts, j.id);
      logEvent(req.userId, 'checkin', 'Safety check-in completed', `During journey to ${j.dest_label}`, pLat, pLng, ts);
      break;
    case 'complete':
      run("UPDATE journeys SET status = 'completed', ended_at = ? WHERE id = ?", ts, j.id);
      logEvent(req.userId, 'arrived', 'Arrived safely', `${j.start_label} → ${j.dest_label}`, pLat, pLng, ts);
      break;
    case 'cancel':
      run("UPDATE journeys SET status = 'cancelled', ended_at = ? WHERE id = ?", ts, j.id);
      logEvent(req.userId, 'journey_cancel', 'Journey ended early', `${j.start_label} → ${j.dest_label}`, pLat, pLng, ts);
      break;
    case 'extend': {
      const minutes = num(req.body.minutes);
      if (!minutes || minutes < 1 || minutes > 240) throw badRequest('Extend by 1–240 minutes.');
      const base = Math.max(new Date(j.expected_arrival).getTime(), Date.now());
      const next = new Date(base + minutes * 60_000).toISOString();
      run('UPDATE journeys SET expected_arrival = ? WHERE id = ?', next, j.id);
      logEvent(req.userId, 'journey_extend', 'Arrival time extended', `+${minutes} min for ${j.dest_label}`, pLat, pLng, ts);
      break;
    }
    case 'location':
      break;
    default:
      throw badRequest('Unknown journey action.');
  }
  res.json({ journey: toJourney(owned(req.userId, j.id)) });
});

export default router;
