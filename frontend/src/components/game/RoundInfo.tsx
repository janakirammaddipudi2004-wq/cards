import React from 'react';
import { GamePhase } from '@shared/types/game';

interface RoundInfoProps {
  roundNumber: number;
  totalRounds: number;
  trickNumber: number;
  totalTricks: number;
  phase: GamePhase;
}

export const RoundInfo: React.FC<RoundInfoProps> = ({
  roundNumber, totalRounds, trickNumber, totalTricks, phase,
}) => {
  const phaseLabel = {
    [GamePhase.WAITING]: 'Waiting',
    [GamePhase.DEALING]: 'Dealing',
    [GamePhase.BIDDING]: 'Bidding',
    [GamePhase.PLAYING]: 'Playing',
    [GamePhase.TRICK_COMPLETE]: 'Trick Complete',
    [GamePhase.ROUND_COMPLETE]: 'Round Complete',
    [GamePhase.GAME_OVER]: 'Game Over',
  }[phase] || phase;

  const phaseClass = phase === GamePhase.BIDDING ? 'phase-bidding'
    : phase === GamePhase.PLAYING ? 'phase-playing' : '';

  return (
    <div className="round-info glass-strong" role="status" aria-live="polite">
      <span>Round {roundNumber} of {totalRounds}</span>
      {phase === GamePhase.PLAYING && (
        <span style={{ marginLeft: 12 }}>Trick {trickNumber} of {totalTricks}</span>
      )}
      <span className={`phase-badge ${phaseClass}`}>{phaseLabel}</span>
    </div>
  );
};
