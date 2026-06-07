import React from 'react';
import { PublicPlayer } from '@shared/types/player';
import { CardBack } from './PlayingCard';

interface PlayerSeatProps {
  player: PublicPlayer;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  isMe: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, position, isMe }) => {
  const seatClasses = [
    'player-seat',
    isMe ? 'is-me' : '',
    player.isTurn ? 'is-turn' : '',
    player.isDealer ? 'is-dealer' : '',
    !player.isConnected ? 'is-offline' : '',
  ].filter(Boolean).join(' ');

  const avatarClasses = [
    'player-avatar',
    player.isTurn ? 'active-turn' : '',
    player.isDealer ? 'dealer' : '',
    !player.isConnected ? 'disconnected' : '',
  ].filter(Boolean).join(' ');

  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={seatClasses}
      style={{
        ...position,
        transform: 'translate(-50%, -50%)',
      }}
      aria-label={`${player.name}${player.isTurn ? ' - their turn' : ''}${player.isDealer ? ' - dealer' : ''}`}
    >
      {!isMe && player.cardCount > 0 && (
        <div className="seat-card-stack" aria-label={`${player.cardCount} cards`}>
          {Array.from({ length: Math.min(player.cardCount, 5) }).map((_, i) => (
            <CardBack key={i} small style={{ width: 28, height: 40, marginLeft: i > 0 ? -16 : 0 }} />
          ))}
          {player.cardCount > 5 && (
            <span className="seat-card-count">+{player.cardCount - 5}</span>
          )}
        </div>
      )}

      <div className="player-seat-core">
        <div className="player-avatar-wrap">
          <div className={avatarClasses}>
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} />
            ) : (
              <div className="player-avatar-placeholder">{initials}</div>
            )}
          </div>

          {player.isDealer && (
            <div className="dealer-chip" title="Dealer">D</div>
          )}

          {!player.isConnected && <div className="seat-offline-dot" title="Disconnected" />}
        </div>

        <div className="player-seat-copy">
          <div className="player-name">
            {isMe ? `${player.name} (You)` : player.name}
          </div>
          <div className="player-score">{player.totalScore} pts</div>
        </div>
      </div>

      <div className="player-seat-stats">
        <span>Bid {player.bid ?? '-'}</span>
        <span>Won {player.tricksWon}</span>
      </div>
    </div>
  );
};
