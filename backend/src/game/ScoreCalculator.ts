import { CORRECT_BID_BASE, CORRECT_BID_MULTIPLIER, INCORRECT_BID_SCORE } from '../../../shared/constants';
import { RoundScore } from '../../../shared/types/game';

/**
 * Calculates scores based on bid accuracy.
 *
 * Correct prediction: 10 + (11 × bid)
 * Incorrect prediction: 0
 */
export class ScoreCalculator {
  /**
   * Calculate score for a single player in a round.
   */
  static calculateRoundScore(bid: number, tricksWon: number): number {
    if (bid === tricksWon) {
      return CORRECT_BID_BASE + (CORRECT_BID_MULTIPLIER * bid);
    }
    return INCORRECT_BID_SCORE;
  }

  /**
   * Calculate scores for all players in a round.
   */
  static calculateRoundScores(
    playerBids: Record<string, number>,
    playerTricks: Record<string, number>
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const playerId of Object.keys(playerBids)) {
      const bid = playerBids[playerId];
      const tricks = playerTricks[playerId] || 0;
      scores[playerId] = ScoreCalculator.calculateRoundScore(bid, tricks);
    }

    return scores;
  }

  /**
   * Calculate final standings sorted by total score descending.
   */
  static calculateFinalStandings(
    players: Array<{ id: string; name: string; avatar: string; totalScore: number; roundScores: RoundScore[] }>
  ) {
    const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);

    return sorted.map((player, index) => ({
      playerId: player.id,
      playerName: player.name,
      avatar: player.avatar,
      totalScore: player.totalScore,
      placement: index + 1,
      roundBreakdown: player.roundScores,
    }));
  }
}
