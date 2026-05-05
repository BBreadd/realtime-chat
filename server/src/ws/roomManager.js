/**
 * Manages the in-memory mapping of rooms → connected clients.
 * Each room entry holds a Set of WebSocket client objects augmented
 * with `{ userId, username }`.
 */
const rooms = new Map();

/**
 * @param {string} roomId
 * @param {import('ws').WebSocket & { userId: string, username: string }} client
 */
export function joinRoom(roomId, client) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(client);
}

/**
 * @param {string} roomId
 * @param {import('ws').WebSocket} client
 */
export function leaveRoom(roomId, client) {
  rooms.get(roomId)?.delete(client);
  if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
}

/**
 * Remove a client from every room it has joined.
 * @param {import('ws').WebSocket} client
 */
export function removeFromAllRooms(client) {
  for (const [roomId, members] of rooms) {
    if (members.has(client)) {
      members.delete(client);
      if (members.size === 0) rooms.delete(roomId);
    }
  }
}

/**
 * @param {string} roomId
 * @param {object} payload
 * @param {import('ws').WebSocket} [exclude]
 */
export function broadcast(roomId, payload, exclude = null) {
  const members = rooms.get(roomId);
  if (!members) return;

  const frame = JSON.stringify(payload);
  for (const client of members) {
    if (client !== exclude && client.readyState === 1 /* OPEN */) {
      client.send(frame);
    }
  }
}

/**
 * @param {string} roomId
 * @returns {{ userId: string, username: string }[]}
 */
export function getMembers(roomId) {
  const members = rooms.get(roomId);
  if (!members) return [];
  return [...members].map(({ userId, username }) => ({ userId, username }));
}
