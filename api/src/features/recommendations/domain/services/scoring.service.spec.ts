import { ScoringService } from './scoring.service';
import { SCORING_WEIGHTS, FEEDBACK_SCORES, RECENCY_DECAY } from '../entities/track-score.entity';
import { IUserInteractionsRepository } from '@features/user-interactions/domain/ports';
import { IPlayTrackingRepository } from '@features/play-tracking/domain/ports';
import { PinoLogger } from 'nestjs-pino';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const mockInteractionsRepo = {} as unknown as IUserInteractionsRepository;
    const mockPlayTrackingRepo = {} as unknown as IPlayTrackingRepository;
    service = new ScoringService(
      mockLogger as unknown as PinoLogger,
      mockInteractionsRepo,
      mockPlayTrackingRepo
    );
  });

  describe('calculateTrackScore', () => {
    it('should apply weights correctly', () => {
      const score = service.calculateTrackScore(100, 100, 100, 100);
      // 100 * 0.30 + 100 * 0.50 + 100 * 0.18 + 100 * 0.02 = 100
      expect(score).toBe(100);
    });

    it('should clamp to max 100', () => {
      const score = service.calculateTrackScore(200, 200, 200, 200);
      expect(score).toBe(100);
    });

    it('should clamp to min -100', () => {
      const score = service.calculateTrackScore(-200, -200, -200, -200);
      expect(score).toBe(-100);
    });

    it('should return 0 for all zero inputs', () => {
      expect(service.calculateTrackScore(0, 0, 0, 0)).toBe(0);
    });

    it('should weight implicit behavior highest (50%)', () => {
      const scoreHigh = service.calculateTrackScore(0, 100, 0, 0);
      const scoreExplicit = service.calculateTrackScore(100, 0, 0, 0);
      expect(scoreHigh).toBeGreaterThan(scoreExplicit);
    });
  });

  describe('calculateExplicitFeedback', () => {
    it('should return 0 for no feedback', () => {
      expect(service.calculateExplicitFeedback(undefined)).toBe(0);
      expect(service.calculateExplicitFeedback(0)).toBe(0);
    });

    it('should multiply rating by 20', () => {
      expect(service.calculateExplicitFeedback(1)).toBe(20);
      expect(service.calculateExplicitFeedback(3)).toBe(60);
      expect(service.calculateExplicitFeedback(5)).toBe(100);
    });
  });

  describe('calculateImplicitBehavior', () => {
    it('should return 0 for all zeros', () => {
      expect(service.calculateImplicitBehavior(0, 0, 0)).toBe(0);
    });

    it('should cap weighted count contribution at 70', () => {
      const score = service.calculateImplicitBehavior(100, 0, 100);
      expect(score).toBeLessThanOrEqual(100);
      // weighted 100 * 5 = 500 capped at 70, + 0 completion = 70
      expect(score).toBe(70);
    });

    it('should add completion score (max 30)', () => {
      const score = service.calculateImplicitBehavior(0, 1.0, 0);
      expect(score).toBe(30);
    });

    it('should combine both components', () => {
      // weighted = 5 * 5 = 25, completion = 0.5 * 30 = 15
      const score = service.calculateImplicitBehavior(5, 0.5, 5);
      expect(score).toBe(40);
    });

    it('should clamp between 0 and 100', () => {
      const score = service.calculateImplicitBehavior(100, 1.0, 100);
      expect(score).toBe(100);
    });
  });

  describe('calculateRecency', () => {
    it('should return 0 for no last played date', () => {
      expect(service.calculateRecency(undefined)).toBe(0);
    });

    it('should return ~100 for just played', () => {
      const now = new Date();
      const score = service.calculateRecency(now);
      expect(score).toBeGreaterThan(95);
    });

    it('should decay over time', () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const recentScore = service.calculateRecency(oneWeekAgo);
      const olderScore = service.calculateRecency(oneMonthAgo);

      expect(recentScore).toBeGreaterThan(olderScore);
    });

    it('should handle string dates (from Redis/DB)', () => {
      const now = new Date();
      const score = service.calculateRecency(now.toISOString());
      expect(score).toBeGreaterThan(95);
    });
  });

  describe('calculateDiversity', () => {
    it('should return 100 for zero total plays', () => {
      expect(service.calculateDiversity(0, 0)).toBe(100);
    });

    it('should return 0 when artist is 100% of plays', () => {
      expect(service.calculateDiversity(100, 100)).toBe(0);
    });

    it('should return 50 when artist is 50% of plays', () => {
      expect(service.calculateDiversity(50, 100)).toBe(50);
    });

    it('should return high score for low artist concentration', () => {
      const score = service.calculateDiversity(5, 100);
      expect(score).toBe(95);
    });
  });
});
