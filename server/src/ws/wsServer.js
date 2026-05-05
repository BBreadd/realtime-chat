import { WebSocketServer } from 'ws';
import { URL } from 'url';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { handleMessage } from './handlers.js';
import { removeFromAllRooms } from './roomManager.js';

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Attaches the WebSocket server to an existing HTTP server.
 *
 * Authentication: clients must pass `?token=<jwt>` in the upgrade URL.
 *
 * @param {import('http').Server} httpServer
 */
export function attachWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const user = authenticateUpgrade(ws, req);
    if (!user) return;

    ws.userId = user.sub;
    ws.username = user.username;
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        ws.send(JSON.stringify({ type: 'error', code: 'PARSE_ERROR', message: 'Invalid JSON' }));
        return;
      }
      handleMessage(ws, payload);
    });

    ws.on('close', () => removeFromAllRooms(ws));

    ws.on('error', (err) => {
      console.error(`WS error [${ws.username}]:`, err.message);
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        removeFromAllRooms(ws);
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('WebSocket server attached at /ws');
}

function authenticateUpgrade(ws, req) {
  try {
    const { searchParams } = new URL(req.url, 'http://localhost');
    const token = searchParams.get('token');

    if (!token) throw new Error('Missing token');

    return jwt.verify(token, config.jwtSecret);
  } catch {
    ws.send(JSON.stringify({ type: 'error', code: 'UNAUTHORIZED', message: 'Invalid or missing token' }));
    ws.close(1008, 'Unauthorized');
    return null;
  }
}
