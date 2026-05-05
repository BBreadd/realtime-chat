import { Router } from 'express';
import { register, login, refresh } from '../services/authService.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const authLimiter = rateLimiter({ maxTokens: 5, refillRate: 0.1 });

router.post('/register', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'VALIDATION', message: 'username and password required' });
  }
  if (username.length > 32 || password.length < 8) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Invalid username or password length' });
  }

  try {
    const result = await register(username.trim(), password);
    return res.status(201).json(result);
  } catch (err) {
    if (err.code === 'CONFLICT') return res.status(409).json({ error: err.code, message: err.message });
    throw err;
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'VALIDATION', message: 'username and password required' });
  }

  try {
    const result = await login(username, password);
    return res.json(result);
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') return res.status(401).json({ error: err.code, message: err.message });
    throw err;
  }
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'VALIDATION', message: 'refreshToken required' });
  }

  try {
    const result = refresh(refreshToken);
    return res.json(result);
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') return res.status(401).json({ error: err.code, message: err.message });
    throw err;
  }
});

export default router;
