import { Card, PlayedCard, Suit } from './card';
import { Player, PublicPlayer } from './player';

export enum GamePhase {
  WAITING = 'WAITING',
  DEALING = 'DEALING',
  BIDDING = 'BIDDING',
  PLAYING = 'PLAYING',
  TRICK_COMPLETE = 'TRICK_COMPLETE',
  ROUND_COMPLETE = 'ROUND_COMPLETE',
  GAME_OVER = 'GAME_OVER',
}

export interface TrickState {
  trickNumber: number;       // 1-based within the round
  leadSuit: Suit | null;
  playedCards: PlayedCard[];
  winnerId: string | null;
  currentPlayerIndex: number;
}

export interface RoundState {
  roundNumber: number;       // 1-13
  dealerIndex: number;       // Seat index of the dealer
  cardsPerPlayer: number;    // Equals roundNumber
  bids: Record<string, number>;       // playerId → bid
  bidOrder: string[];                  // Order in which players should bid
  currentBidderIndex: number;         // Index into bidOrder
  tricks: TrickState[];
  currentTrick: TrickState | null;
  tricksWon: Record<string, number>;  // playerId → tricks won this round
}

// Full game state (server-side)
export interface GameState {
  gameId: string;
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  playerOrder: string[];      // Player IDs in seat order
  currentRound: RoundState | null;
  roundNumber: number;        // Current round (1-13)
  scores: Record<string, number>;      // playerId → total score
  roundHistory: RoundResult[];
  startedAt: string;
  winnerId: string | null;
}

// What gets sent to a specific client
export interface ClientGameState {
  gameId: string;
  roomCode: string;
  phase: GamePhase;
  myHand: Card[];
  myId: string;
  players: PublicPlayer[];
  playerOrder: string[];
  currentRound: RoundState | null;
  roundNumber: number;
  scores: Record<string, number>;
  roundHistory: RoundResult[];
  winnerId: string | null;
  validCards: string[];      // IDs of cards the player can legally play
  validBids: number[];       // Legal bids for this player during bidding
}

export interface RoundResult {
  roundNumber: number;
  scores: Record<string, RoundScore>;
}

export interface RoundScore {
  bid: number;
  tricksWon: number;
  roundScore: number;
  totalScore: number;
}

export interface FinalStanding {
  playerId: string;
  playerName: string;
  avatar: string;
  totalScore: number;
  placement: number;
  roundBreakdown: RoundScore[];
}
