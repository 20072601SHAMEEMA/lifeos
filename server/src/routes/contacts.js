import { Router } from 'express';
import { get, all, run, now, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toContact, logEvent } from '../utils/serializers.js';
import { badRequest, notFound, isEmail, isFullPhone, str } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

const PRIORITIES = ['high', 'medium', 'low'];
const MAX_CONTACTS = 20;

const ORDER = `ORDER BY is_primary DESC,
  CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, name COLLATE NOCASE`;

function validate(body) {
  const data = {
    name: str(body.name, 60),
    relationship: str(body.relationship, 40),
    phone: str(body.phone, 25),
    email: str(body.email, 120).toLowerCase(),
    priority: str(body.priority, 10) || 'medium',
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Name is required.';
  if (!data.relationship) errors.relationship = 'Relationship is required.';
  if (!data.phone) errors.phone = 'Phone number is required.';
  else if (!isFullPhone(data.phone)) errors.phone = 'Enter a valid phone number (7–15 digits).';
  if (data.email && !isEmail(data.email)) errors.email = 'Enter a valid email address.';
  if (!PRIORITIES.includes(data.priority)) errors.priority = 'Choose high, medium or low.';
  if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields.', errors);
  return data;
}

const owned = (userId, id) => {
  const row = get('SELECT * FROM contacts WHERE id = ? AND user_id = ?', Number(id), userId);
  if (!row) throw notFound('Contact not found.');
  return row;
};

const list = (userId) => all(`SELECT * FROM contacts WHERE user_id = ? ${ORDER}`, userId).map(toContact);

router.get('/', (req, res) => {
  res.json({ contacts: list(req.userId) });
});

router.post('/', (req, res) => {
  const d = validate(req.body || {});
  const { count } = get('SELECT COUNT(*) AS count FROM contacts WHERE user_id = ?', req.userId);
  if (count >= MAX_CONTACTS) throw badRequest(`You can save up to ${MAX_CONTACTS} emergency contacts.`);

  const makePrimary = count === 0 || Boolean(req.body.isPrimary);
  const id = transaction(() => {
    if (makePrimary) run('UPDATE contacts SET is_primary = 0 WHERE user_id = ?', req.userId);
    const r = run(
      'INSERT INTO contacts (user_id, name, relationship, phone, email, priority, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      req.userId, d.name, d.relationship, d.phone, d.email || null, d.priority, makePrimary, now(),
    );
    return Number(r.lastInsertRowid);
  });
  logEvent(req.userId, 'contact', 'Emergency contact added', `${d.name} (${d.relationship}) was added to your trusted contacts.`);
  res.status(201).json({ contact: toContact(owned(req.userId, id)), contacts: list(req.userId) });
});

router.put('/:id', (req, res) => {
  owned(req.userId, req.params.id);
  const d = validate(req.body || {});
  run(
    'UPDATE contacts SET name = ?, relationship = ?, phone = ?, email = ?, priority = ? WHERE id = ? AND user_id = ?',
    d.name, d.relationship, d.phone, d.email || null, d.priority, Number(req.params.id), req.userId,
  );
  res.json({ contact: toContact(owned(req.userId, req.params.id)), contacts: list(req.userId) });
});

router.patch('/:id/primary', (req, res) => {
  const c = owned(req.userId, req.params.id);
  transaction(() => {
    run('UPDATE contacts SET is_primary = 0 WHERE user_id = ?', req.userId);
    run('UPDATE contacts SET is_primary = 1 WHERE id = ?', c.id);
  });
  res.json({ contacts: list(req.userId) });
});

router.delete('/:id', (req, res) => {
  const c = owned(req.userId, req.params.id);
  transaction(() => {
    run('DELETE FROM contacts WHERE id = ?', c.id);
    if (c.is_primary) {
      // Promote the next most important contact so there is always a primary.
      const next = get(`SELECT id FROM contacts WHERE user_id = ? ${ORDER} LIMIT 1`, req.userId);
      if (next) run('UPDATE contacts SET is_primary = 1 WHERE id = ?', next.id);
    }
  });
  res.json({ contacts: list(req.userId) });
});

export default router;
