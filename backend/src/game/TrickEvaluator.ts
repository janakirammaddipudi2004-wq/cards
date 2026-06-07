import { PlayedCard, SUIT_PRIORITY, RANK_PRIORITY } from '../../../shared/types/card';

/**
 * Evaluates a completed trick and determines the winner.
 *
 * Priority rules:
 * 1. Highest suit priority wins (♠ > ♣ > ♥ > ♦)
 * 2. If suits match, highest rank wins (A > K > Q > ... > 2)
 * 3. If identical cards, the one played LATER wins
 */
export class TrickEvaluator {
  /**
   * Determine the winner of a trick.
   * @param playedCards Cards in the order they were played
   * @returns The PlayedCard that wins the trick
   */
  static evaluate(playedCards: PlayedCard[]): PlayedCard {
    if (playedCards.length === 0) {
      throw new Error('Cannot evaluate an empty trick');
    }

    let winner = playedCards[0];

    for (let i = 1; i < playedCards.length; i++) {
      const challenger = playedCards[i];
      if (TrickEvaluator.beats(challenger, winner)) {
        winner = challenger;
      }
    }

    return winner;
  }

  /**
   * Does card A beat card B?
   */
  static beats(a: PlayedCard, b: PlayedCard): boolean {
    const suitPriorityA = SUIT_PRIORITY[a.card.suit];
    const suitPriorityB = SUIT_PRIORITY[b.card.suit];

    // Lower priority number = higher suit
    if (suitPriorityA < suitPriorityB) return true;
    if (suitPriorityA > suitPriorityB) return false;

    // Same suit — compare ranks
    const rankPriorityA = RANK_PRIORITY[a.card.rank];
    const rankPriorityB = RANK_PRIORITY[b.card.rank];

    if (rankPriorityA < rankPriorityB) return true;  // Lower number = higher rank
    if (rankPriorityA > rankPriorityB) return false;

    // Identical cards — later play wins
    return a.playOrder > b.playOrder;
  }

  /**
   * Get the winner's player ID from a completed trick.
   */
  static getWinnerId(playedCards: PlayedCard[]): string {
    return TrickEvaluator.evaluate(playedCards).playerId;
  }
}
