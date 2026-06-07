import React from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import { MIN_PLAYERS } from '@shared/constants';

export const RoomLobbyPage: React.FC = () => {
  const { room } = useGameStore();
  const { user } = useAuthStore();
  const { startGame, leaveRoom } = useSocket();

  if (!room || !user) return null;

  const isHost = room.hostId === user.id;
  const allPlayersConnected = room.players.every(player => player.isConnected);
  const canStart = isHost && room.players.length >= MIN_PLAYERS && allPlayersConnected;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    useGameStore.getState().addToast('success', 'Code copied');
  };

  return (
    <div className="lobby-page table-room-page">
      <header className="table-room-header">
        <div className="table-room-code-block">
          <p className="eyebrow">Table code</p>
          <button className="table-room-code" onClick={copyRoomCode} title="Copy room code">{room.roomCode}</button>
          <span>Tap to copy</span>
        </div>
        <div className="table-room-actions">
          <button className="btn btn-secondary" onClick={leaveRoom}>Leave</button>
          {isHost ? (
            <button className="btn btn-primary" onClick={startGame} disabled={!canStart}>
              {canStart ? 'Start' : room.players.length < MIN_PLAYERS ? `Need ${MIN_PLAYERS - room.players.length}` : 'Waiting'}
            </button>
          ) : (
            <span className="lobby-waiting-text">Waiting for host</span>
          )}
        </div>
      </header>

      <main className="table-room-grid">
        <section className="lobby-table-stage">
          <div className="mini-table">
            <div className="mini-table-inner">
              <span>♠</span>
              <span>♣</span>
              <span>♥</span>
              <span>♦</span>
            </div>
          </div>

          <div className="seat-orbit">
            {room.players.map((player) => {
              const initials = player.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={player.id} className={`orbit-seat seat-${player.seatIndex + 1} ${player.id === user.id ? 'is-me' : ''}`}>
                  <div className={`lobby-player-avatar ${player.isHost ? 'host' : ''}`}>
                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : <span>{initials}</span>}
                  </div>
                  <div className="orbit-seat-copy">
                    <strong>{player.name}{player.id === user.id ? ' (You)' : ''}</strong>
                    <span>Seat {player.seatIndex + 1}{player.isHost ? ' · Host' : ''}</span>
                  </div>
                  <span className={`lobby-status-dot ${player.isConnected ? 'online' : 'offline'}`} />
                </div>
              );
            })}
          </div>
        </section>

        <aside className="lobby-side-panel">
          <p className="eyebrow">Seats</p>
          <h2>{room.players.length}/{room.settings.maxPlayers}</h2>
          <div className="lobby-side-list">
            {room.players.map(player => (
              <div key={player.id} className="lobby-side-row">
                <span>{player.name}</span>
                <strong>{player.isConnected ? 'Online' : 'Away'}</strong>
              </div>
            ))}
            {Array.from({ length: room.settings.maxPlayers - room.players.length }).map((_, index) => (
              <div key={`empty-${index}`} className="lobby-side-row empty">
                <span>Open seat</span>
                <strong>Waiting</strong>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={copyRoomCode} style={{ width: '100%' }}>Copy code</button>
        </aside>
      </main>
    </div>
  );
};
