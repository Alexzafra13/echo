import { GenerateWaveMixUseCase } from './generate-wave-mix.use-case';
import { IWaveMixGenerator } from '../ports';
import { AutoPlaylist, WaveMixConfig } from '../entities/track-score.entity';

describe('GenerateWaveMixUseCase', () => {
  let useCase: GenerateWaveMixUseCase;
  let mockWaveMixGenerator: jest.Mocked<IWaveMixGenerator>;

  const mockPlaylist: AutoPlaylist = {
    id: 'playlist-123',
    type: 'wave-mix',
    userId: 'user-123',
    name: 'Wave Mix',
    description: 'Your personalized mix',
    tracks: [
      {
        trackId: 'track-1',
        totalScore: 85,
        breakdown: {
          explicitFeedback: 40,
          implicitBehavior: 60,
          recency: 80,
          diversity: 50,
        },
        rank: 1,
      },
    ],
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    metadata: {
      totalTracks: 1,
      avgScore: 85,
      topGenres: ['rock'],
      topArtists: ['Artist 1'],
      temporalDistribution: {
        lastWeek: 0.4,
        lastMonth: 0.3,
        lastYear: 0.2,
        older: 0.1,
      },
    },
  };

  beforeEach(() => {
    mockWaveMixGenerator = {
      generateWaveMix: jest.fn(),
      getAllAutoPlaylists: jest.fn(),
    };

    useCase = new GenerateWaveMixUseCase(mockWaveMixGenerator);
  });

  describe('execute', () => {
    it('should generate wave mix with default config', async () => {
      mockWaveMixGenerator.generateWaveMix.mockResolvedValue(mockPlaylist);

      const result = await useCase.execute('user-123');

      expect(mockWaveMixGenerator.generateWaveMix).toHaveBeenCalledWith('user-123', undefined);
      expect(result).toEqual(mockPlaylist);
    });

    it('should generate wave mix with custom config', async () => {
      const config: Partial<WaveMixConfig> = {
        maxTracks: 30,
        minScore: 30,
        freshnessRatio: 0.3,
      };
      mockWaveMixGenerator.generateWaveMix.mockResolvedValue(mockPlaylist);

      const result = await useCase.execute('user-123', config);

      expect(mockWaveMixGenerator.generateWaveMix).toHaveBeenCalledWith('user-123', config);
      expect(result).toEqual(mockPlaylist);
    });

    it('should propagate errors from generator', async () => {
      const error = new Error('Generation failed');
      mockWaveMixGenerator.generateWaveMix.mockRejectedValue(error);

      await expect(useCase.execute('user-123')).rejects.toThrow('Generation failed');
    });
  });
});
