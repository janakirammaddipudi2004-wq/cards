import { describe, it, expect } from 'vitest';
import { DeckManager } from '../../src/game/DeckManager';
import { Suit, Rank, SUIT_PRIORITY, RANK_PRIORITY } from '@shared/types/card';

describe('DeckManager', () => {
  it('should create 104 cards (2 decks)', () => {
    const dm = new DeckManager();
    const hands = dm.deal(1, 104);
    expect(hands[0].length).toBe(104);
  });

  it('should have exactly 2 of each card', () => {
    const dm = new DeckManager();
    const allCards = dm.deal(1, 104)[0];

    const counts: Record<string, number> = {};
    for (const card of allCards) {
      const key = `${card.suit}_${card.rank}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    // Each suit-rank combination should appear exactly twice
    const suits = [Suit.SPADES, Suit.CLUBS, Suit.HEARTS, Suit.DIAMONDS];
    const ranks = [Rank.ACE, Rank.KING, Rank.QUEEN, Rank.JACK, Rank.TEN, Rank.NINE, Rank.EIGHT, Rank.SEVEN, Rank.SIX, Rank.FIVE, Rank.FOUR, Rank.THREE, Rank.TWO];

    for (const suit of suits) {
      for (const rank of ranks) {
        const key = `${suit}_${rank}`;
        expect(counts[key]).toBe(2);
      }
    }
  });

  it('should deal correct number of cards per player', () => {
    const dm = new DeckManager();

    // Round 5, 4 players = 5 cards each
    const hands = dm.deal(4, 5);
    expect(hands.length).toBe(4);
    for (const hand of hands) {
      expect(hand.length).toBe(5);
    }
  });

  it('should deal sorted hands (by suit priority then rank)', () => {
    const dm = new DeckManager();
    const hands = dm.deal(2, 13);

    for (const hand of hands) {
      for (let i = 1; i < hand.length; i++) {
        const prev = hand[i - 1];
        const curr = hand[i];
        const suitCompare = SUIT_PRIORITY[prev.suit] - SUIT_PRIORITY[curr.suit];
        if (suitCompare === 0) {
          expect(RANK_PRIORITY[prev.rank]).toBeLessThanOrEqual(RANK_PRIORITY[curr.rank]);
        } else {
          expect(suitCompare).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('should produce different shuffles', () => {
    const dm1 = new DeckManager();
    const dm2 = new DeckManager();
    const h1 = dm1.deal(1, 52)[0].map(c => c.id);
    const h2 = dm2.deal(1, 52)[0].map(c => c.id);

    // Extremely unlikely to be identical
    let matches = 0;
    for (let i = 0; i < h1.length; i++) {
      if (h1[i] === h2[i]) matches++;
    }
    expect(matches).toBeLessThan(h1.length); // Not all the same
  });

  it('should record a cryptographic shuffle audit seed', () => {
    const dm = new DeckManager();
    dm.deal(4, 13);

    const audit = dm.getLastShuffleAudit();
    expect(audit).not.toBeNull();
    expect(audit?.algorithm).toBe('HMAC-SHA256-Fisher-Yates');
    expect(audit?.deckSize).toBe(104);
    expect(audit?.seed).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should reproduce the same deal with the same shuffle seed', () => {
    const seed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const first = new DeckManager().deal(4, 13, seed).map(hand => hand.map(card => card.id));
    const second = new DeckManager().deal(4, 13, seed).map(hand => hand.map(card => card.id));

    expect(second).toEqual(first);
  });

  it('should produce varied first-card suits across deterministic seeds', () => {
    const counts: Record<Suit, number> = {
      [Suit.SPADES]: 0,
      [Suit.CLUBS]: 0,
      [Suit.HEARTS]: 0,
      [Suit.DIAMONDS]: 0,
    };

    for (let i = 0; i < 200; i++) {
      const seed = i.toString(16).padStart(64, '0');
      const firstCard = new DeckManager().deal(4, 1, seed)[0][0];
      counts[firstCard.suit]++;
    }

    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(25);
      expect(count).toBeLessThan(75);
    }
  });

  it('should throw if too many cards requested', () => {
    const dm = new DeckManager();
    expect(() => dm.deal(10, 20)).toThrow(); // 200 > 104
  });

  it('should have unique IDs for duplicate cards', () => {
    const dm = new DeckManager();
    const allCards = dm.deal(1, 104)[0];
    const ids = allCards.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(104);
  });
});
