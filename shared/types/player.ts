import { Card } from './card';

export interface Player {
  id: string;
  name: string;
  email: string;
  avatar: string;
  seatIndex: number;
  hand: Card[];         // Only visible to the player themselves
  bid: number | null;
  tricksWon: number;
  totalScore: number;
  roundScores: number[];
  isDealer: boolean;
  isConnected: boolean;
  isTurn: boolean;
}

// What other players see (no hand details)
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  seatIndex: number;
  cardCount: number;     // Number of cards in hand (not the actual cards)
  bid: number | null;
  tricksWon: number;
  totalScore: number;
  roundScores: number[];
  isDealer: boolean;
  isConnected: boolean;
  isTurn: boolean;
}

export interface PlayerProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  highestScore: number;
  totalPoints: number;
  recentMatches: MatchSummary[];
}

export interface MatchSummary {
  gameId: string;
  roomCode: string;
  date: string;
  playerCount: number;
  placement: number;
  score: number;
  won: boolean;
}
