import { PlayStatsCalculatorService } from './play-stats-calculator.service';
import { PlayContext, CONTEXT_WEIGHTS } from '../entities/play-event.entity';

describe('PlayStatsCalculatorService', () => {
  let service: PlayStatsCalculatorService;

  beforeEach(() => {
    service = new PlayStatsCalculatorService();
  });

  describe('calculateWeightedPlay', () => {
    it('should calculate full weight for direct play with 100% completion', () => {
      const result = service.calculateWeightedPlay('direct', 1.0);
      expect(result).toBe(1.0); // direct weight is 1.0
    });

    it('should calculate partial weight for incomplete play', () => {
      const result = service.calculateWeightedPlay('direct', 0.5);
      expect(result).toBe(0.5);
    });

    it('should apply lower weight for shuffle context', () => {
      const result = service.calculateWeightedPlay('shuffle', 1.0);
      expect(result).toBe(0.2); // shuffle weight is 0.2
    });

    it('should combine context weight and completion rate', () => {
      const result = service.calculateWeightedPlay('playlist', 0.8);
      expect(result).toBeCloseTo(0.64, 5); // 0.8 * 0.8
    });

    it('should return 0 for 0% completion', () => {
      const result = service.calculateWeightedPlay('album', 0);
      expect(result).toBe(0);
    });

    it('should handle all context types', () => {
      const contexts: PlayContext[] = [
        'direct', 'search', 'artist', 'playlist',
        'album', 'queue', 'recommendation', 'radio', 'shuffle',
      ];

      contexts.forEach((context) => {
        const result = service.calculateWeightedPlay(context, 1.0);
        expect(result).toBe(CONTEXT_WEIGHTS[context]);
      });
    });
  });

  describe('isSkipped', () => {
    it('should return true when completion rate is below 50%', () => {
      expect(service.isSkipped(0.49)).toBe(true);
      expect(service.isSkipped(0.25)).toBe(true);
      expect(service.isSkipped(0)).toBe(true);
    });

    it('should return false when completion rate is 50% or above', () => {
      expect(service.isSkipped(0.5)).toBe(false);
      expect(service.isSkipped(0.75)).toBe(false);
      expect(service.isSkipped(1.0)).toBe(false);
    });

    it('should use custom threshold when provided', () => {
      expect(service.isSkipped(0.29, 0.3)).toBe(true);
      expect(service.isSkipped(0.30, 0.3)).toBe(false);
    });

    it('should handle edge case at exactly threshold', () => {
      expect(service.isSkipped(0.5, 0.5)).toBe(false);
    });
  });

  describe('calculatePopularityScore', () => {
    it('should return 0 when no unique listeners', () => {
      const result = service.calculatePopularityScore(100, 0.8, 0.1, 0);
      expect(result).toBe(0);
    });

    it('should calculate score based on plays per listener', () => {
      // 100 plays, 80% completion, 10% skip, 10 listeners
      // engagementScore = 0.8 * (1 - 0.1) = 0.72
      // normalizedPlays = 100 / 10 = 10
      // score = 10 * 0.72 * 100 = 720
      const result = service.calculatePopularityScore(100, 0.8, 0.1, 10);
      expect(result).toBeCloseTo(720, 5);
    });

    it('should penalize high skip rate', () => {
      const lowSkip = service.calculatePopularityScore(100, 0.8, 0.1, 10);
      const highSkip = service.calculatePopularityScore(100, 0.8, 0.9, 10);
      expect(highSkip).toBeLessThan(lowSkip);
    });

    it('should reward high completion rate', () => {
      const lowCompletion = service.calculatePopularityScore(100, 0.3, 0.1, 10);
      const highCompletion = service.calculatePopularityScore(100, 0.9, 0.1, 10);
      expect(highCompletion).toBeGreaterThan(lowCompletion);
    });

    it('should handle single listener', () => {
      const result = service.calculatePopularityScore(5, 1.0, 0, 1);
      expect(result).toBe(500); // 5 * 1.0 * 100
    });
  });

  describe('calculateAvgCompletionRate', () => {
    it('should return 0 for empty array', () => {
      const result = service.calculateAvgCompletionRate([]);
      expect(result).toBe(0);
    });

    it('should calculate average correctly', () => {
      const result = service.calculateAvgCompletionRate([0.5, 0.8, 1.0]);
      expect(result).toBeCloseTo(0.7667, 3);
    });

    it('should handle single value', () => {
      const result = service.calculateAvgCompletionRate([0.75]);
      expect(result).toBe(0.75);
    });

    it('should handle all 100% completion', () => {
      const result = service.calculateAvgCompletionRate([1.0, 1.0, 1.0]);
      expect(result).toBe(1.0);
    });

    it('should handle all 0% completion', () => {
      const result = service.calculateAvgCompletionRate([0, 0, 0]);
      expect(result).toBe(0);
    });
  });

  describe('calculateSkipRate', () => {
    it('should return 0 when no plays', () => {
      const result = service.calculateSkipRate(0, 0);
      expect(result).toBe(0);
    });

    it('should calculate skip rate correctly', () => {
      const result = service.calculateSkipRate(25, 100);
      expect(result).toBe(0.25);
    });

    it('should return 1 when all plays are skips', () => {
      const result = service.calculateSkipRate(50, 50);
      expect(result).toBe(1.0);
    });

    it('should return 0 when no skips', () => {
      const result = service.calculateSkipRate(0, 100);
      expect(result).toBe(0);
    });
  });

  describe('getContextWeight', () => {
    it('should return correct weight for each context', () => {
      expect(service.getContextWeight('direct')).toBe(1.0);
      expect(service.getContextWeight('search')).toBe(0.9);
      expect(service.getContextWeight('playlist')).toBe(0.8);
      expect(service.getContextWeight('artist')).toBe(0.75);
      expect(service.getContextWeight('queue')).toBe(0.7);
      expect(service.getContextWeight('recommendation')).toBe(0.7);
      expect(service.getContextWeight('album')).toBe(0.6);
      expect(service.getContextWeight('radio')).toBe(0.4);
      expect(service.getContextWeight('shuffle')).toBe(0.2);
    });
  });

  describe('getMostCommonContext', () => {
    it('should return null for empty array', () => {
      const result = service.getMostCommonContext([]);
      expect(result).toBeNull();
    });

    it('should return single context', () => {
      const result = service.getMostCommonContext(['direct']);
      expect(result).toBe('direct');
    });

    it('should return most common context', () => {
      const contexts: PlayContext[] = [
        'direct', 'playlist', 'playlist', 'playlist', 'direct',
      ];
      const result = service.getMostCommonContext(contexts);
      expect(result).toBe('playlist');
    });

    it('should handle tie by returning first max found', () => {
      const contexts: PlayContext[] = ['direct', 'direct', 'shuffle', 'shuffle'];
      const result = service.getMostCommonContext(contexts);
      // Either direct or shuffle is valid as they're tied
      expect(['direct', 'shuffle']).toContain(result);
    });

    it('should work with all same context', () => {
      const contexts: PlayContext[] = ['album', 'album', 'album'];
      const result = service.getMostCommonContext(contexts);
      expect(result).toBe('album');
    });
  });

  describe('calculateListeningTime', () => {
    it('should calculate full duration for 100% completion', () => {
      // 180 seconds, 100% = 3 minutes
      const result = service.calculateListeningTime(180, 1.0);
      expect(result).toBe(3);
    });

    it('should calculate partial duration for incomplete play', () => {
      // 240 seconds, 50% = 2 minutes
      const result = service.calculateListeningTime(240, 0.5);
      expect(result).toBe(2);
    });

    it('should return 0 for 0% completion', () => {
      const result = service.calculateListeningTime(300, 0);
      expect(result).toBe(0);
    });

    it('should handle short tracks', () => {
      // 30 seconds, 100% = 0.5 minutes
      const result = service.calculateListeningTime(30, 1.0);
      expect(result).toBe(0.5);
    });

    it('should handle long tracks', () => {
      // 600 seconds (10 min), 75% = 7.5 minutes
      const result = service.calculateListeningTime(600, 0.75);
      expect(result).toBe(7.5);
    });
  });
});
