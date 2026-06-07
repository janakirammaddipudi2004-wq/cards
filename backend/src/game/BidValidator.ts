/**
 * Validates bids during the bidding phase.
 *
 * Key rules:
 * - The dealer bids last
 * - The total of all bids CANNOT equal the round number
 * - This restriction only applies to the dealer's bid
 */
export class BidValidator {
  /**
   * Check if a bid is valid.
   * @param bid The bid value
   * @param roundNumber Current round number
   * @param isDealer Whether this player is the dealer (last to bid)
   * @param existingBids Array of bids already placed by other players
   * @returns Object with valid flag and optional reason
   */
  static validate(
    bid: number,
    roundNumber: number,
    isDealer: boolean,
    existingBids: number[]
  ): { valid: boolean; reason?: string } {
    // Basic range check
    if (bid < 0 || bid > roundNumber) {
      return { valid: false, reason: `Bid must be between 0 and ${roundNumber}` };
    }

    if (!Number.isInteger(bid)) {
      return { valid: false, reason: 'Bid must be a whole number' };
    }

    // Dealer restriction: total bids cannot equal round number
    if (isDealer) {
      const currentTotal = existingBids.reduce((sum, b) => sum + b, 0);
      if (currentTotal + bid === roundNumber) {
        return {
          valid: false,
          reason: `Total bids cannot equal the round number (${roundNumber}). Current total: ${currentTotal}. You cannot bid ${bid}.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get the list of invalid bid values for the dealer.
   * Only the value that would make the total equal to the round number is invalid.
   */
  static getInvalidBidsForDealer(roundNumber: number, existingBids: number[]): number[] {
    const currentTotal = existingBids.reduce((sum, b) => sum + b, 0);
    const forbiddenBid = roundNumber - currentTotal;

    if (forbiddenBid >= 0 && forbiddenBid <= roundNumber) {
      return [forbiddenBid];
    }

    return [];
  }

  /**
   * Get all valid bid values for a player.
   */
  static getValidBids(roundNumber: number, isDealer: boolean, existingBids: number[]): number[] {
    const allBids = Array.from({ length: roundNumber + 1 }, (_, i) => i);

    if (!isDealer) return allBids;

    const invalid = BidValidator.getInvalidBidsForDealer(roundNumber, existingBids);
    return allBids.filter(b => !invalid.includes(b));
  }
}
