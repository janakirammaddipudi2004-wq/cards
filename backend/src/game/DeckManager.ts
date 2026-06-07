import { createHmac, randomBytes } from 'crypto';
import { Card, Suit, Rank, SUIT_PRIORITY, RANK_PRIORITY } from '../../../shared/types/card';
import { NUM_DECKS } from '../../../shared/constants';

const ALL_SUITS: Suit[] = [Suit.SPADES, Suit.CLUBS, Suit.HEARTS, Suit.DIAMONDS];
const ALL_RANKS: Rank[] = [
  Rank.ACE, Rank.KING, Rank.QUEEN, Rank.JACK,
  Rank.TEN, Rank.NINE, Rank.EIGHT, Rank.SEVEN,
  Rank.SIX, Rank.FIVE, Rank.FOUR, Rank.THREE, Rank.TWO,
];

export interface ShuffleAudit {
  seed: string;
  algorithm: 'HMAC-SHA256-Fisher-Yates';
  deckSize: number;
}

class SeededCryptoRandom {
  private readonly key: Buffer;
  private counter = 0;
  private buffer = Buffer.alloc(0);
  private offset = 0;

  constructor(seedHex: string) {
    if (!/^[0-9a-f]{64}$/i.test(seedHex)) {
      throw new Error('Shuffle seed must be a 256-bit hex string');
    }
    this.key = Buffer.from(seedHex, 'hex');
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error('Random bound must be a positive integer');
    }

    const range = 0x1_0000_0000;
    const limit = range - (range % maxExclusive);

    let value: number;
    do {
      value = this.nextUInt32();
    } while (value >= limit);

    return value % maxExclusive;
  }

  private nextUInt32(): number {
    if (this.offset + 4 > this.buffer.length) {
      this.buffer = createHmac('sha256', this.key)
        .update(`cards-shuffle:${this.counter++}`)
        .digest();
      this.offset = 0;
    }

    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }
}

export class DeckManager {
  private cards: Card[] = [];
  private lastShuffleAudit: ShuffleAudit | null = null;

  constructor() {
    this.createDeck();
  }

  /**
   * Creates 2 full standard decks (104 cards total).
   * Each card gets a unique ID to distinguish duplicates.
   */
  private createDeck(): void {
    this.cards = [];
    for (let deckIndex = 0; deckIndex < NUM_DECKS; deckIndex++) {
      for (const suit of ALL_SUITS) {
        for (const rank of ALL_RANKS) {
          this.cards.push({
            id: `${suit}_${rank}_${deckIndex}`,
            suit,
            rank,
          });
        }
      }
    }
  }

  static generateShuffleSeed(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Fisher-Yates shuffle driven by a cryptographically seeded HMAC stream.
   * Rejection sampling avoids modulo bias for every draw.
   */
  shuffle(seed: string = DeckManager.generateShuffleSeed()): ShuffleAudit {
    const rng = new SeededCryptoRandom(seed);

    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }

    this.lastShuffleAudit = {
      seed,
      algorithm: 'HMAC-SHA256-Fisher-Yates',
      deckSize: this.cards.length,
    };

    return this.lastShuffleAudit;
  }

  /**
   * Deal cards to players for a given round.
   * @param playerCount Number of players
   * @param cardsPerPlayer Cards each player should receive (= round number)
   * @returns Array of hands, one per player
   */
  deal(playerCount: number, cardsPerPlayer: number, seed?: string): Card[][] {
    this.createDeck();
    this.shuffle(seed);

    const totalNeeded = playerCount * cardsPerPlayer;
    if (totalNeeded > this.cards.length) {
      throw new Error(`Cannot deal ${totalNeeded} cards from ${this.cards.length} card deck`);
    }

    const hands: Card[][] = [];
    for (let p = 0; p < playerCount; p++) {
      hands.push([]);
    }

    // Deal one card at a time in rotation (like a real dealer)
    for (let c = 0; c < cardsPerPlayer; c++) {
      for (let p = 0; p < playerCount; p++) {
        const card = this.cards.pop()!;
        hands[p].push(card);
      }
    }

    // Sort each hand by suit priority then rank priority for player convenience
    for (const hand of hands) {
      hand.sort((a, b) => {
        const suitDiff = SUIT_PRIORITY[a.suit] - SUIT_PRIORITY[b.suit];
        if (suitDiff !== 0) return suitDiff;
        return RANK_PRIORITY[a.rank] - RANK_PRIORITY[b.rank];
      });
    }

    return hands;
  }

  getCardCount(): number {
    return this.cards.length;
  }

  getLastShuffleAudit(): ShuffleAudit | null {
    return this.lastShuffleAudit;
  }
}
