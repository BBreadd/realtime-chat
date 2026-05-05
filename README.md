# realtime-chat

A full-stack real-time chat application demonstrating production-grade WebSocket architecture, JWT-based authentication, and multi-room messaging.

## Tech Stack

**Backend:** Node.js · Express · `ws` (native WebSocket) · SQLite (better-sqlite3) · JWT  
**Frontend:** React 18 · Vite · native WebSocket API · Zustand

## Architecture Overview

```
realtime-chat/
├── server/                  # Node.js backend
│   └── src/
│       ├── config/          # Environment & constants
│       ├── db/              # Database schema & migrations
│       ├── middleware/      # Auth, rate-limiting
│       ├── routes/          # REST endpoints (auth, rooms, messages)
│       ├── services/        # Business logic layer
│       └── ws/              # WebSocket server, handlers, room manager
└── client/                  # React frontend
    └── src/
        ├── components/      # UI components
        ├── hooks/           # Custom React hooks
        ├── services/        # API & WS client abstractions
        └── store/           # Zustand global state
```

## Features

- JWT authentication (access + refresh tokens)
- Multiple chat rooms with live presence (online users)
- Message persistence with paginated history via REST
- Typing indicators and read receipts over WebSocket
- Rate limiting on both HTTP and WS layers
- Graceful WS reconnection with exponential back-off on the client

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Server

```bash
cd server
cp .env.example .env   # fill in JWT_SECRET
npm install
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

The client dev server proxies `/api` and `/ws` to `localhost:4000` automatically.

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Obtain access + refresh tokens |
| POST | `/api/auth/refresh` | Rotate refresh token |
| GET | `/api/rooms` | List all rooms |
| POST | `/api/rooms` | Create a room |
| GET | `/api/rooms/:id/messages` | Paginated message history |

WebSocket endpoint: `ws://localhost:4000/ws?token=<jwt>`

## WebSocket Protocol

All frames are JSON. Each message carries a `type` discriminant:

```jsonc
// Client → Server
{ "type": "join_room",    "roomId": "general" }
{ "type": "leave_room",   "roomId": "general" }
{ "type": "send_message", "roomId": "general", "text": "hello" }
{ "type": "typing_start", "roomId": "general" }
{ "type": "typing_stop",  "roomId": "general" }

// Server → Client
{ "type": "room_joined",   "roomId": "general", "members": [...] }
{ "type": "new_message",   "roomId": "general", "message": {...} }
{ "type": "presence",      "roomId": "general", "userId": "x", "status": "online" }
{ "type": "typing",        "roomId": "general", "userId": "x", "active": true }
{ "type": "error",         "code": "UNAUTHORIZED", "message": "..." }
```

## License

MIT
