import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, all, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { toUser, toContact, toJourney, toSos, toHistory } from '../utils/serializers.js';
import { badRequest, HttpError, isEmail, isFullPhone, str } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

const MAX_PHOTO_CHARS = 1_500_000; // ~1.1 MB image as a data URL

router.get('/profile', (req, res) => {
  res.json({ user: toUser(get('SELECT * FROM users WHERE id = ?', req.userId)) });
});

router.put('/profile', (req, res) => {
  const current = get('SELECT * FROM users WHERE id = ?', req.userId);
  const b = req.body || {};
  const name = b.name === undefined ? current.name : str(b.name, 80);
  const email = b.email === undefined ? current.email : str(b.email, 120).toLowerCase();
  const phone = b.phone === undefined ? current.phone : str(b.phone, 25);
  let photo = current.photo;

  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!isEmail(email)) errors.email = 'Please enter a valid email address.';
  if (phone && !isFullPhone(phone)) errors.phone = 'Please enter a valid phone number.';
  if (b.photo !== undefined) {
    if (b.photo === null || b.photo === '') photo = null;
    else if (typeof b.photo !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(b.photo)) errors.photo = 'Unsupported image format.';
    else if (b.photo.length > MAX_PHOTO_CHARS) errors.photo = 'Image is too large.';
    else photo = b.photo;
  }
  if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields.', errors);

  if (email !== current.email && get('SELECT id FROM users WHERE email = ? AND id != ?', email, req.userId)) {
    throw new HttpError(409, 'That email is already used by another account.', { email: 'Email already registered.' });
  }

  run('UPDATE users SET name = ?, email = ?, phone = ?, photo = ? WHERE id = ?', name, email, phone || null, photo, req.userId);
  res.json({ user: toUser(get('SELECT * FROM users WHERE id = ?', req.userId)) });
});

router.put('/password', (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body || {};
  const user = get('SELECT password_hash FROM users WHERE id = ?', req.userId);
  if (!bcrypt.compareSync(String(currentPassword), user.password_hash)) {
    throw badRequest('Your current password is incorrect.', { currentPassword: 'Incorrect password.' });
  }
  if (String(newPassword).length < 8) throw badRequest('New password must be at least 8 characters.', { newPassword: 'Too short.' });
  run('UPDATE users SET password_hash = ? WHERE id = ?', bcrypt.hashSync(String(newPassword), 10), req.userId);
  res.json({ ok: true });
});

// Data portability: everything LifeOS stores about the user.
router.get('/export', (req, res) => {
  const id = req.userId;
  const card = get('SELECT * FROM emergency_cards WHERE user_id = ?', id);
  const settings = get('SELECT data FROM settings WHERE user_id = ?', id);
  res.json({
    exportedAt: new Date().toISOString(),
    profile: toUser(get('SELECT * FROM users WHERE id = ?', id)),
    contacts: all('SELECT * FROM contacts WHERE user_id = ?', id).map(toContact),
    journeys: all('SELECT * FROM journeys WHERE user_id = ? ORDER BY started_at DESC', id).map(toJourney),
    sosEvents: all('SELECT * FROM sos_events WHERE user_id = ? ORDER BY created_at DESC', id).map(toSos),
    safetyHistory: all('SELECT * FROM safety_history WHERE user_id = ? ORDER BY created_at DESC', id).map(toHistory),
    emergencyCard: card ? { ...card, visibility: JSON.parse(card.visibility) } : null,
    settings: settings ? JSON.parse(settings.data) : {},
  });
});

router.delete('/me', (req, res) => {
  run('DELETE FROM users WHERE id = ?', req.userId); // cascades to all user data
  res.json({ ok: true });
});

export default router;
