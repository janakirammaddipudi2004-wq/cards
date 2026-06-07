import type { FC } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';

export const LoginPage: FC = () => {
  const { login } = useAuthStore();
  const { setView, addToast } = useGameStore();

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        await login(response.credential);
        setView('dashboard');
      } catch (error) {
        addToast('error', error instanceof Error ? error.message : 'Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="login-page auth-page">
      <main className="auth-shell">
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
            <div className="auth-seat-chip auth-seat-top">Dealer</div>
            <div className="auth-seat-chip auth-seat-left">Bid 2</div>
            <div className="auth-seat-chip auth-seat-right">Bid 0</div>
          </div>
        </section>

        <section className="auth-panel login-card">
          <p className="eyebrow">Sign in</p>
          <h2>Take your seat.</h2>
          <p className="auth-copy">Keep your table name, room, and scores ready for the next hand.</p>

          <div className="login-form">
            <p className="login-label">Continue with Google</p>
            <p className="login-hint">No password kept here.</p>

          <div className="login-google-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => addToast('error', 'Google login failed')}
              theme="filled_black"
              size="large"
              shape="pill"
              text="signin_with"
              width="300"
            />
          </div>

            <div className="auth-trust-row" aria-label="Security notes">
              <span>Private tables</span>
              <span>Quick reconnect</span>
              <span>Score history</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
