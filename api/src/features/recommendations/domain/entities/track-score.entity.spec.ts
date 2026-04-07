import {
  SCORING_WEIGHTS,
  FEEDBACK_SCORES,
  RECENCY_DECAY,
} from './track-score.entity';

describe('TrackScore Entity', () => {
  describe('SCORING_WEIGHTS', () => {
    it('should have weights that sum to 1.0', () => {
      const sum =
        SCORING_WEIGHTS.explicitFeedback +
        SCORING_WEIGHTS.implicitBehavior +
        SCORING_WEIGHTS.recency +
        SCORING_WEIGHTS.diversity;

      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should have all positive weight values', () => {
      expect(SCORING_WEIGHTS.explicitFeedback).toBeGreaterThan(0);
      expect(SCORING_WEIGHTS.implicitBehavior).toBeGreaterThan(0);
      expect(SCORING_WEIGHTS.recency).toBeGreaterThan(0);
      expect(SCORING_WEIGHTS.diversity).toBeGreaterThan(0);
    });

    it('should assign the highest weight to implicitBehavior', () => {
      const weights = Object.values(SCORING_WEIGHTS);
      const maxWeight = Math.max(...weights);

      expect(SCORING_WEIGHTS.implicitBehavior).toBe(maxWeight);
    });

    it('should have expected specific weight values', () => {
      expect(SCORING_WEIGHTS.explicitFeedback).toBe(0.30);
      expect(SCORING_WEIGHTS.implicitBehavior).toBe(0.50);
      expect(SCORING_WEIGHTS.recency).toBe(0.18);
      expect(SCORING_WEIGHTS.diversity).toBe(0.02);
    });

    it('should have exactly four weight categories', () => {
      const keys = Object.keys(SCORING_WEIGHTS);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('explicitFeedback');
      expect(keys).toContain('implicitBehavior');
      expect(keys).toContain('recency');
      expect(keys).toContain('diversity');
    });
  });

  describe('FEEDBACK_SCORES', () => {
    it('should have noFeedback equal to 0', () => {
      expect(FEEDBACK_SCORES.noFeedback).toBe(0);
    });

    it('should have a positive ratingMultiplier', () => {
      expect(FEEDBACK_SCORES.ratingMultiplier).toBeGreaterThan(0);
    });

    it('should have expected specific values', () => {
      expect(FEEDBACK_SCORES.ratingMultiplier).toBe(20);
    });
  });

  describe('RECENCY_DECAY', () => {
    it('should have a positive lambda', () => {
      expect(RECENCY_DECAY.lambda).toBeGreaterThan(0);
    });

    it('should have a lambda less than 1', () => {
      expect(RECENCY_DECAY.lambda).toBeLessThan(1);
    });

    it('should have expected specific value', () => {
      expect(RECENCY_DECAY.lambda).toBe(0.03);
    });
  });
});
