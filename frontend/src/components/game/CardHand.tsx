import React from 'react';
import { Card } from '@shared/types/card';
import { PlayingCard } from './PlayingCard';
import { AnimatePresence } from 'framer-motion';

interface CardHandProps {
  cards: Card[];
  validCardIds: string[];
  onPlayCard: (cardId: string) => void;
  disabled?: boolean;
}

export const CardHand: React.FC<CardHandProps> = ({
  cards, validCardIds, onPlayCard, disabled = false,
}) => {
  return (
    <div className="card-hand" role="group" aria-label="Your cards">
      <AnimatePresence mode="popLayout">
        {cards.map((card, index) => {
          const isValid = validCardIds.includes(card.id);
          return (
            <PlayingCard
              key={card.id}
              card={card}
              isValid={isValid}
              isDisabled={disabled || !isValid}
              onClick={() => onPlayCard(card.id)}
              index={index}
              animate={true}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};
