import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { getDb } from './db/index.js';
import authRouter from './routes/auth.js';
import roomsRouter from './routes/rooms.js';
import { attachWsServer } from './ws/wsServer.js';

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'INTERNAL', message: 'An unexpected error occurred' });
});

const server = http.createServer(app);

getDb();
attachWsServer(server);

server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
