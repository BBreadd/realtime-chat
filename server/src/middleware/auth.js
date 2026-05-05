import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Express middleware that validates the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing token' });
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}
