import React from 'react';
import { FinalStanding } from '@shared/types/game';
import { motion } from 'framer-motion';

interface GameOverModalProps {
  standings: FinalStanding[];
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  standings, onPlayAgain, onBackToLobby,
}) => {
  const winner = standings[0];
  const confettiColors = ['#d4a745', '#34d399', '#3b82f6', '#ef4444', '#a855f7'];

  return (
    <div className="game-over-overlay">
      <motion.div
        className="game-over-content"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        {/* Confetti particles */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: `${(i * 37) % 100}vw`,
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 20,
                rotate: ((i % 7) + 1) * 90,
                opacity: 0,
              }}
              transition={{
                duration: 2 + (i % 5) * 0.45,
                delay: (i % 6) * 0.2,
                ease: 'easeIn',
              }}
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                background: confettiColors[i % confettiColors.length],
              }}
            />
          ))}
        </div>

        <div className="winner-crown">👑</div>

        <div className="winner-name text-gradient-gold">
          {winner.playerName}
        </div>

        <div className="winner-score">
          {winner.totalScore} points
        </div>

        {/* Standings table */}
        <div className="glass-strong" style={{ padding: 20, marginBottom: 24, textAlign: 'left' }}>
          <div style={{
            fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
          }}>
            Final Standings
          </div>

          {standings.map((s, i) => {
            const initials = s.playerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <motion.div
                key={s.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < standings.length - 1 ? '1px solid var(--glass-border)' : 'none',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700,
                  background: i === 0 ? 'linear-gradient(135deg, #ffd700, #ffaa00)' :
                    i === 1 ? 'linear-gradient(135deg, #c0c0c0, #a0a0a0)' :
                    i === 2 ? 'linear-gradient(135deg, #cd7f32, #a0522d)' :
                    'var(--bg-tertiary)',
                  color: i < 3 ? '#000' : 'var(--text-secondary)',
                }}>
                  {s.placement}
                </div>

                <div style={{
                  width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {s.avatar ? (
                    <img src={s.avatar} alt={s.playerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: 'var(--accent-gold-dark)', color: '#000',
                      fontSize: '0.65rem', fontWeight: 700,
                    }}>
                      {initials}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, fontWeight: 500 }}>{s.playerName}</div>

                <div style={{
                  fontSize: '1rem', fontWeight: 700,
                  color: i === 0 ? 'var(--accent-gold)' : 'var(--text-primary)',
                }}>
                  {s.totalScore}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-secondary btn-lg" onClick={onBackToLobby}>
            Back to Lobby
          </button>
          <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </motion.div>
    </div>
  );
};
