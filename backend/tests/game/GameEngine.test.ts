import { describe, expect, it } from 'vitest';
import { GameEngine } from '../../src/game/GameEngine';
import { GamePhase, RoundState, TrickState } from '@shared/types/game';
import { Card, Rank, Suit } from '@shared/types/card';

const testPlayers = [
  { id: 'p1', name: 'Alice', avatar: '', email: 'alice@example.com' },
  { id: 'p2', name: 'Bob', avatar: '', email: 'bob@example.com' },
  { id: 'p3', name: 'Cara', avatar: '', email: 'cara@example.com' },
];

function card(id: string, suit: Suit, rank: Rank): Card {
  return { id, suit, rank };
}

function makeRoundState(overrides: Partial<RoundState> = {}): RoundState {
  const currentTrick: TrickState = {
    trickNumber: 1,
    leadSuit: null,
    playedCards: [],
    winnerId: null,
    currentPlayerIndex: 0,
  };

  return {
    roundNumber: 2,
    dealerIndex: 2,
    cardsPerPlayer: 2,
    bids: { p1: 0, p2: 0, p3: 0 },
    bidOrder: ['p1', 'p2', 'p3'],
    currentBidderIndex: 3,
    tricks: [],
    currentTrick,
    tricksWon: { p1: 0, p2: 0, p3: 0 },
    ...overrides,
  };
}

function bidCurrentRound(engine: GameEngine): void {
  while (engine.getPhase() === GamePhase.BIDDING) {
    const round = engine.getFullState().currentRound!;
    const bidderId = round.bidOrder[round.currentBidderIndex];
    const validBids = engine.getValidBids(bidderId);
    expect(validBids.length).toBeGreaterThan(0);
    const result = engine.placeBid(bidderId, validBids[0]);
    expect(result.success).toBe(true);
  }
}

function playCurrentRound(engine: GameEngine): void {
  while (engine.getPhase() === GamePhase.PLAYING) {
    const player = engine.getPlayers().find(candidate => candidate.isTurn);
    expect(player).toBeDefined();
    const validCards = engine.getValidCards(player!.id);
    expect(validCards.length).toBeGreaterThan(0);
    const result = engine.playCard(player!.id, validCards[0]);
    expect(result.success).toBe(true);
  }
}

describe('GameEngine', () => {
  it('enforces dealer-last bidding and dealer bid restriction', () => {
    const engine = new GameEngine('game-1', 'ROOM01', testPlayers);
    engine.startGame();

    const round = engine.getFullState().currentRound!;
    expect(round.dealerIndex).toBe(0);
    expect(round.bidOrder).toEqual(['p2', 'p3', 'p1']);

    expect(engine.placeBid('p1', 0).success).toBe(false);
    expect(engine.placeBid('p2', 0).success).toBe(true);
    expect(engine.placeBid('p3', 0).success).toBe(true);
    expect(engine.placeBid('p1', 1).success).toBe(false);
    expect(engine.placeBid('p1', 0).success).toBe(true);

    expect(engine.getPhase()).toBe(GamePhase.PLAYING);
    expect(engine.getCurrentTrick()?.currentPlayerIndex).toBe(1);
  });

  it('validates card ownership, turn order, and follow suit on the server', () => {
    const engine = new GameEngine('game-2', 'ROOM02', testPlayers);
    engine.startGame();

    const state = engine.getFullState();
    state.phase = GamePhase.PLAYING;
    state.currentRound = makeRoundState();
    state.players[0].hand = [card('p1-heart-ace', Suit.HEARTS, Rank.ACE)];
    state.players[1].hand = [
      card('p2-heart-two', Suit.HEARTS, Rank.TWO),
      card('p2-spade-ace', Suit.SPADES, Rank.ACE),
    ];
    state.players[2].hand = [card('p3-club-ace', Suit.CLUBS, Rank.ACE)];
    state.players.forEach((player, index) => {
      player.isTurn = index === 0;
    });

    expect(engine.playCard('p2', 'p2-heart-two').success).toBe(false);
    expect(engine.playCard('p1', 'not-owned').success).toBe(false);
    expect(engine.playCard('p1', 'p1-heart-ace').success).toBe(true);
    expect(engine.getValidCards('p2')).toEqual(['p2-heart-two']);
    expect(engine.playCard('p2', 'p2-spade-ace').success).toBe(false);
    expect(engine.playCard('p2', 'p2-heart-two').success).toBe(true);
  });

  it('keeps each client synchronized without leaking other hands', () => {
    const engine = new GameEngine('game-3', 'ROOM03', testPlayers);
    engine.startGame();

    const p1State = engine.getClientState('p1');
    const p2State = engine.getClientState('p2');

    expect(p1State.myHand.length).toBe(1);
    expect(p2State.myHand.length).toBe(1);
    expect(p1State.myHand[0].id).not.toBe(p2State.myHand[0].id);

    for (const publicPlayer of p1State.players) {
      expect(publicPlayer.cardCount).toBe(1);
      expect('hand' in publicPlayer).toBe(false);
    }

    expect(p1State.currentRound?.roundNumber).toBe(p2State.currentRound?.roundNumber);
    expect(p1State.validBids).toEqual([]);
    expect(p2State.validBids).toEqual([0, 1]);
  });

  it('progresses through exactly 13 rounds and then ends the game', () => {
    const engine = new GameEngine('game-4', 'ROOM04', testPlayers);
    engine.startGame();

    for (let roundNumber = 1; roundNumber <= 13; roundNumber++) {
      expect(engine.getRoundNumber()).toBe(roundNumber);
      expect(engine.getFullState().currentRound?.cardsPerPlayer).toBe(roundNumber);

      bidCurrentRound(engine);
      playCurrentRound(engine);

      if (roundNumber < 13) {
        expect(engine.getPhase()).toBe(GamePhase.ROUND_COMPLETE);
        engine.advanceToNextRound();
      }
    }

    expect(engine.getPhase()).toBe(GamePhase.GAME_OVER);
    expect(engine.getRoundHistory()).toHaveLength(13);
    expect(engine.getFinalStandings()).toHaveLength(3);
  });
});
