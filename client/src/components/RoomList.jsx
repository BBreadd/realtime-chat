import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore.js';

export function RoomList() {
  const { rooms, activeRoomId, loadRooms, joinRoom, leaveRoom, createRoom } = useChatStore();

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreateRoom = async () => {
    const name = prompt('Room name:')?.trim().toLowerCase();
    if (!name) return;
    try {
      await createRoom(name);
      await loadRooms();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelectRoom = (roomId) => {
    if (activeRoomId && activeRoomId !== roomId) leaveRoom(activeRoomId);
    joinRoom(roomId);
  };

  return (
    <aside className="room-list">
      <div className="room-list-header">
        <span>Rooms</span>
        <button onClick={handleCreateRoom} title="New room">+</button>
      </div>
      <ul>
        {rooms.map((room) => (
          <li
            key={room.id}
            className={room.id === activeRoomId ? 'active' : ''}
            onClick={() => handleSelectRoom(room.id)}
          >
            # {room.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}
