import React from 'react';
import { Card, SUIT_SYMBOLS, RANK_SYMBOLS, SUIT_COLORS } from '@shared/types/card';
import { motion } from 'framer-motion';

interface PlayingCardProps {
  card: Card;
  isValid?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  small?: boolean;
  animate?: boolean;
  index?: number;
  isHighlighted?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card, isValid = true, isDisabled = false, onClick, style, small, animate = true, index = 0,
  isHighlighted = false,
}) => {
  const color = SUIT_COLORS[card.suit];
  const rankSymbol = RANK_SYMBOLS[card.rank];
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  const classNames = [
    'playing-card',
    color,
    isValid && !isDisabled ? 'valid' : '',
    isDisabled ? 'disabled' : '',
    isHighlighted ? 'highlighted' : '',
  ].filter(Boolean).join(' ');

  const cardStyle: React.CSSProperties = {
    ...(small ? { width: 52, height: 74 } : {}),
    ...style,
  };

  const cardContent = (
    <div
      className={classNames}
      style={cardStyle}
      onClick={!isDisabled && isValid ? onClick : undefined}
      role="button"
      aria-label={`${rankSymbol} of ${suitSymbol}`}
      tabIndex={isValid && !isDisabled ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && isValid && !isDisabled && onClick) onClick();
      }}
    >
      <div className="card-rank">{rankSymbol}</div>
      <div className="card-suit">{suitSymbol}</div>
      <div className="card-center-suit">{suitSymbol}</div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: -190, x: 18, scale: 0.84, rotate: 3 }}
        transition={{ duration: 0.22, delay: Math.min(index * 0.018, 0.12), ease: [0.22, 0.84, 0.28, 1] }}
        style={{ display: 'inline-block' }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
};

export const CardBack: React.FC<{ small?: boolean; style?: React.CSSProperties }> = ({ small, style }) => (
  <div
    className="playing-card-back"
    style={{
      ...(small ? { width: 42, height: 60 } : {}),
      ...style,
    }}
  />
);
