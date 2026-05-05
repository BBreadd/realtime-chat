import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore.js';

const TYPING_DEBOUNCE_MS = 1500;

export function ChatWindow() {
  const { activeRoomId, messages, typingUsers, presence, user, sendMessage, sendTypingStart, sendTypingStop } =
    useChatStore();

  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const roomMessages = messages[activeRoomId] || [];
  const roomTyping = typingUsers[activeRoomId] || {};
  const roomPresence = presence[activeRoomId] || {};
  const onlineCount = Object.keys(roomPresence).length;

  const typingList = Object.values(roomTyping).filter((name) => name !== user?.username);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeRoomId) return;
    sendMessage(activeRoomId, text);
    setDraft('');
    clearTimeout(typingTimerRef.current);
    sendTypingStop(activeRoomId);
  };

  const handleDraftChange = useCallback(
    (e) => {
      setDraft(e.target.value);
      if (!activeRoomId) return;

      sendTypingStart(activeRoomId);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => sendTypingStop(activeRoomId), TYPING_DEBOUNCE_MS);
    },
    [activeRoomId, sendTypingStart, sendTypingStop]
  );

  if (!activeRoomId) {
    return <div className="chat-placeholder">Select a room to start chatting</div>;
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <span># {activeRoomId}</span>
        <span className="online-count">{onlineCount} online</span>
      </div>

      <div className="messages-list">
        {roomMessages.map((msg) => (
          <div key={msg.id} className={`message ${msg.user_id === user?.id ? 'own' : ''}`}>
            <span className="message-author">{msg.username}</span>
            <span className="message-text">{msg.text}</span>
            <span className="message-time">
              {new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {typingList.length > 0 && (
        <div className="typing-indicator">
          {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing…
        </div>
      )}

      <form className="message-form" onSubmit={handleSend}>
        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          placeholder={`Message #${activeRoomId}`}
          maxLength={2000}
          autoComplete="off"
        />
        <button type="submit" disabled={!draft.trim()}>Send</button>
      </form>
    </div>
  );
}
