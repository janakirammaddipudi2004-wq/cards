import type { FC } from 'react';
import { motion } from 'framer-motion';
import type { RoundScore } from '@shared/types/game';
import type { PublicPlayer } from '@shared/types/player';

interface RoundSummaryPanelProps {
  roundNumber: number;
  scores: Record<string, RoundScore>;
  players: PublicPlayer[];
  myId: string;
  onClose: () => void;
}

export const RoundSummaryPanel: FC<RoundSummaryPanelProps> = ({
  roundNumber,
  scores,
  players,
  myId,
  onClose,
}) => {
  const rows = players
    .map(player => ({
      player,
      score: scores[player.id],
    }))
    .filter((row): row is { player: PublicPlayer; score: RoundScore } => Boolean(row.score))
    .sort((a, b) => b.score.roundScore - a.score.roundScore || b.score.totalScore - a.score.totalScore);

  const myScore = scores[myId];

  return (
    <motion.aside
      className="round-summary-panel"
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      role="dialog"
      aria-label={`Round ${roundNumber} summary`}
    >
      <div className="round-summary-header">
        <div>
          <p className="eyebrow">Round summary</p>
          <h2>Round {roundNumber}</h2>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
      </div>

      {myScore && (
        <div className={`summary-my-result ${myScore.roundScore > 0 ? 'scored' : ''}`}>
          <span>You earned</span>
          <strong>{myScore.roundScore}</strong>
          <small>
            Bid {myScore.bid}, won {myScore.tricksWon}
          </small>
        </div>
      )}

      <div className="round-summary-table">
        {rows.map(({ player, score }) => (
          <div key={player.id} className={`round-summary-row ${player.id === myId ? 'is-me' : ''}`}>
            <div>
              <strong>{player.name}</strong>
              <span>{score.tricksWon === score.bid ? 'Exact bid' : 'Missed bid'}</span>
            </div>
            <div className="summary-stat">
              <span>Bid</span>
              <strong>{score.bid}</strong>
            </div>
            <div className="summary-stat">
              <span>Won</span>
              <strong>{score.tricksWon}</strong>
            </div>
            <div className="summary-points">
              <span>Points</span>
              <strong>{score.roundScore}</strong>
            </div>
          </div>
        ))}
      </div>
    </motion.aside>
  );
};
