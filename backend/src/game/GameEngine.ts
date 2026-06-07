import { Card } from '../../../shared/types/card';
import { GamePhase, GameState, TrickState, RoundResult, RoundScore, ClientGameState, FinalStanding } from '../../../shared/types/game';
import { Player, PublicPlayer } from '../../../shared/types/player';
import { TOTAL_ROUNDS } from '../../../shared/constants';
import { DeckManager } from './DeckManager';
import { TrickEvaluator } from './TrickEvaluator';
import { BidValidator } from './BidValidator';
import { ScoreCalculator } from './ScoreCalculator';
import { logger } from '../utils/logger';

export class GameEngine {
  private state: GameState;
  private deckManager: DeckManager;
  private playerHands: Map<string, Card[]> = new Map();

  constructor(gameId: string, roomCode: string, players: Array<{ id: string; name: string; avatar: string; email: string }>) {
    this.deckManager = new DeckManager();

    const gamePlayers: Player[] = players.map((p, index) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      avatar: p.avatar,
      seatIndex: index,
      hand: [],
      bid: null,
      tricksWon: 0,
      totalScore: 0,
      roundScores: [],
      isDealer: index === 0, // First dealer is player at seat 0
      isConnected: true,
      isTurn: false,
    }));

    this.state = {
      gameId,
      roomCode,
      phase: GamePhase.WAITING,
      players: gamePlayers,
      playerOrder: gamePlayers.map(p => p.id),
      currentRound: null,
      roundNumber: 0,
      scores: Object.fromEntries(gamePlayers.map(p => [p.id, 0])),
      roundHistory: [],
      startedAt: new Date().toISOString(),
      winnerId: null,
    };
  }

  // ─── Game Lifecycle ────────────────────────────────────────────────

  startGame(): void {
    if (this.state.phase !== GamePhase.WAITING) {
      throw new Error('Game already started');
    }
    logger.info(`Game ${this.state.gameId} starting with ${this.state.players.length} players`);
    this.startNextRound();
  }

  private startNextRound(): void {
    this.state.roundNumber++;
    const roundNumber = this.state.roundNumber;

    if (roundNumber > TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

    // Rotate dealer
    const dealerIndex = (roundNumber - 1) % this.state.players.length;
    this.state.players.forEach((p, i) => {
      p.isDealer = i === dealerIndex;
      p.bid = null;
      p.tricksWon = 0;
      p.isTurn = false;
    });

    // Deal cards
    const hands = this.deckManager.deal(this.state.players.length, roundNumber);
    const shuffleAudit = this.deckManager.getLastShuffleAudit();
    if (shuffleAudit) {
      logger.info(
        `Round ${roundNumber}: shuffled ${shuffleAudit.deckSize}-card deck with ${shuffleAudit.algorithm}; seed=${shuffleAudit.seed}`
      );
    }

    this.state.players.forEach((player, i) => {
      player.hand = hands[i];
      this.playerHands.set(player.id, hands[i]);
    });

    // Build bid order: starts after dealer, wraps around, dealer last
    const bidOrder: string[] = [];
    for (let i = 1; i <= this.state.players.length; i++) {
      const idx = (dealerIndex + i) % this.state.players.length;
      bidOrder.push(this.state.players[idx].id);
    }

    this.state.currentRound = {
      roundNumber,
      dealerIndex,
      cardsPerPlayer: roundNumber,
      bids: {},
      bidOrder,
      currentBidderIndex: 0,
      tricks: [],
      currentTrick: null,
      tricksWon: Object.fromEntries(this.state.players.map(p => [p.id, 0])),
    };

    // Set first bidder's turn
    const firstBidderId = bidOrder[0];
    this.getPlayer(firstBidderId).isTurn = true;

    this.state.phase = GamePhase.BIDDING;
    logger.info(`Round ${roundNumber}: Dealing ${roundNumber} cards. Dealer: seat ${dealerIndex}`);
  }

  // ─── Bidding ───────────────────────────────────────────────────────

  placeBid(playerId: string, bid: number): { success: boolean; error?: string } {
    if (this.state.phase !== GamePhase.BIDDING) {
      return { success: false, error: 'Not in bidding phase' };
    }

    const round = this.state.currentRound!;
    const expectedBidderId = round.bidOrder[round.currentBidderIndex];

    if (playerId !== expectedBidderId) {
      return { success: false, error: 'Not your turn to bid' };
    }

    if (round.bids[playerId] !== undefined) {
      return { success: false, error: 'You have already bid' };
    }

    const player = this.getPlayer(playerId);
    const isDealer = player.isDealer;
    const existingBids = Object.values(round.bids);

    const validation = BidValidator.validate(bid, round.roundNumber, isDealer, existingBids);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Place the bid
    round.bids[playerId] = bid;
    player.bid = bid;
    player.isTurn = false;

    round.currentBidderIndex++;

    logger.info(`Round ${round.roundNumber}: ${player.name} bids ${bid}`);

    // Check if all bids are in
    if (round.currentBidderIndex >= round.bidOrder.length) {
      this.startPlayingPhase();
    } else {
      // Next bidder's turn
      const nextBidderId = round.bidOrder[round.currentBidderIndex];
      this.getPlayer(nextBidderId).isTurn = true;
    }

    return { success: true };
  }

  getValidBids(playerId: string): number[] {
    const round = this.state.currentRound;
    if (!round || this.state.phase !== GamePhase.BIDDING) return [];
    if (round.bidOrder[round.currentBidderIndex] !== playerId) return [];

    const player = this.getPlayer(playerId);
    const existingBids = Object.values(round.bids);
    return BidValidator.getValidBids(round.roundNumber, player.isDealer, existingBids);
  }

  // ─── Playing ───────────────────────────────────────────────────────

  private startPlayingPhase(): void {
    const round = this.state.currentRound!;

    // First player is the one after the dealer
    const firstPlayerIndex = (round.dealerIndex + 1) % this.state.players.length;
    const firstPlayerId = this.state.players[firstPlayerIndex].id;

    this.startNewTrick(firstPlayerId);
    this.state.phase = GamePhase.PLAYING;
    logger.info(`Round ${round.roundNumber}: Playing phase started. First player: ${this.getPlayer(firstPlayerId).name}`);
  }

  private startNewTrick(startingPlayerId: string): void {
    const round = this.state.currentRound!;
    const trickNumber = round.tricks.length + 1;

    // Find the starting player's index in the player array
    const startingPlayerIndex = this.state.players.findIndex(p => p.id === startingPlayerId);

    round.currentTrick = {
      trickNumber,
      leadSuit: null,
      playedCards: [],
      winnerId: null,
      currentPlayerIndex: startingPlayerIndex,
    };

    // Set turn
    this.state.players.forEach(p => { p.isTurn = false; });
    this.state.players[startingPlayerIndex].isTurn = true;
  }

  playCard(playerId: string, cardId: string): { success: boolean; error?: string; trickComplete?: boolean; roundComplete?: boolean } {
    if (this.state.phase !== GamePhase.PLAYING) {
      return { success: false, error: 'Not in playing phase' };
    }

    const round = this.state.currentRound!;
    const trick = round.currentTrick!;
    const player = this.getPlayer(playerId);

    // Verify it's this player's turn
    const expectedPlayer = this.state.players[trick.currentPlayerIndex];
    if (expectedPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn to play' };
    }

    // Find the card in the player's hand
    const hand = player.hand;
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in your hand' };
    }

    const card = hand[cardIndex];

    // Follow-suit validation
    if (trick.leadSuit) {
      const hasSuit = hand.some(c => c.suit === trick.leadSuit);
      if (hasSuit && card.suit !== trick.leadSuit) {
        return { success: false, error: `You must follow suit (${trick.leadSuit})` };
      }
    }

    // Play the card
    if (!trick.leadSuit) {
      trick.leadSuit = card.suit;
    }

    trick.playedCards.push({
      card,
      playerId,
      playOrder: trick.playedCards.length,
    });

    // Remove from hand
    hand.splice(cardIndex, 1);

    player.isTurn = false;

    logger.info(`Round ${round.roundNumber}, Trick ${trick.trickNumber}: ${player.name} plays ${card.rank} of ${card.suit}`);

    // Check if trick is complete
    if (trick.playedCards.length === this.state.players.length) {
      return this.completeTrick();
    }

    // Next player's turn
    const nextPlayerIndex = (trick.currentPlayerIndex + 1) % this.state.players.length;
    trick.currentPlayerIndex = nextPlayerIndex;
    this.state.players[nextPlayerIndex].isTurn = true;

    return { success: true };
  }

  /**
   * Get the list of card IDs that the player can legally play.
   */
  getValidCards(playerId: string): string[] {
    if (this.state.phase !== GamePhase.PLAYING) return [];

    const trick = this.state.currentRound?.currentTrick;
    if (!trick) return [];

    const player = this.getPlayer(playerId);
    const hand = player.hand;

    if (!trick.leadSuit || trick.playedCards.length === 0) {
      // Leading the trick — can play any card
      return hand.map(c => c.id);
    }

    // Must follow suit if possible
    const suitCards = hand.filter(c => c.suit === trick.leadSuit);
    if (suitCards.length > 0) {
      return suitCards.map(c => c.id);
    }

    // No matching suit — can play anything
    return hand.map(c => c.id);
  }

  private completeTrick(): { success: boolean; trickComplete: boolean; roundComplete?: boolean } {
    const round = this.state.currentRound!;
    const trick = round.currentTrick!;

    // Determine winner
    const winner = TrickEvaluator.evaluate(trick.playedCards);
    trick.winnerId = winner.playerId;

    // Update tricks won
    round.tricksWon[winner.playerId] = (round.tricksWon[winner.playerId] || 0) + 1;
    this.getPlayer(winner.playerId).tricksWon++;

    logger.info(`Round ${round.roundNumber}, Trick ${trick.trickNumber}: ${this.getPlayer(winner.playerId).name} wins!`);

    // Archive the trick
    round.tricks.push({ ...trick });

    // Check if round is complete
    if (round.tricks.length >= round.cardsPerPlayer) {
      this.completeRound();
      return { success: true, trickComplete: true, roundComplete: true };
    }

    // Start next trick — winner leads
    this.startNewTrick(winner.playerId);

    return { success: true, trickComplete: true };
  }

  private completeRound(): void {
    const round = this.state.currentRound!;

    // Calculate scores
    const roundScores = ScoreCalculator.calculateRoundScores(round.bids, round.tricksWon);

    // Update player scores
    const roundResult: Record<string, RoundScore> = {};
    for (const player of this.state.players) {
      const roundScore = roundScores[player.id] || 0;
      player.totalScore += roundScore;
      this.state.scores[player.id] = player.totalScore;

      const rs: RoundScore = {
        bid: round.bids[player.id] || 0,
        tricksWon: round.tricksWon[player.id] || 0,
        roundScore,
        totalScore: player.totalScore,
      };
      player.roundScores.push(roundScore);
      roundResult[player.id] = rs;
    }

    this.state.roundHistory.push({
      roundNumber: round.roundNumber,
      scores: roundResult,
    });

    logger.info(`Round ${round.roundNumber} complete. Scores: ${JSON.stringify(roundScores)}`);

    if (round.roundNumber >= TOTAL_ROUNDS) {
      this.endGame();
      return;
    }

    this.state.phase = GamePhase.ROUND_COMPLETE;
  }

  advanceToNextRound(): void {
    if (this.state.phase !== GamePhase.ROUND_COMPLETE) {
      throw new Error('Cannot advance: not in ROUND_COMPLETE phase');
    }
    this.startNextRound();
  }

  private endGame(): void {
    // Find winner
    const sorted = [...this.state.players].sort((a, b) => b.totalScore - a.totalScore);
    this.state.winnerId = sorted[0].id;
    this.state.phase = GamePhase.GAME_OVER;
    logger.info(`Game ${this.state.gameId} over! Winner: ${sorted[0].name} with ${sorted[0].totalScore} points`);
  }

  // ─── State Getters ─────────────────────────────────────────────────

  getFullState(): GameState {
    return this.state;
  }

  /**
   * Get the state view for a specific player.
   * Only shows their own hand; other players show card count only.
   */
  getClientState(playerId: string): ClientGameState {
    const player = this.state.players.find(p => p.id === playerId);
    const myHand = player ? [...player.hand] : [];

    const publicPlayers: PublicPlayer[] = this.state.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      seatIndex: p.seatIndex,
      cardCount: p.hand.length,
      bid: p.bid,
      tricksWon: p.tricksWon,
      totalScore: p.totalScore,
      roundScores: p.roundScores,
      isDealer: p.isDealer,
      isConnected: p.isConnected,
      isTurn: p.isTurn,
    }));

    return {
      gameId: this.state.gameId,
      roomCode: this.state.roomCode,
      phase: this.state.phase,
      myHand,
      myId: playerId,
      players: publicPlayers,
      playerOrder: this.state.playerOrder,
      currentRound: this.state.currentRound ? {
        ...this.state.currentRound,
      } : null,
      roundNumber: this.state.roundNumber,
      scores: { ...this.state.scores },
      roundHistory: this.state.roundHistory,
      winnerId: this.state.winnerId,
      validCards: this.getValidCards(playerId),
      validBids: this.getValidBids(playerId),
    };
  }

  getFinalStandings(): FinalStanding[] {
    return ScoreCalculator.calculateFinalStandings(
      this.state.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        totalScore: p.totalScore,
        roundScores: this.state.roundHistory.map(rh => ({
          bid: rh.scores[p.id]?.bid || 0,
          tricksWon: rh.scores[p.id]?.tricksWon || 0,
          roundScore: rh.scores[p.id]?.roundScore || 0,
          totalScore: rh.scores[p.id]?.totalScore || 0,
        })),
      }))
    );
  }

  // ─── Player Management ─────────────────────────────────────────────

  private getPlayer(playerId: string): Player {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    return player;
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = connected;
      logger.info(`Player ${player.name} ${connected ? 'reconnected' : 'disconnected'}`);
    }
  }

  getPhase(): GamePhase {
    return this.state.phase;
  }

  getRoundNumber(): number {
    return this.state.roundNumber;
  }

  getPlayers(): Player[] {
    return this.state.players;
  }

  getCurrentTrick(): TrickState | null {
    return this.state.currentRound?.currentTrick || null;
  }

  getRoundHistory(): RoundResult[] {
    return this.state.roundHistory;
  }

  getDealerIndex(): number {
    return this.state.currentRound?.dealerIndex ?? 0;
  }

  getDealerId(): string {
    const dealerIdx = this.getDealerIndex();
    return this.state.players[dealerIdx].id;
  }
}
