import { useState } from 'react';
import type { FC } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';

export const NameSetupPage: FC = () => {
  const { user, updateDisplayName, logout } = useAuthStore();
  const { addToast, setView } = useGameStore();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const saveName = async () => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 32) {
      addToast('error', 'Name must be between 2 and 32 characters');
      return;
    }

    setIsSaving(true);
    try {
      await updateDisplayName(trimmed);
      addToast('success', 'Name saved');
      setView('dashboard');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Could not save name');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="name-setup-page identity-page">
      <main className="identity-shell">
        <section className="identity-table-side" aria-label="Player identity preview">
          <div className="brand-mark">
            <span className="title-accent">Trick</span> Master
          </div>
          <div className="identity-preview-table">
            <div className="identity-preview-seat primary">
              <div className="mini-avatar">
                {user.avatar ? <img src={user.avatar} alt="" /> : user.name.slice(0, 2).toUpperCase()}
              </div>
              <span>{name.trim() || user.name}</span>
            </div>
            <div className="identity-preview-seat seat-a">Dealer</div>
            <div className="identity-preview-seat seat-b">Bid 1</div>
            <div className="identity-preview-seat seat-c">Ready</div>
          </div>
        </section>

        <section className="name-setup-panel identity-panel">
          <div className="name-setup-avatar">
            {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="name-setup-copy">
            <p className="eyebrow">Player name</p>
            <h1>Choose your table name</h1>
            <p>This is the name the table sees.</p>
          </div>

          <label className="field-label" htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            className="input name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && saveName()}
            maxLength={32}
            autoFocus
          />

          <div className="name-setup-actions">
            <button className="btn btn-secondary" onClick={logout}>Sign Out</button>
            <button className="btn btn-primary" onClick={saveName} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
