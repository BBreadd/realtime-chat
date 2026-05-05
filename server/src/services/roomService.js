import { getDb } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * @returns {object[]}
 */
export function listRooms() {
  return getDb().prepare('SELECT id, name, created_at FROM rooms ORDER BY name').all();
}

/**
 * @param {string} name
 * @param {string} createdBy - user id
 * @returns {object}
 */
export function createRoom(name, createdBy) {
  const db = getDb();
  const exists = db.prepare('SELECT id FROM rooms WHERE name = ?').get(name);
  if (exists) {
    const err = new Error('Room name already taken');
    err.code = 'CONFLICT';
    throw err;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO rooms (id, name, created_by) VALUES (?, ?, ?)').run(id, name, createdBy);
  return db.prepare('SELECT id, name, created_at FROM rooms WHERE id = ?').get(id);
}

/**
 * @param {string} roomId
 * @param {{ before?: number, limit?: number }} options
 * @returns {object[]}
 */
export function getMessages(roomId, { before, limit = 50 } = {}) {
  const db = getDb();
  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    const err = new Error('Room not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const safeLimit = Math.min(limit, 100);

  if (before) {
    return db
      .prepare(
        `SELECT id, room_id, user_id, username, text, created_at
         FROM messages
         WHERE room_id = ? AND created_at < ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(roomId, before, safeLimit);
  }

  return db
    .prepare(
      `SELECT id, room_id, user_id, username, text, created_at
       FROM messages
       WHERE room_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(roomId, safeLimit);
}

/**
 * @param {string} roomId
 * @param {string} userId
 * @param {string} username
 * @param {string} text
 * @returns {object}
 */
export function persistMessage(roomId, userId, username, text) {
  const id = uuidv4();
  const db = getDb();
  db.prepare(
    'INSERT INTO messages (id, room_id, user_id, username, text) VALUES (?, ?, ?, ?, ?)'
  ).run(id, roomId, userId, username, text);

  return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
}
