import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run, now } from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { toUser, logEvent } from '../utils/serializers.js';
import { badRequest, HttpError, isEmail, isFullPhone, str } from '../utils/validate.js';
import { ensureCard } from './card.js';

const router = Router();

router.post('/register', (req, res) => {
  const name = str(req.body.name, 80);
  const email = str(req.body.email, 120).toLowerCase();
  const phone = str(req.body.phone, 25);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!isEmail(email)) errors.email = 'Please enter a valid email address.';
  if (phone && !isFullPhone(phone)) errors.phone = 'Please enter a valid phone number.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields.', errors);

  if (get('SELECT id FROM users WHERE email = ?', email)) {
    throw new HttpError(409, 'An account with this email already exists.', { email: 'Email already registered.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = run(
    'INSERT INTO users (name, email, password_hash, phone, created_at) VALUES (?, ?, ?, ?, ?)',
    name, email, hash, phone || null, now(),
  );
  const userId = Number(lastInsertRowid);
  ensureCard(userId);
  logEvent(userId, 'account', 'Welcome to LifeOS', 'Your safety dashboard was created.');

  const user = get('SELECT * FROM users WHERE id = ?', userId);
  res.status(201).json({ token: signToken(userId), user: toUser(user) });
});

router.post('/login', (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) throw badRequest('Email and password are required.');

  const user = get('SELECT * FROM users WHERE email = ?', email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(401, 'Incorrect email or password.');
  }
  res.json({ token: signToken(user.id), user: toUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toUser(get('SELECT * FROM users WHERE id = ?', req.userId)) });
});

export default router;
