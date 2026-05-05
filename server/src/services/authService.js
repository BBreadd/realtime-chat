import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { config } from '../config/index.js';

const BCRYPT_ROUNDS = 12;

/**
 * @param {string} username
 * @param {string} password
 * @returns {{ accessToken: string, refreshToken: string, user: object }}
 */
export async function register(username, password) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    const err = new Error('Username already taken');
    err.code = 'CONFLICT';
    throw err;
  }

  const id = uuidv4();
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)').run(id, username, hashed);

  return issueTokens({ id, username });
}

/**
 * @param {string} username
 * @param {string} password
 * @returns {{ accessToken: string, refreshToken: string, user: object }}
 */
export async function login(username, password) {
  const db = getDb();
  const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(username);

  if (!user) {
    const err = new Error('Invalid credentials');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  return issueTokens({ id: user.id, username: user.username });
}

/**
 * @param {string} token
 * @returns {{ accessToken: string, refreshToken: string, user: object }}
 */
export function refresh(token) {
  const db = getDb();
  const row = db.prepare('SELECT user_id, expires_at FROM refresh_tokens WHERE token = ?').get(token);

  if (!row || row.expires_at < Math.floor(Date.now() / 1000)) {
    const err = new Error('Invalid or expired refresh token');
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(row.user_id);
  return issueTokens({ id: user.id, username: user.username });
}

function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  const refreshToken = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  getDb()
    .prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(refreshToken, user.id, expiresAt);

  return { accessToken, refreshToken, user: { id: user.id, username: user.username } };
}
