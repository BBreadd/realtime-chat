import { persistMessage } from '../services/roomService.js';
import { joinRoom, leaveRoom, broadcast, getMembers } from './roomManager.js';
import { getDb } from '../db/index.js';

const MAX_MESSAGE_LENGTH = 2000;

/**
 * @param {import('ws').WebSocket & { userId: string, username: string }} client
 * @param {object} payload
 */
export function handleMessage(client, payload) {
  switch (payload.type) {
    case 'join_room':   return onJoinRoom(client, payload);
    case 'leave_room':  return onLeaveRoom(client, payload);
    case 'send_message': return onSendMessage(client, payload);
    case 'typing_start': return onTyping(client, payload, true);
    case 'typing_stop':  return onTyping(client, payload, false);
    default:
      sendError(client, 'UNKNOWN_TYPE', `Unknown message type: ${payload.type}`);
  }
}

function onJoinRoom(client, { roomId }) {
  if (!roomId) return sendError(client, 'VALIDATION', 'roomId required');

  const room = getDb().prepare('SELECT id FROM rooms WHERE id = ?').get(roomId);
  if (!room) return sendError(client, 'NOT_FOUND', `Room '${roomId}' does not exist`);

  joinRoom(roomId, client);

  send(client, { type: 'room_joined', roomId, members: getMembers(roomId) });

  broadcast(
    roomId,
    { type: 'presence', roomId, userId: client.userId, username: client.username, status: 'online' },
    client
  );
}

function onLeaveRoom(client, { roomId }) {
  if (!roomId) return sendError(client, 'VALIDATION', 'roomId required');

  leaveRoom(roomId, client);

  broadcast(roomId, {
    type: 'presence',
    roomId,
    userId: client.userId,
    username: client.username,
    status: 'offline',
  });
}

function onSendMessage(client, { roomId, text }) {
  if (!roomId || !text?.trim()) {
    return sendError(client, 'VALIDATION', 'roomId and text required');
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return sendError(client, 'VALIDATION', `Message exceeds ${MAX_MESSAGE_LENGTH} characters`);
  }

  const message = persistMessage(roomId, client.userId, client.username, text.trim());

  broadcast(roomId, { type: 'new_message', roomId, message });
}

function onTyping(client, { roomId }, active) {
  if (!roomId) return sendError(client, 'VALIDATION', 'roomId required');

  broadcast(
    roomId,
    { type: 'typing', roomId, userId: client.userId, username: client.username, active },
    client
  );
}

function send(client, payload) {
  if (client.readyState === 1) client.send(JSON.stringify(payload));
}

function sendError(client, code, message) {
  send(client, { type: 'error', code, message });
}
