import type { FC } from 'react';
import { motion } from 'framer-motion';
import type { Card, PlayedCard } from '@shared/types/card';
import { PlayingCard } from './PlayingCard';

interface TrickCelebrationOverlayProps {
  winnerName: string;
  trickNumber: number;
  playedCards: PlayedCard[];
  winningCard: Card;
  playerNames: Record<string, string>;
  winnerPosition: { top?: string; left?: string };
}

export const TrickCelebrationOverlay: FC<TrickCelebrationOverlayProps> = ({
  winnerName,
  trickNumber,
  playedCards,
  winningCard,
  playerNames,
  winnerPosition,
}) => {
  const targetLeft = winnerPosition.left || '50%';
  const targetTop = winnerPosition.top || '50%';

  return (
    <motion.div
      className="trick-celebration"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
    >
      <div className="collect-target" style={{ left: targetLeft, top: targetTop }} aria-hidden="true" />

      <div className="collect-card-layer" aria-label="Cards collected by trick winner">
        {playedCards.map((played, index) => {
          const isWinner = played.card.id === winningCard.id;
          const startOffset = (index - (playedCards.length - 1) / 2) * 76;
          return (
            <motion.div
              key={`${played.card.id}-${played.playOrder}`}
              className="collect-card"
              initial={{
                left: '50%',
                top: '50%',
                x: startOffset,
                y: 8,
                rotate: (index - 1) * 5,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                left: targetLeft,
                top: targetTop,
                x: 0,
                y: 0,
                rotate: isWinner ? 0 : -8 + index * 4,
                scale: 0.18,
                opacity: 0,
              }}
              transition={{
                delay: 0.42 + index * 0.07,
                duration: 0.82,
                ease: [0.22, 0.9, 0.18, 1],
              }}
            >
              <PlayingCard card={played.card} isDisabled animate={false} small isHighlighted={isWinner} />
              <span>{playerNames[played.playerId] || 'Player'}</span>
            </motion.div>
          );
        })}
      </div>

      <span className="sr-only">{winnerName} wins trick {trickNumber}</span>
    </motion.div>
  );
};
