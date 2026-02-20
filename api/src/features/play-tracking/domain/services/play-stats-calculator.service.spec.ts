import { PlayStatsCalculatorService } from './play-stats-calculator.service';

describe('PlayStatsCalculatorService', () => {
  let service: PlayStatsCalculatorService;

  beforeEach(() => {
    service = new PlayStatsCalculatorService();
  });

  describe('calculateWeightedPlay', () => {
    it('should give highest weight to direct plays (1.0)', () => {
      const weight = service.calculateWeightedPlay('direct', 1.0);
      expect(weight).toBe(1.0);
    });

    it('should reduce weight by completion rate', () => {
      const weight = service.calculateWeightedPlay('direct', 0.5);
      expect(weight).toBe(0.5);
    });

    it('should give lowest weight to shuffle (0.2)', () => {
      const weight = service.calculateWeightedPlay('shuffle', 1.0);
      expect(weight).toBe(0.2);
    });

    it('should apply both context weight and completion rate', () => {
      // playlist = 0.8, completion = 0.75 => 0.6
      const weight = service.calculateWeightedPlay('playlist', 0.75);
      expect(weight).toBeCloseTo(0.6);
    });

    it('should return 0 when completion rate is 0', () => {
      const weight = service.calculateWeightedPlay('direct', 0);
      expect(weight).toBe(0);
    });
  });

  describe('isSkipped', () => {
    it('should return true when below default threshold (50%)', () => {
      expect(service.isSkipped(0.3)).toBe(true);
    });

    it('should return false when at threshold', () => {
      expect(service.isSkipped(0.5)).toBe(false);
    });

    it('should return false when above threshold', () => {
      expect(service.isSkipped(0.8)).toBe(false);
    });

    it('should accept custom threshold', () => {
      expect(service.isSkipped(0.2, 0.1)).toBe(false);
      expect(service.isSkipped(0.05, 0.1)).toBe(true);
    });
  });

  describe('calculatePopularityScore', () => {
    it('should return 0 for 0 unique listeners', () => {
      expect(service.calculatePopularityScore(100, 0.9, 0.1, 0)).toBe(0);
    });

    it('should calculate correctly with typical values', () => {
      // 100 plays, 0.8 completion, 0.2 skip, 10 listeners
      // engagementScore = 0.8 * (1 - 0.2) = 0.64
      // normalizedPlays = 100 / 10 = 10
      // result = 10 * 0.64 * 100 = 640
      const score = service.calculatePopularityScore(100, 0.8, 0.2, 10);
      expect(score).toBeCloseTo(640);
    });

    it('should return higher score for higher completion rate', () => {
      const lowCompletion = service.calculatePopularityScore(100, 0.5, 0.1, 10);
      const highCompletion = service.calculatePopularityScore(100, 0.9, 0.1, 10);
      expect(highCompletion).toBeGreaterThan(lowCompletion);
    });

    it('should return lower score for higher skip rate', () => {
      const lowSkip = service.calculatePopularityScore(100, 0.8, 0.1, 10);
      const highSkip = service.calculatePopularityScore(100, 0.8, 0.5, 10);
      expect(lowSkip).toBeGreaterThan(highSkip);
    });
  });

  describe('calculateAvgCompletionRate', () => {
    it('should return 0 for empty array', () => {
      expect(service.calculateAvgCompletionRate([])).toBe(0);
    });

    it('should calculate average correctly', () => {
      expect(service.calculateAvgCompletionRate([0.8, 1.0, 0.6])).toBeCloseTo(0.8);
    });

    it('should return same value for single element', () => {
      expect(service.calculateAvgCompletionRate([0.75])).toBe(0.75);
    });
  });

  describe('calculateSkipRate', () => {
    it('should return 0 for 0 total plays', () => {
      expect(service.calculateSkipRate(5, 0)).toBe(0);
    });

    it('should calculate rate correctly', () => {
      expect(service.calculateSkipRate(20, 100)).toBe(0.2);
    });

    it('should return 1 when all plays are skips', () => {
      expect(service.calculateSkipRate(50, 50)).toBe(1);
    });
  });

  describe('getContextWeight', () => {
    it('should return correct weights for all contexts', () => {
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
      expect(service.getMostCommonContext([])).toBeNull();
    });

    it('should return the most common context', () => {
      const contexts = ['playlist', 'direct', 'playlist', 'playlist', 'direct'] as any[];
      expect(service.getMostCommonContext(contexts)).toBe('playlist');
    });

    it('should return a context for single element', () => {
      expect(service.getMostCommonContext(['direct'])).toBe('direct');
    });
  });

  describe('calculateListeningTime', () => {
    it('should calculate listening time in minutes', () => {
      // 240 seconds at 100% = 4 minutes
      expect(service.calculateListeningTime(240, 1.0)).toBe(4);
    });

    it('should factor in completion rate', () => {
      // 300 seconds at 50% = 2.5 minutes
      expect(service.calculateListeningTime(300, 0.5)).toBe(2.5);
    });

    it('should return 0 for 0 completion', () => {
      expect(service.calculateListeningTime(240, 0)).toBe(0);
    });
  });
});
