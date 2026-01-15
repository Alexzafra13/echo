import { ScoringService } from './scoring.service';
import { IUserInteractionsRepository } from '@features/user-interactions/domain/ports';
import { IPlayTrackingRepository } from '@features/play-tracking/domain/ports';
import { SCORING_WEIGHTS, FEEDBACK_SCORES, RECENCY_DECAY } from '../entities/track-score.entity';

describe('ScoringService', () => {
  let service: ScoringService;
  let mockInteractionsRepo: jest.Mocked<IUserInteractionsRepository>;
  let mockPlayTrackingRepo: jest.Mocked<IPlayTrackingRepository>;
  let mockLogger: any;

  beforeEach(() => {
    mockInteractionsRepo = {
      getItemInteractionSummary: jest.fn(),
      getUserInteractions: jest.fn(),
    } as any;

    mockPlayTrackingRepo = {
      getUserPlayStats: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new ScoringService(
      mockLogger,
      mockInteractionsRepo,
      mockPlayTrackingRepo,
    );
  });

  describe('calculateTrackScore', () => {
    it('should calculate weighted score correctly', () => {
      const explicitFeedback = 80;
      const implicitBehavior = 60;
      const recency = 50;
      const diversity = 40;

      const expected =
        explicitFeedback * SCORING_WEIGHTS.explicitFeedback +
        implicitBehavior * SCORING_WEIGHTS.implicitBehavior +
        recency * SCORING_WEIGHTS.recency +
        diversity * SCORING_WEIGHTS.diversity;

      const result = service.calculateTrackScore(
        explicitFeedback,
        implicitBehavior,
        recency,
        diversity,
      );

      expect(result).toBeCloseTo(expected, 2);
    });

    it('should clamp score to maximum of 100', () => {
      const result = service.calculateTrackScore(100, 100, 100, 100);
      expect(result).toBe(100);
    });

    it('should clamp score to minimum of -100', () => {
      const result = service.calculateTrackScore(-100, -100, -100, -100);
      expect(result).toBe(-100);
    });

    it('should return 0 for all zero inputs', () => {
      const result = service.calculateTrackScore(0, 0, 0, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateExplicitFeedback', () => {
    it('should return 0 for no rating', () => {
      const result = service.calculateExplicitFeedback();
      expect(result).toBe(0);
    });

    it('should return 0 for undefined rating', () => {
      const result = service.calculateExplicitFeedback(undefined);
      expect(result).toBe(0);
    });

    it('should calculate score for 1-star rating', () => {
      const rating = 1;
      const expected = rating * FEEDBACK_SCORES.ratingMultiplier;
      const result = service.calculateExplicitFeedback(rating);
      expect(result).toBe(expected);
    });

    it('should calculate score for 3-star rating', () => {
      const rating = 3;
      const expected = rating * FEEDBACK_SCORES.ratingMultiplier;
      const result = service.calculateExplicitFeedback(rating);
      expect(result).toBe(expected);
    });

    it('should calculate max score for 5-star rating', () => {
      const rating = 5;
      const expected = rating * FEEDBACK_SCORES.ratingMultiplier;
      const result = service.calculateExplicitFeedback(rating);
      expect(result).toBe(expected); // 5 * 20 = 100
    });

    it('should return 0 for zero rating', () => {
      const result = service.calculateExplicitFeedback(0);
      expect(result).toBe(0);
    });
  });

  describe('calculateImplicitBehavior', () => {
    it('should calculate score from weighted play count and completion', () => {
      const weightedPlayCount = 10;
      const avgCompletionRate = 0.8;
      const playCount = 15;

      const result = service.calculateImplicitBehavior(
        weightedPlayCount,
        avgCompletionRate,
        playCount,
      );

      // weightedCountScore = min(10 * 5, 70) = 50
      // completionScore = 0.8 * 30 = 24
      // total = 74
      expect(result).toBe(74);
    });

    it('should cap weighted play count contribution at 70', () => {
      const result = service.calculateImplicitBehavior(20, 0, 25);
      // weightedCountScore = min(20 * 5, 70) = 70
      expect(result).toBe(70);
    });

    it('should return 100 for max possible inputs', () => {
      const result = service.calculateImplicitBehavior(20, 1.0, 30);
      // weightedCountScore = 70 (capped)
      // completionScore = 30
      expect(result).toBe(100);
    });

    it('should return 0 for zero inputs', () => {
      const result = service.calculateImplicitBehavior(0, 0, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateRecency', () => {
    it('should return 100 for track played just now', () => {
      const now = new Date();
      const result = service.calculateRecency(now);
      expect(result).toBeCloseTo(100, 0);
    });

    it('should return 0 for undefined lastPlayedAt', () => {
      const result = service.calculateRecency(undefined);
      expect(result).toBe(0);
    });

    it('should apply exponential decay for old plays', () => {
      const daysAgo = 30;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const result = service.calculateRecency(date);

      const expected = 100 * Math.exp(-RECENCY_DECAY.lambda * daysAgo);
      expect(result).toBeCloseTo(expected, 1);
    });

    it('should handle string dates (from Redis/database)', () => {
      const now = new Date();
      const result = service.calculateRecency(now.toISOString());
      expect(result).toBeCloseTo(100, 0);
    });

    it('should return low score for very old plays', () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 1);

      const result = service.calculateRecency(date);
      expect(result).toBeLessThan(10);
    });
  });

  describe('calculateDiversity', () => {
    it('should return 100 for zero total play count', () => {
      const result = service.calculateDiversity(0, 0);
      expect(result).toBe(100);
    });

    it('should return 0 when artist plays equal total plays', () => {
      const result = service.calculateDiversity(100, 100);
      expect(result).toBe(0);
    });

    it('should return 50 for 50% artist saturation', () => {
      const result = service.calculateDiversity(50, 100);
      expect(result).toBe(50);
    });

    it('should return high score for low artist saturation', () => {
      const result = service.calculateDiversity(10, 100);
      expect(result).toBe(90);
    });
  });

  describe('calculateScoreBreakdown', () => {
    const userId = 'user-123';
    const trackId = 'track-456';
    const artistId = 'artist-789';

    beforeEach(() => {
      mockInteractionsRepo.getItemInteractionSummary.mockResolvedValue({
        itemId: trackId,
        itemType: 'track',
        averageRating: 4.5,
        totalRatings: 1,
        userRating: 5,
      });

      mockPlayTrackingRepo.getUserPlayStats.mockResolvedValue([
        {
          itemId: trackId,
          itemType: 'track',
          playCount: 10,
          weightedPlayCount: 8,
          avgCompletionRate: 0.9,
          lastPlayedAt: new Date(),
        },
      ]);
    });

    it('should calculate complete score breakdown', async () => {
      const result = await service.calculateScoreBreakdown(userId, trackId);

      expect(mockInteractionsRepo.getItemInteractionSummary).toHaveBeenCalledWith(
        trackId,
        'track',
        userId,
      );
      expect(mockPlayTrackingRepo.getUserPlayStats).toHaveBeenCalledWith(userId, 'track');

      expect(result).toHaveProperty('explicitFeedback');
      expect(result).toHaveProperty('implicitBehavior');
      expect(result).toHaveProperty('recency');
      expect(result).toHaveProperty('diversity');
    });

    it('should return zero implicit behavior when no play stats found', async () => {
      mockPlayTrackingRepo.getUserPlayStats.mockResolvedValue([]);

      const result = await service.calculateScoreBreakdown(userId, trackId);

      expect(result.implicitBehavior).toBe(0);
      expect(result.recency).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should calculate artist diversity when artistId provided', async () => {
      mockPlayTrackingRepo.getUserPlayStats
        .mockResolvedValueOnce([
          {
            itemId: trackId,
            itemType: 'track',
            playCount: 10,
            weightedPlayCount: 8,
            avgCompletionRate: 0.9,
            lastPlayedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            itemId: artistId,
            itemType: 'artist',
            playCount: 20,
            weightedPlayCount: 15,
            avgCompletionRate: 0.85,
            lastPlayedAt: new Date(),
          },
        ]);

      const result = await service.calculateScoreBreakdown(userId, trackId, artistId);

      expect(mockPlayTrackingRepo.getUserPlayStats).toHaveBeenCalledWith(userId, 'artist');
      expect(result.diversity).toBeDefined();
    });
  });

  describe('calculateFullTrackScore', () => {
    const userId = 'user-123';
    const trackId = 'track-456';

    beforeEach(() => {
      mockInteractionsRepo.getItemInteractionSummary.mockResolvedValue({
        itemId: trackId,
        itemType: 'track',
        averageRating: 0,
        totalRatings: 0,
        userRating: undefined,
      });

      mockPlayTrackingRepo.getUserPlayStats.mockResolvedValue([]);
    });

    it('should return complete TrackScore object', async () => {
      const result = await service.calculateFullTrackScore(userId, trackId);

      expect(result).toHaveProperty('trackId', trackId);
      expect(result).toHaveProperty('totalScore');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('rank', 0);
    });

    it('should include breakdown in result', async () => {
      const result = await service.calculateFullTrackScore(userId, trackId);

      expect(result.breakdown).toHaveProperty('explicitFeedback');
      expect(result.breakdown).toHaveProperty('implicitBehavior');
      expect(result.breakdown).toHaveProperty('recency');
      expect(result.breakdown).toHaveProperty('diversity');
    });
  });

  describe('calculateAndRankTracks', () => {
    const userId = 'user-123';

    beforeEach(() => {
      mockInteractionsRepo.getItemInteractionSummary.mockResolvedValue({
        itemId: 'any',
        itemType: 'track',
        averageRating: 0,
        totalRatings: 0,
        userRating: undefined,
      });

      mockPlayTrackingRepo.getUserPlayStats.mockResolvedValue([]);
    });

    it('should rank tracks by score descending', async () => {
      const trackIds = ['track-1', 'track-2', 'track-3'];

      // Mock getUserInteractions to return empty array (no ratings)
      mockInteractionsRepo.getUserInteractions.mockResolvedValue([]);

      // Mock getUserPlayStats to return all track stats at once (optimized query)
      mockPlayTrackingRepo.getUserPlayStats.mockResolvedValue([
        { itemId: 'track-1', itemType: 'track', playCount: 5, weightedPlayCount: 3, avgCompletionRate: 0.5, lastPlayedAt: new Date() },
        { itemId: 'track-2', itemType: 'track', playCount: 20, weightedPlayCount: 15, avgCompletionRate: 0.9, lastPlayedAt: new Date() },
        { itemId: 'track-3', itemType: 'track', playCount: 10, weightedPlayCount: 8, avgCompletionRate: 0.7, lastPlayedAt: new Date() },
      ]);

      const result = await service.calculateAndRankTracks(userId, trackIds);

      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);

      // Should be sorted by score descending
      expect(result[0].totalScore).toBeGreaterThanOrEqual(result[1].totalScore);
      expect(result[1].totalScore).toBeGreaterThanOrEqual(result[2].totalScore);
    });

    it('should use artistMap for diversity calculation', async () => {
      const trackIds = ['track-1'];
      const trackArtistMap = new Map([['track-1', 'artist-1']]);

      // Mock getUserInteractions
      mockInteractionsRepo.getUserInteractions.mockResolvedValue([]);

      // Mock getUserPlayStats - first call for tracks, second for artists
      mockPlayTrackingRepo.getUserPlayStats
        .mockResolvedValueOnce([{ itemId: 'track-1', itemType: 'track', playCount: 5, weightedPlayCount: 3, avgCompletionRate: 0.5, lastPlayedAt: new Date() }])
        .mockResolvedValueOnce([{ itemId: 'artist-1', itemType: 'artist', playCount: 10, weightedPlayCount: 10, avgCompletionRate: 1, lastPlayedAt: new Date() }]);

      await service.calculateAndRankTracks(userId, trackIds, trackArtistMap);

      expect(mockPlayTrackingRepo.getUserPlayStats).toHaveBeenCalledWith(userId, 'track');
      expect(mockPlayTrackingRepo.getUserPlayStats).toHaveBeenCalledWith(userId, 'artist');
    });
  });
});
