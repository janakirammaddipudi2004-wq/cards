import React from 'react';
import { PublicPlayer } from '@shared/types/player';

interface ScoreBoardProps {
  players: PublicPlayer[];
  roundNumber: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ players, roundNumber }) => {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);

  const rankClass = (index: number) => {
    if (index === 0) return 'scoreboard-rank first';
    if (index === 1) return 'scoreboard-rank second';
    if (index === 2) return 'scoreboard-rank third';
    return 'scoreboard-rank';
  };

  return (
    <div className="scoreboard glass-strong" role="complementary" aria-label="Scoreboard">
      <div className="scoreboard-header">
        Leaderboard — Round {roundNumber}
      </div>

      {sorted.map((player, index) => {
        const initials = player.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        return (
          <div key={player.id} className="scoreboard-row">
            <div className={rankClass(index)} style={
              index > 2 ? { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : undefined
            }>
              {index + 1}
            </div>

            <div className="scoreboard-avatar">
              {player.avatar ? (
                <img src={player.avatar} alt={player.name} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'var(--accent-gold-dark)', color: '#000',
                  fontSize: '0.6rem', fontWeight: 700,
                }}>
                  {initials}
                </div>
              )}
            </div>

            <div className="scoreboard-name">
              {player.name}
              {player.isDealer && <span style={{ color: 'var(--accent-gold)', marginLeft: 4, fontSize: '0.6rem' }}>D</span>}
            </div>

            <div className="scoreboard-score">{player.totalScore}</div>
          </div>
        );
      })}
    </div>
  );
};
