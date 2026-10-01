import { Router } from 'express';
import crypto from 'node:crypto';
import { get, run, now } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toContact } from '../utils/serializers.js';
import { badRequest, notFound, isPhone, optStr } from '../utils/validate.js';

const router = Router();

/** Sensitive fields are hidden by default; the user opts in to each one. */
export const DEFAULT_VISIBILITY = {
  photo: false,
  bloodGroup: false,
  allergies: false,
  conditions: false,
  medications: false,
  notes: false,
  emergencyContact: true,
  emergencyPhone: true,
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const newShareId = () => crypto.randomBytes(9).toString('base64url');

export function ensureCard(userId) {
  let row = get('SELECT * FROM emergency_cards WHERE user_id = ?', userId);
  if (!row) {
    run(
      'INSERT INTO emergency_cards (user_id, share_id, visibility, updated_at) VALUES (?, ?, ?, ?)',
      userId, newShareId(), JSON.stringify(DEFAULT_VISIBILITY), now(),
    );
    row = get('SELECT * FROM emergency_cards WHERE user_id = ?', userId);
  }
  return row;
}

const toCard = (r) => ({
  shareId: r.share_id,
  sharingEnabled: Boolean(r.sharing_enabled),
  bloodGroup: r.blood_group || '',
  allergies: r.allergies || '',
  conditions: r.conditions || '',
  medications: r.medications || '',
  notes: r.notes || '',
  emergencyPhone: r.emergency_phone || '',
  visibility: { ...DEFAULT_VISIBILITY, ...JSON.parse(r.visibility || '{}') },
  updatedAt: r.updated_at,
});

const primaryContact = (userId) =>
  get('SELECT * FROM contacts WHERE user_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1', userId);

// Public, unauthenticated view used by the QR code. Only fields the owner made visible are returned.
router.get('/public/:shareId', (req, res) => {
  const card = get('SELECT * FROM emergency_cards WHERE share_id = ?', String(req.params.shareId));
  if (!card || !card.sharing_enabled) throw notFound('This emergency card is not available or sharing has been turned off.');

  const user = get('SELECT name, photo FROM users WHERE id = ?', card.user_id);
  const c = toCard(card);
  const v = c.visibility;
  const contact = v.emergencyContact ? toContact(primaryContact(card.user_id)) : null;

  res.json({
    name: user.name,
    photo: v.photo ? user.photo : null,
    bloodGroup: v.bloodGroup ? c.bloodGroup : null,
    allergies: v.allergies ? c.allergies : null,
    conditions: v.conditions ? c.conditions : null,
    medications: v.medications ? c.medications : null,
    notes: v.notes ? c.notes : null,
    emergencyPhone: v.emergencyPhone ? c.emergencyPhone : null,
    emergencyContact: contact && { name: contact.name, relationship: contact.relationship, phone: contact.phone },
    updatedAt: c.updatedAt,
  });
});

router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ card: toCard(ensureCard(req.userId)) });
});

router.put('/', (req, res) => {
  const current = toCard(ensureCard(req.userId));
  const b = req.body || {};

  const bloodGroup = b.bloodGroup === undefined ? current.bloodGroup : optStr(b.bloodGroup, 4);
  if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) throw badRequest('Please choose a valid blood group.', { bloodGroup: 'Invalid blood group.' });

  const emergencyPhone = b.emergencyPhone === undefined ? current.emergencyPhone : optStr(b.emergencyPhone, 25);
  if (emergencyPhone && !isPhone(emergencyPhone)) throw badRequest('Please enter a valid emergency phone number.', { emergencyPhone: 'Invalid phone number.' });

  const visibility = { ...current.visibility };
  if (b.visibility && typeof b.visibility === 'object') {
    for (const key of Object.keys(DEFAULT_VISIBILITY)) {
      if (key in b.visibility) visibility[key] = Boolean(b.visibility[key]);
    }
  }

  const pick = (key, max) => (b[key] === undefined ? current[key] || null : optStr(b[key], max));

  run(
    `UPDATE emergency_cards SET sharing_enabled = ?, blood_group = ?, allergies = ?, conditions = ?, medications = ?,
       notes = ?, emergency_phone = ?, visibility = ?, updated_at = ? WHERE user_id = ?`,
    b.sharingEnabled === undefined ? current.sharingEnabled : Boolean(b.sharingEnabled),
    bloodGroup || null,
    pick('allergies', 300),
    pick('conditions', 300),
    pick('medications', 300),
    pick('notes', 500),
    emergencyPhone || null,
    JSON.stringify(visibility),
    now(),
    req.userId,
  );
  res.json({ card: toCard(ensureCard(req.userId)) });
});

// Invalidates any previously printed / shared QR code.
router.post('/regenerate', (req, res) => {
  ensureCard(req.userId);
  run('UPDATE emergency_cards SET share_id = ?, updated_at = ? WHERE user_id = ?', newShareId(), now(), req.userId);
  res.json({ card: toCard(ensureCard(req.userId)) });
});

export default router;
