import { CalculateTrackScoreUseCase } from './calculate-track-score.use-case';
import { ScoringService } from '../services/scoring.service';
import { TrackScore } from '../entities/track-score.entity';

describe('CalculateTrackScoreUseCase', () => {
  let useCase: CalculateTrackScoreUseCase;
  let mockScoringService: jest.Mocked<ScoringService>;

  const mockTrackScore: TrackScore = {
    trackId: 'track-123',
    totalScore: 78.5,
    breakdown: {
      explicitFeedback: 40,
      implicitBehavior: 65,
      recency: 72,
      diversity: 55,
    },
    rank: 0,
  };

  beforeEach(() => {
    mockScoringService = {
      calculateFullTrackScore: jest.fn(),
    } as any;

    useCase = new CalculateTrackScoreUseCase(mockScoringService);
  });

  describe('execute', () => {
    it('should calculate track score without artist', async () => {
      mockScoringService.calculateFullTrackScore.mockResolvedValue(mockTrackScore);

      const result = await useCase.execute('user-123', 'track-123');

      expect(mockScoringService.calculateFullTrackScore).toHaveBeenCalledWith(
        'user-123',
        'track-123',
        undefined,
      );
      expect(result).toEqual(mockTrackScore);
    });

    it('should calculate track score with artist for diversity', async () => {
      mockScoringService.calculateFullTrackScore.mockResolvedValue(mockTrackScore);

      const result = await useCase.execute('user-123', 'track-123', 'artist-456');

      expect(mockScoringService.calculateFullTrackScore).toHaveBeenCalledWith(
        'user-123',
        'track-123',
        'artist-456',
      );
      expect(result).toEqual(mockTrackScore);
    });

    it('should return complete score breakdown', async () => {
      mockScoringService.calculateFullTrackScore.mockResolvedValue(mockTrackScore);

      const result = await useCase.execute('user-123', 'track-123');

      expect(result.breakdown).toHaveProperty('explicitFeedback');
      expect(result.breakdown).toHaveProperty('implicitBehavior');
      expect(result.breakdown).toHaveProperty('recency');
      expect(result.breakdown).toHaveProperty('diversity');
    });

    it('should return trackId in result', async () => {
      mockScoringService.calculateFullTrackScore.mockResolvedValue(mockTrackScore);

      const result = await useCase.execute('user-123', 'track-123');

      expect(result.trackId).toBe('track-123');
    });

    it('should propagate errors from scoring service', async () => {
      const error = new Error('Scoring calculation failed');
      mockScoringService.calculateFullTrackScore.mockRejectedValue(error);

      await expect(useCase.execute('user-123', 'track-123')).rejects.toThrow(
        'Scoring calculation failed',
      );
    });
  });
});
