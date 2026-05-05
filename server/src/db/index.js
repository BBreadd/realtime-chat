import Database from 'better-sqlite3';
import { config } from '../config/index.js';

let db;

export function getDb() {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    applySchema(db);
  }
  return db;
}

function applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token       TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id          TEXT PRIMARY KEY,
      name        TEXT UNIQUE NOT NULL,
      created_by  TEXT NOT NULL REFERENCES users(id),
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id),
      username    TEXT NOT NULL,
      text        TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  `);

  const defaultRooms = ['general', 'random', 'dev'];
  const systemId = 'system';

  const ensureSystem = db.prepare(
    `INSERT OR IGNORE INTO users (id, username, password) VALUES (?, 'system', 'n/a')`
  );
  ensureSystem.run(systemId);

  const insertRoom = db.prepare(
    `INSERT OR IGNORE INTO rooms (id, name, created_by) VALUES (?, ?, ?)`
  );
  for (const name of defaultRooms) {
    insertRoom.run(name, name, systemId);
  }
}
