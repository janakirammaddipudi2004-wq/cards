import { describe, it, expect } from 'vitest';
import { ScoreCalculator } from '../../src/game/ScoreCalculator';

describe('ScoreCalculator', () => {
  it('correct prediction: score = 10 + (11 × bid)', () => {
    expect(ScoreCalculator.calculateRoundScore(0, 0)).toBe(10);
    expect(ScoreCalculator.calculateRoundScore(1, 1)).toBe(21);
    expect(ScoreCalculator.calculateRoundScore(2, 2)).toBe(32);
    expect(ScoreCalculator.calculateRoundScore(3, 3)).toBe(43);
    expect(ScoreCalculator.calculateRoundScore(4, 4)).toBe(54);
    expect(ScoreCalculator.calculateRoundScore(5, 5)).toBe(65);
    expect(ScoreCalculator.calculateRoundScore(13, 13)).toBe(153);
  });

  it('incorrect prediction: score = 0', () => {
    expect(ScoreCalculator.calculateRoundScore(2, 1)).toBe(0);
    expect(ScoreCalculator.calculateRoundScore(2, 3)).toBe(0);
    expect(ScoreCalculator.calculateRoundScore(0, 1)).toBe(0);
    expect(ScoreCalculator.calculateRoundScore(1, 0)).toBe(0);
    expect(ScoreCalculator.calculateRoundScore(5, 0)).toBe(0);
  });

  it('should calculate scores for all players in a round', () => {
    const bids = { p1: 2, p2: 3, p3: 0 };
    const tricks = { p1: 2, p2: 1, p3: 0 };

    const scores = ScoreCalculator.calculateRoundScores(bids, tricks);

    expect(scores.p1).toBe(32); // Correct: 10 + 11*2
    expect(scores.p2).toBe(0);  // Wrong: bid 3, won 1
    expect(scores.p3).toBe(10); // Correct: 10 + 11*0
  });

  it('should sort final standings by score descending', () => {
    const players = [
      { id: 'p1', name: 'Alice', avatar: '', totalScore: 50, roundScores: [] },
      { id: 'p2', name: 'Bob', avatar: '', totalScore: 120, roundScores: [] },
      { id: 'p3', name: 'Charlie', avatar: '', totalScore: 80, roundScores: [] },
    ];

    const standings = ScoreCalculator.calculateFinalStandings(players);

    expect(standings[0].playerId).toBe('p2');
    expect(standings[0].placement).toBe(1);
    expect(standings[1].playerId).toBe('p3');
    expect(standings[1].placement).toBe(2);
    expect(standings[2].playerId).toBe('p1');
    expect(standings[2].placement).toBe(3);
  });

  it('bid 0 correct should give 10 points', () => {
    expect(ScoreCalculator.calculateRoundScore(0, 0)).toBe(10);
  });
});
