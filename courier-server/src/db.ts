import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'courier.db');
const dbExists = fs.existsSync(dbPath);

const db: DatabaseType = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  db.exec('ALTER TABLE users ADD COLUMN bio TEXT DEFAULT \'\'');
} catch {}

try {
  db.exec('ALTER TABLE users ADD COLUMN country TEXT DEFAULT \'\'');
} catch {}

try {
  db.exec('ALTER TABLE letters ADD COLUMN deliver_at TEXT NOT NULL DEFAULT \'\'');
} catch {}

try {
  db.exec('ALTER TABLE letters ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0');
} catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    country TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id),
    description TEXT DEFAULT '',
    page_hashes TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    recipient_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL,
    deliver_at TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_letters_public ON letters(is_public, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_letters_recipient ON letters(recipient_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
`);

export default db;
