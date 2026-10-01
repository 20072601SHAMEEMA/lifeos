import { Router } from 'express';
import { get, run, now } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, isPhone } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  notifications: true,
  checkinReminders: true,
  countdownSeconds: 5,
  shareLocationOnSos: true,
  autoLocate: false,
  alertMode: 'primary', // 'primary' | 'all'
  emergencyNumber: '112',
};

const SCHEMA = {
  theme: (v) => ['dark', 'light'].includes(v),
  notifications: (v) => typeof v === 'boolean',
  checkinReminders: (v) => typeof v === 'boolean',
  countdownSeconds: (v) => [3, 5, 10].includes(v),
  shareLocationOnSos: (v) => typeof v === 'boolean',
  autoLocate: (v) => typeof v === 'boolean',
  alertMode: (v) => ['primary', 'all'].includes(v),
  emergencyNumber: (v) => typeof v === 'string' && isPhone(v),
};

export function readSettings(userId) {
  const row = get('SELECT data FROM settings WHERE user_id = ?', userId);
  return { ...DEFAULT_SETTINGS, ...(row ? JSON.parse(row.data) : {}) };
}

router.get('/', (req, res) => {
  res.json({ settings: readSettings(req.userId) });
});

router.put('/', (req, res) => {
  const next = readSettings(req.userId);
  for (const [key, value] of Object.entries(req.body || {})) {
    if (!SCHEMA[key]) continue;
    if (!SCHEMA[key](value)) throw badRequest(`Invalid value for "${key}".`);
    next[key] = value;
  }
  run(
    `INSERT INTO settings (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    req.userId, JSON.stringify(next), now(),
  );
  res.json({ settings: next });
});

export default router;
