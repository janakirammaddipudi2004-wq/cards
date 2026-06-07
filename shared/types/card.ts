// Card types for 2-deck trick-taking game
// Suit priority: ♠ > ♣ > ♥ > ♦
// Rank priority: A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2

export enum Suit {
  SPADES = 'SPADES',
  CLUBS = 'CLUBS',
  HEARTS = 'HEARTS',
  DIAMONDS = 'DIAMONDS',
}

export enum Rank {
  ACE = 'ACE',
  KING = 'KING',
  QUEEN = 'QUEEN',
  JACK = 'JACK',
  TEN = 'TEN',
  NINE = 'NINE',
  EIGHT = 'EIGHT',
  SEVEN = 'SEVEN',
  SIX = 'SIX',
  FIVE = 'FIVE',
  FOUR = 'FOUR',
  THREE = 'THREE',
  TWO = 'TWO',
}

export interface Card {
  id: string;        // Unique ID (e.g., "SPADES_ACE_0", "SPADES_ACE_1" for duplicates)
  suit: Suit;
  rank: Rank;
}

export interface PlayedCard {
  card: Card;
  playerId: string;
  playOrder: number; // 0-based order within the trick
}

// Priority maps — lower index = higher priority
export const SUIT_PRIORITY: Record<Suit, number> = {
  [Suit.SPADES]: 0,
  [Suit.CLUBS]: 1,
  [Suit.HEARTS]: 2,
  [Suit.DIAMONDS]: 3,
};

export const RANK_PRIORITY: Record<Rank, number> = {
  [Rank.ACE]: 0,
  [Rank.KING]: 1,
  [Rank.QUEEN]: 2,
  [Rank.JACK]: 3,
  [Rank.TEN]: 4,
  [Rank.NINE]: 5,
  [Rank.EIGHT]: 6,
  [Rank.SEVEN]: 7,
  [Rank.SIX]: 8,
  [Rank.FIVE]: 9,
  [Rank.FOUR]: 10,
  [Rank.THREE]: 11,
  [Rank.TWO]: 12,
};

// Display helpers
export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.SPADES]: '♠',
  [Suit.CLUBS]: '♣',
  [Suit.HEARTS]: '♥',
  [Suit.DIAMONDS]: '♦',
};

export const RANK_SYMBOLS: Record<Rank, string> = {
  [Rank.ACE]: 'A',
  [Rank.KING]: 'K',
  [Rank.QUEEN]: 'Q',
  [Rank.JACK]: 'J',
  [Rank.TEN]: '10',
  [Rank.NINE]: '9',
  [Rank.EIGHT]: '8',
  [Rank.SEVEN]: '7',
  [Rank.SIX]: '6',
  [Rank.FIVE]: '5',
  [Rank.FOUR]: '4',
  [Rank.THREE]: '3',
  [Rank.TWO]: '2',
};

export const SUIT_COLORS: Record<Suit, 'black' | 'red'> = {
  [Suit.SPADES]: 'black',
  [Suit.CLUBS]: 'black',
  [Suit.HEARTS]: 'red',
  [Suit.DIAMONDS]: 'red',
};
