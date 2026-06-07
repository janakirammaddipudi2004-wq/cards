import React from 'react';
import { PlayedCard } from '@shared/types/card';
import { PlayingCard } from './PlayingCard';
import { motion, AnimatePresence } from 'framer-motion';

interface TrickAreaProps {
  playedCards: PlayedCard[];
  playerNames: Record<string, string>;
  highlightCardId?: string;
}

export const TrickArea: React.FC<TrickAreaProps> = ({ playedCards, playerNames, highlightCardId }) => {
  return (
    <div className="trick-area" role="region" aria-label="Cards played this trick">
      <AnimatePresence>
        {playedCards.map((pc) => (
          <motion.div
            key={`${pc.card.id}-${pc.playOrder}`}
            className={`trick-card ${pc.card.id === highlightCardId ? 'winning' : ''}`}
            initial={{ opacity: 0, scale: 0.96, y: 64, x: -18 + pc.playOrder * 10, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -26 }}
            transition={{ duration: 0.24, ease: [0.22, 0.84, 0.28, 1] }}
          >
            <PlayingCard
              card={pc.card}
              isDisabled
              animate={false}
              small
              isHighlighted={pc.card.id === highlightCardId}
            />
            <div className="trick-card-player">
              {playerNames[pc.playerId] || 'Unknown'}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
