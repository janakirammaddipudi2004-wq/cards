import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './stores/authStore';
import { useGameStore } from './stores/gameStore';
import { useSocketListeners } from './hooks/useSocket';
import { LoginPage } from './pages/LoginPage';
import { NameSetupPage } from './pages/NameSetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomLobbyPage } from './pages/RoomLobbyPage';
import { GameTable } from './components/game/GameTable';

const getGoogleClientId = () => {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!envId || envId === 'your-google-client-id' || !envId.includes('.apps.googleusercontent.com')) {
    return null;
  }
  return envId;
};

const GOOGLE_CLIENT_ID = getGoogleClientId();

function AppContent() {
  const { isAuthenticated, isLoading, restoreSession, user } = useAuthStore();
  const { currentView, setView, toasts, removeToast } = useGameStore();

  // Register ALL server→client socket event handlers exactly once
  useSocketListeners();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isAuthenticated && user && !user.displayNameConfirmed) {
      setView('onboarding');
      return;
    }

    if (isAuthenticated && currentView === 'login') {
      setView('dashboard');
    }
    if (!isAuthenticated && !isLoading) {
      setView('login');
    }
  }, [currentView, isAuthenticated, isLoading, setView, user]);

  // Apply theme on mount
  useEffect(() => {
    const theme = useGameStore.getState().theme;
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '2rem', fontWeight: 800,
            fontFamily: "'Playfair Display', serif",
            marginBottom: 12,
          }}>
            <span className="text-gradient-gold">Trick</span>
            <span style={{ color: 'var(--text-primary)' }}>Master</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading...</div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return <LoginPage />;
      case 'onboarding':
        return <NameSetupPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'room':
        return <RoomLobbyPage />;
      case 'game':
        return <GameTable />;
      default:
        return <LoginPage />;
    }
  };

  return (
    <>
      {renderView()}

      {/* Global toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => removeToast(t.id)}
            style={{ cursor: 'pointer' }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}

function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="login-page auth-page">
        <main className="auth-shell auth-shell-compact">
          <section className="auth-table-scene" aria-label="TrickMaster table">
            <div className="auth-brand-lockup">
            <span className="auth-brand-kicker">Card room</span>
            <h1><span className="title-accent">Trick</span> Master</h1>
            </div>
            <div className="auth-felt-plate">
              <div className="auth-card-fan" aria-hidden="true">
                <div className="fan-card fan-card-1"><span>A</span><strong>♠</strong></div>
                <div className="fan-card fan-card-2"><span>K</span><strong>♣</strong></div>
                <div className="fan-card fan-card-3 red-card"><span>Q</span><strong>♥</strong></div>
                <div className="fan-card fan-card-4 red-card"><span>10</span><strong>♦</strong></div>
              </div>
              <div className="auth-table-center">
                <span>♠</span>
                <span>♣</span>
                <span>♥</span>
                <span>♦</span>
              </div>
            </div>
          </section>
          <section className="auth-panel login-card">
            <p className="eyebrow">Configuration</p>
            <h2>Google OAuth is not configured.</h2>
            <p className="auth-copy">Set VITE_GOOGLE_CLIENT_ID to enable sign in.</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

export default App;
