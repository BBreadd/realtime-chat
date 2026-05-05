const TOKEN_KEY = 'rc_access_token';
const REFRESH_KEY = 'rc_refresh_token';
const USER_KEY = 'rc_user';

const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) return request(path, options);
    clearSession();
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || 'Request failed'), { code: body.error, status: res.status });
  }

  return res.json();
}

async function attemptTokenRefresh() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;

  try {
    const data = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    persistSession(data);
    return true;
  } catch {
    return false;
  }
}

function persistSession({ accessToken, refreshToken, user }) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export const api = {
  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }).then((d) => {
      persistSession(d);
      return d;
    }),

  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }).then((d) => {
      persistSession(d);
      return d;
    }),

  logout: () => clearSession(),

  getRooms: () => request('/rooms'),

  createRoom: (name) => request('/rooms', { method: 'POST', body: JSON.stringify({ name }) }),

  getMessages: (roomId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/rooms/${roomId}/messages${qs ? `?${qs}` : ''}`);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
};
