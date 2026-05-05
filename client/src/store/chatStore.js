import { create } from 'zustand';
import { api } from '../services/api.js';
import { ChatSocket } from '../services/chatSocket.js';

export const useChatStore = create((set, get) => ({
  user: api.getUser(),
  socket: null,
  connected: false,
  rooms: [],
  activeRoomId: null,
  messages: {},
  typingUsers: {},
  presence: {},

  initSocket: () => {
    const token = api.getToken();
    if (!token || get().socket) return;

    const socket = new ChatSocket(token);

    socket.on('__connected__', () => set({ connected: true }));
    socket.on('__disconnected__', () => set({ connected: false }));

    socket.on('new_message', ({ roomId, message }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: [...(state.messages[roomId] || []), message],
        },
      }));
    });

    socket.on('presence', ({ roomId, userId, username, status }) => {
      set((state) => {
        const roomPresence = { ...(state.presence[roomId] || {}) };
        if (status === 'online') {
          roomPresence[userId] = username;
        } else {
          delete roomPresence[userId];
        }
        return { presence: { ...state.presence, [roomId]: roomPresence } };
      });
    });

    socket.on('typing', ({ roomId, userId, username, active }) => {
      set((state) => {
        const roomTyping = { ...(state.typingUsers[roomId] || {}) };
        if (active) {
          roomTyping[userId] = username;
        } else {
          delete roomTyping[userId];
        }
        return { typingUsers: { ...state.typingUsers, [roomId]: roomTyping } };
      });
    });

    socket.on('room_joined', ({ roomId, members }) => {
      const presenceMap = Object.fromEntries(members.map((m) => [m.userId, m.username]));
      set((state) => ({
        presence: { ...state.presence, [roomId]: presenceMap },
      }));
    });

    set({ socket });
  },

  destroySocket: () => {
    get().socket?.destroy();
    set({ socket: null, connected: false });
  },

  login: async (username, password) => {
    const data = await api.login(username, password);
    set({ user: data.user });
    get().initSocket();
  },

  register: async (username, password) => {
    const data = await api.register(username, password);
    set({ user: data.user });
    get().initSocket();
  },

  logout: () => {
    api.logout();
    get().destroySocket();
    set({ user: null, rooms: [], messages: {}, activeRoomId: null });
  },

  loadRooms: async () => {
    const rooms = await api.getRooms();
    set({ rooms });
  },

  joinRoom: async (roomId) => {
    const { socket, messages } = get();
    set({ activeRoomId: roomId });

    socket?.send({ type: 'join_room', roomId });

    if (!messages[roomId]) {
      const history = await api.getMessages(roomId);
      set((state) => ({
        messages: { ...state.messages, [roomId]: [...history].reverse() },
      }));
    }
  },

  leaveRoom: (roomId) => {
    get().socket?.send({ type: 'leave_room', roomId });
  },

  sendMessage: (roomId, text) => {
    get().socket?.send({ type: 'send_message', roomId, text });
  },

  sendTypingStart: (roomId) => get().socket?.send({ type: 'typing_start', roomId }),
  sendTypingStop: (roomId) => get().socket?.send({ type: 'typing_stop', roomId }),
}));
