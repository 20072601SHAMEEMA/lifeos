import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { get, SERVER_ROOT } from '../db.js';

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  // Persist an auto-generated secret so sessions survive server restarts.
  const file = path.join(SERVER_ROOT, 'data', '.jwt-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret);
    return secret;
  }
}

const JWT_SECRET = loadSecret();
const TOKEN_TTL = '7d';

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = get('SELECT id FROM users WHERE id = ?', payload.sub);
    if (!user) return res.status(401).json({ error: 'Your account no longer exists.' });
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}
