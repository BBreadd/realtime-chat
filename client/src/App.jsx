import { useEffect } from 'react';
import { useChatStore } from './store/chatStore.js';
import { AuthForm } from './components/AuthForm.jsx';
import { RoomList } from './components/RoomList.jsx';
import { ChatWindow } from './components/ChatWindow.jsx';

export default function App() {
  const { user, connected, initSocket, logout } = useChatStore();

  useEffect(() => {
    if (user) initSocket();
  }, [user, initSocket]);

  if (!user) return <AuthForm />;

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-logo">💬 Realtime Chat</span>
        <div className="header-right">
          <span className={`connection-badge ${connected ? 'online' : 'offline'}`}>
            {connected ? 'Connected' : 'Reconnecting…'}
          </span>
          <span className="current-user">{user.username}</span>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>
      <div className="app-body">
        <RoomList />
        <ChatWindow />
      </div>
    </div>
  );
}
