const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_MULTIPLIER = 2;

/**
 * Thin wrapper around the native WebSocket that adds:
 * - Authenticated connection (JWT via query string)
 * - Exponential back-off reconnection
 * - Typed message listener registry
 */
export class ChatSocket {
  #url;
  #listeners = new Map();
  #ws = null;
  #reconnectDelay = RECONNECT_BASE_MS;
  #destroyed = false;

  /** @param {string} token - JWT access token */
  constructor(token) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    this.#url = `${proto}://${window.location.host}/ws?token=${token}`;
    this.#connect();
  }

  #connect() {
    this.#ws = new WebSocket(this.#url);

    this.#ws.addEventListener('open', () => {
      this.#reconnectDelay = RECONNECT_BASE_MS;
      this.#emit('__connected__', null);
    });

    this.#ws.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.#emit(payload.type, payload);
      } catch {
        console.warn('Received unparseable WS frame');
      }
    });

    this.#ws.addEventListener('close', () => {
      if (this.#destroyed) return;
      this.#emit('__disconnected__', null);
      this.#scheduleReconnect();
    });

    this.#ws.addEventListener('error', () => {
      this.#ws.close();
    });
  }

  #scheduleReconnect() {
    setTimeout(() => {
      if (!this.#destroyed) this.#connect();
    }, this.#reconnectDelay);

    this.#reconnectDelay = Math.min(
      this.#reconnectDelay * RECONNECT_MULTIPLIER,
      RECONNECT_MAX_MS
    );
  }

  /**
   * @param {string} type
   * @param {(payload: object) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(type, handler) {
    if (!this.#listeners.has(type)) this.#listeners.set(type, new Set());
    this.#listeners.get(type).add(handler);
    return () => this.#listeners.get(type)?.delete(handler);
  }

  /** @param {object} payload */
  send(payload) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify(payload));
    }
  }

  destroy() {
    this.#destroyed = true;
    this.#ws?.close();
  }

  #emit(type, payload) {
    this.#listeners.get(type)?.forEach((fn) => fn(payload));
  }
}
