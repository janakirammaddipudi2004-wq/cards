import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useSocket } from '../hooks/useSocket';
import { MIN_PLAYERS, MAX_PLAYERS } from '@shared/constants';

export const DashboardPage: React.FC = () => {
  const { user, logout, updateDisplayName } = useAuthStore();
  const { addToast, theme, toggleTheme, roomConflict, setRoomConflict } = useGameStore();
  const { createRoom, joinRoom, leaveRoom, reconnectGame } = useSocket();

  const [showJoin, setShowJoin] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  if (!user) return null;

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const winRate = user.gamesPlayed > 0 ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(0) : '0';

  const handleCreateRoom = () => {
    createRoom({ maxPlayers, isPublic: false, allowSpectators: true, autoStart: false });
  };

  const handleJoinRoom = () => {
    if (roomCode.trim().length < 4) {
      addToast('error', 'Enter a valid room code');
      return;
    }
    joinRoom(roomCode.trim().toUpperCase());
  };

  const openNameEditor = () => {
    setNameDraft(user.name);
    setIsEditingName(true);
  };

  const saveDisplayName = async () => {
    const trimmed = nameDraft.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 32) {
      addToast('error', 'Name must be between 2 and 32 characters');
      return;
    }

    setIsSavingName(true);
    try {
      await updateDisplayName(trimmed);
      setIsEditingName(false);
      addToast('success', 'Name updated');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Could not update name');
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="dashboard-page app-room-page">
      <aside className="app-rail">
        <div className="rail-brand"><span className="title-accent">Trick</span> Master</div>
        <div className="rail-user">
          <div className="dash-avatar">
            {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{initials}</span>}
          </div>
          <div>
            <div className="rail-name">{user.name}</div>
            <button className="rail-link" onClick={openNameEditor}>Edit profile</button>
          </div>
        </div>
        <nav className="rail-nav" aria-label="Primary">
          <button className="rail-nav-item active">Table</button>
          <button className="rail-nav-item" onClick={toggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          <button className="rail-nav-item" onClick={logout}>Exit</button>
        </nav>
      </aside>

      <main className="play-hub">
        <header className="play-hero">
          <div>
            <p className="eyebrow">Card room</p>
            <h1>Sharp bids. Quiet table. One clean trick.</h1>
          </div>
          <div className="hero-suits" aria-hidden="true">
            <span>♠</span><span>♣</span><span>♥</span><span>♦</span>
          </div>
        </header>

        <section className="hub-grid">
          <div className="hub-panel profile-panel">
            <div className="dash-profile-main">
              <div className="dash-avatar">
                {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{initials}</span>}
              </div>
              <div className="dash-user-info">
                <div className="dash-user-kicker">At the table</div>
                <div className="dash-user-name-row">
                  <div className="dash-user-name">{user.name}</div>
                  <button className="btn btn-secondary btn-sm" onClick={openNameEditor}>Edit</button>
                </div>
                <div className="dash-user-email">{user.email}</div>
              </div>
            </div>

            <div className="dash-stats">
              <div className="dash-stat"><span className="dash-stat-value">{user.gamesPlayed}</span><span className="dash-stat-label">Played</span></div>
              <div className="dash-stat"><span className="dash-stat-value">{user.gamesWon}</span><span className="dash-stat-label">Won</span></div>
              <div className="dash-stat"><span className="dash-stat-value">{winRate}%</span><span className="dash-stat-label">Win rate</span></div>
              <div className="dash-stat"><span className="dash-stat-value">{user.totalPoints}</span><span className="dash-stat-label">Points</span></div>
            </div>
          </div>

          <div className="hub-panel action-panel primary-action">
            <p className="eyebrow">Host</p>
            <h3>Deal a table</h3>
            <p>Pick the seats. Share the code.</p>

            {!showCreate ? (
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>New table</button>
            ) : (
              <div className="create-form">
                <label className="create-label">Players</label>
                <div className="player-count-row">
                  {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, index) => MIN_PLAYERS + index).map(n => (
                    <button key={n} className={`count-btn ${maxPlayers === n ? 'active' : ''}`} onClick={() => setMaxPlayers(n)}>
                      {n}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={handleCreateRoom} style={{ width: '100%', marginTop: 14 }}>Deal</button>
              </div>
            )}
          </div>

          <div className="hub-panel action-panel">
            <p className="eyebrow">Join</p>
            <h3>Take a seat</h3>
            <p>Use the table code from the host.</p>

            {!showJoin ? (
              <button className="btn btn-secondary btn-lg" onClick={() => setShowJoin(true)}>Enter code</button>
            ) : (
              <div className="join-form vertical">
                <input
                  className="input code-input"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  onKeyDown={(event) => event.key === 'Enter' && handleJoinRoom()}
                  placeholder="ROOM CODE"
                  maxLength={8}
                  autoFocus
                />
                <button className="btn btn-primary" onClick={handleJoinRoom}>Join</button>
              </div>
            )}
          </div>

          <div className="hub-panel rules-card">
            <p className="eyebrow">House rules</p>
            <h3>How the table plays</h3>
            <ul className="rules-list">
              <li><strong>13 rounds</strong> with 1 to 13 cards per player.</li>
              <li><strong>Dealer bids last</strong> and cannot make total bids equal the round.</li>
              <li><strong>Suit priority</strong> is ♠ &gt; ♣ &gt; ♥ &gt; ♦.</li>
              <li><strong>Exact bid</strong> scores 10 + 11×bid, otherwise 0.</li>
              <li><strong>Duplicate cards</strong> exist; later identical card wins.</li>
            </ul>
          </div>
        </section>
      </main>

      {isEditingName && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit display name">
          <div className="profile-modal">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Edit table name</h2>
            </div>
            <label className="field-label" htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              className="input name-input"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && saveDisplayName()}
              maxLength={32}
              autoFocus
            />
            <div className="name-setup-actions">
              <button className="btn btn-secondary" onClick={() => setIsEditingName(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={isSavingName} onClick={saveDisplayName}>
                {isSavingName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {roomConflict && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Room already active">
          <div className="profile-modal room-conflict-modal">
            <p className="eyebrow">Active seat found</p>
            <h2>You are already in room {roomConflict.existingRoom.roomCode}</h2>
            <p className="modal-copy">Return to that table, or leave it before creating or joining another room.</p>
            <div className="conflict-room-summary">
              <span>{roomConflict.existingRoom.players.length}/{roomConflict.existingRoom.settings.maxPlayers} players</span>
              <span>{roomConflict.existingRoom.status.replace('_', ' ')}</span>
            </div>
            <div className="name-setup-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  leaveRoom();
                  setRoomConflict(null);
                }}
              >
                Leave Room
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  reconnectGame(roomConflict.existingRoom.roomCode);
                  setRoomConflict(null);
                }}
              >
                Return to Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
