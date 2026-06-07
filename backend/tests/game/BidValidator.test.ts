import { describe, it, expect } from 'vitest';
import { BidValidator } from '../../src/game/BidValidator';

describe('BidValidator', () => {
  it('should accept valid bids for non-dealer', () => {
    const result = BidValidator.validate(3, 5, false, [1, 2]);
    expect(result.valid).toBe(true);
  });

  it('should reject negative bids', () => {
    const result = BidValidator.validate(-1, 5, false, []);
    expect(result.valid).toBe(false);
  });

  it('should reject bids greater than round number', () => {
    const result = BidValidator.validate(6, 5, false, []);
    expect(result.valid).toBe(false);
  });

  it('should reject non-integer bids', () => {
    const result = BidValidator.validate(1.5, 5, false, []);
    expect(result.valid).toBe(false);
  });

  it('should block dealer bid when total would equal round number', () => {
    // Round 4: existing bids = [1, 1, 1], dealer cannot bid 1 (1+1+1+1=4=round)
    const result = BidValidator.validate(1, 4, true, [1, 1, 1]);
    expect(result.valid).toBe(false);
  });

  it('should allow dealer any other bid', () => {
    // Round 4: existing bids = [1, 1, 1], dealer CAN bid 0 (total=3 ≠ 4)
    expect(BidValidator.validate(0, 4, true, [1, 1, 1]).valid).toBe(true);
    // dealer CAN bid 2 (total=5 ≠ 4)
    expect(BidValidator.validate(2, 4, true, [1, 1, 1]).valid).toBe(true);
  });

  it('should not restrict non-dealer even if total would match', () => {
    // Round 4: existing bids = [1, 1, 1], non-dealer CAN bid 1
    const result = BidValidator.validate(1, 4, false, [1, 1, 1]);
    expect(result.valid).toBe(true);
  });

  it('should get invalid bids for dealer correctly', () => {
    // Round 4, existing = [1, 1, 1] → forbidden = 1
    const invalid = BidValidator.getInvalidBidsForDealer(4, [1, 1, 1]);
    expect(invalid).toEqual([1]);
  });

  it('should return no invalid bids when forbidden exceeds round', () => {
    // Round 3, existing = [0, 0] → forbidden = 3, valid range 0-3, so 3 IS in range
    const invalid = BidValidator.getInvalidBidsForDealer(3, [0, 0]);
    expect(invalid).toEqual([3]);
  });

  it('should handle round 1 correctly', () => {
    // Round 1: existing = [0, 0], dealer cannot bid 1 (0+0+1=1=round)
    expect(BidValidator.validate(1, 1, true, [0, 0]).valid).toBe(false);
    // dealer CAN bid 0 (0+0+0=0 ≠ 1)
    expect(BidValidator.validate(0, 1, true, [0, 0]).valid).toBe(true);
  });

  it('should get all valid bids for dealer', () => {
    // Round 4, existing = [1, 1, 1] → valid = [0, 2, 3, 4]
    const valid = BidValidator.getValidBids(4, true, [1, 1, 1]);
    expect(valid).toEqual([0, 2, 3, 4]);
  });

  it('should get all valid bids for non-dealer', () => {
    // Non-dealer always gets full range
    const valid = BidValidator.getValidBids(4, false, [1, 1, 1]);
    expect(valid).toEqual([0, 1, 2, 3, 4]);
  });

  it('should handle round 13', () => {
    // Round 13: existing = [3, 3, 3] → forbidden = 4
    const invalid = BidValidator.getInvalidBidsForDealer(13, [3, 3, 3]);
    expect(invalid).toEqual([4]);

    // Dealer CAN bid 3 (total=12 ≠ 13)
    expect(BidValidator.validate(3, 13, true, [3, 3, 3]).valid).toBe(true);
    // Dealer CANNOT bid 4 (total=13 = round)
    expect(BidValidator.validate(4, 13, true, [3, 3, 3]).valid).toBe(false);
  });
});
