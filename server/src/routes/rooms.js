import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listRooms, createRoom, getMessages } from '../services/roomService.js';

const router = Router();

router.use(requireAuth);

router.get('/', (_req, res) => {
  res.json(listRooms());
});

router.post('/', (req, res) => {
  const { name } = req.body;

  if (!name?.trim() || name.length > 64) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Valid room name required (max 64 chars)' });
  }

  try {
    const room = createRoom(name.trim().toLowerCase(), req.user.sub);
    return res.status(201).json(room);
  } catch (err) {
    if (err.code === 'CONFLICT') return res.status(409).json({ error: err.code, message: err.message });
    throw err;
  }
});

router.get('/:id/messages', (req, res) => {
  const before = req.query.before ? Number(req.query.before) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  if (Number.isNaN(limit) || limit < 1) {
    return res.status(400).json({ error: 'VALIDATION', message: 'Invalid limit parameter' });
  }

  try {
    const messages = getMessages(req.params.id, { before, limit });
    return res.json(messages);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.code, message: err.message });
    throw err;
  }
});

export default router;
