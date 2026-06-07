import { describe, it, expect } from 'vitest';
import { TrickEvaluator } from '../../src/game/TrickEvaluator';
import { PlayedCard, Suit, Rank } from '@shared/types/card';

function makePlayedCard(suit: Suit, rank: Rank, playerId: string, playOrder: number): PlayedCard {
  return {
    card: { id: `${suit}_${rank}_0`, suit, rank },
    playerId,
    playOrder,
  };
}

describe('TrickEvaluator', () => {
  it('should determine winner by suit priority (spades wins)', () => {
    const cards: PlayedCard[] = [
      makePlayedCard(Suit.DIAMONDS, Rank.ACE, 'p1', 0),   // A♦
      makePlayedCard(Suit.HEARTS, Rank.ACE, 'p2', 1),     // A♥
      makePlayedCard(Suit.SPADES, Rank.TWO, 'p3', 2),     // 2♠
    ];

    const winner = TrickEvaluator.evaluate(cards);
    expect(winner.playerId).toBe('p3'); // 2♠ wins because Spades > all
  });

  it('should use rank when suits match', () => {
    const cards: PlayedCard[] = [
      makePlayedCard(Suit.SPADES, Rank.KING, 'p1', 0),
      makePlayedCard(Suit.SPADES, Rank.ACE, 'p2', 1),
      makePlayedCard(Suit.SPADES, Rank.QUEEN, 'p3', 2),
    ];

    const winner = TrickEvaluator.evaluate(cards);
    expect(winner.playerId).toBe('p2'); // A♠ > K♠ > Q♠
  });

  it('should make later identical card win', () => {
    const cards: PlayedCard[] = [
      makePlayedCard(Suit.SPADES, Rank.ACE, 'p1', 0),
      makePlayedCard(Suit.SPADES, Rank.ACE, 'p2', 1),
    ];

    const winner = TrickEvaluator.evaluate(cards);
    expect(winner.playerId).toBe('p2'); // Second A♠ wins
  });

  it('should handle all different suits', () => {
    const cards: PlayedCard[] = [
      makePlayedCard(Suit.DIAMONDS, Rank.ACE, 'p1', 0),
      makePlayedCard(Suit.CLUBS, Rank.ACE, 'p2', 1),
      makePlayedCard(Suit.HEARTS, Rank.ACE, 'p3', 2),
    ];

    const winner = TrickEvaluator.evaluate(cards);
    expect(winner.playerId).toBe('p2'); // Clubs > Hearts > Diamonds
  });

  it('should handle the example: 2♠ beats A♣ and A♥', () => {
    const cards: PlayedCard[] = [
      makePlayedCard(Suit.SPADES, Rank.TWO, 'p1', 0),
      makePlayedCard(Suit.CLUBS, Rank.ACE, 'p2', 1),
      makePlayedCard(Suit.HEARTS, Rank.ACE, 'p3', 2),
    ];

    const winner = TrickEvaluator.evaluate(cards);
    expect(winner.playerId).toBe('p1'); // 2♠ > A♣ > A♥
  });

  it('suit priority order: SPADES > CLUBS > HEARTS > DIAMONDS', () => {
    // Clubs beats Hearts
    expect(TrickEvaluator.beats(
      makePlayedCard(Suit.CLUBS, Rank.TWO, 'a', 1),
      makePlayedCard(Suit.HEARTS, Rank.ACE, 'b', 0)
    )).toBe(true);

    // Hearts beats Diamonds
    expect(TrickEvaluator.beats(
      makePlayedCard(Suit.HEARTS, Rank.TWO, 'a', 1),
      makePlayedCard(Suit.DIAMONDS, Rank.ACE, 'b', 0)
    )).toBe(true);

    // Diamonds doesn't beat Spades
    expect(TrickEvaluator.beats(
      makePlayedCard(Suit.DIAMONDS, Rank.ACE, 'a', 1),
      makePlayedCard(Suit.SPADES, Rank.TWO, 'b', 0)
    )).toBe(false);
  });

  it('should throw on empty trick', () => {
    expect(() => TrickEvaluator.evaluate([])).toThrow();
  });

  it('should work with single card', () => {
    const cards: PlayedCard[] = [
      makePlayedCard(Suit.DIAMONDS, Rank.THREE, 'p1', 0),
    ];
    expect(TrickEvaluator.evaluate(cards).playerId).toBe('p1');
  });
});
