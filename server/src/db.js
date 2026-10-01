import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, '..');

const DB_PATH = path.resolve(SERVER_ROOT, process.env.DB_PATH || './data/lifeos.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  phone         TEXT,
  photo         TEXT,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  priority     TEXT NOT NULL DEFAULT 'medium',
  is_primary   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);

CREATE TABLE IF NOT EXISTS journeys (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_label      TEXT NOT NULL,
  dest_label       TEXT NOT NULL,
  start_lat        REAL,
  start_lng        REAL,
  dest_lat         REAL,
  dest_lng         REAL,
  last_lat         REAL,
  last_lng         REAL,
  contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  started_at       TEXT NOT NULL,
  expected_arrival TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  checkins         INTEGER NOT NULL DEFAULT 0,
  last_checkin_at  TEXT,
  ended_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_journeys_user ON journeys(user_id, status);

CREATE TABLE IF NOT EXISTS sos_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'active',
  lat         REAL,
  lng         REAL,
  accuracy    REAL,
  contacts    TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sos_user ON sos_events(user_id, status);

CREATE TABLE IF NOT EXISTS safety_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  detail     TEXT,
  lat        REAL,
  lng        REAL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_user ON safety_history(user_id, created_at);

CREATE TABLE IF NOT EXISTS emergency_cards (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  share_id        TEXT NOT NULL UNIQUE,
  sharing_enabled INTEGER NOT NULL DEFAULT 0,
  blood_group     TEXT,
  allergies       TEXT,
  conditions      TEXT,
  medications     TEXT,
  notes           TEXT,
  emergency_phone TEXT,
  visibility      TEXT NOT NULL DEFAULT '{}',
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
`);

/** Small helpers so route files stay readable. node:sqlite only binds null/number/string/bigint. */
const norm = (params) => params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? Number(p) : p));

export const get = (sql, ...params) => db.prepare(sql).get(...norm(params));
export const all = (sql, ...params) => db.prepare(sql).all(...norm(params));
export const run = (sql, ...params) => db.prepare(sql).run(...norm(params));

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export const now = () => new Date().toISOString();
