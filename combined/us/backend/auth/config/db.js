// Auth storage: a single SQLite file (auth.db) — nothing to install, no server to start.
// Uses Node's built-in `node:sqlite` module (Node 22.13+ / 24).
//
// The tables are created automatically the first time the server starts.
// The file lives next to this folder (backend/auth/auth.db); override with AUTH_DB_PATH in .env.

const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.AUTH_DB_PATH || path.join(__dirname, '..', 'auth.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL,
    email                 TEXT    NOT NULL UNIQUE,
    password_hash         TEXT    NOT NULL,
    role                  TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    is_verified           INTEGER NOT NULL DEFAULT 0,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until          TEXT,
    created_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at            TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- Hashed refresh tokens so they can be revoked (logout / rotation)
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    revoked    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash);
`;

let db = null;
let initError = null;

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
} catch (err) {
  initError = err;
}

// Models call this instead of touching `db` directly, so a problem here only breaks
// login/signup (clean 500) and never the air-quality / prediction endpoints.
function getDb() {
  if (!db) {
    const hint =
      initError && /node:sqlite|Cannot find module/i.test(String(initError.message))
        ? ' Your Node.js is too old for the built-in SQLite module — install Node 22.13 or newer (nodejs.org, LTS).'
        : '';
    throw new Error(`Auth database unavailable: ${initError ? initError.message : 'not initialised'}.${hint}`);
  }
  return db;
}

// Boot-time log so failures are obvious immediately. Never exits the process.
async function testConnection() {
  try {
    getDb().prepare('SELECT 1').get();
    console.log(`✅ Auth database ready (${DB_PATH})`);
    return true;
  } catch (err) {
    console.error('❌ Auth database problem — login/signup will not work:', err.message);
    return false;
  }
}

module.exports = { getDb, testConnection };
