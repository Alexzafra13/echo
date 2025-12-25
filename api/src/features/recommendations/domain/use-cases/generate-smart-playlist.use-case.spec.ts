import { GenerateSmartPlaylistUseCase } from './generate-smart-playlist.use-case';
import { ISmartPlaylistGenerator } from '../ports';
import { SmartPlaylistConfig, TrackScore } from '../entities/track-score.entity';

describe('GenerateSmartPlaylistUseCase', () => {
  let useCase: GenerateSmartPlaylistUseCase;
  let mockSmartPlaylistGenerator: jest.Mocked<ISmartPlaylistGenerator>;

  const mockTracks: TrackScore[] = [
    {
      trackId: 'track-1',
      totalScore: 90,
      breakdown: {
        explicitFeedback: 50,
        implicitBehavior: 70,
        recency: 85,
        diversity: 60,
      },
      rank: 1,
    },
    {
      trackId: 'track-2',
      totalScore: 75,
      breakdown: {
        explicitFeedback: 30,
        implicitBehavior: 55,
        recency: 70,
        diversity: 45,
      },
      rank: 2,
    },
  ];

  const mockResult = {
    tracks: mockTracks,
    metadata: {
      totalTracks: 2,
      avgScore: 82.5,
      topGenres: ['indie', 'rock'],
    },
  };

  beforeEach(() => {
    mockSmartPlaylistGenerator = {
      generateSmartPlaylist: jest.fn(),
    };

    useCase = new GenerateSmartPlaylistUseCase(mockSmartPlaylistGenerator);
  });

  describe('execute', () => {
    it('should generate smart playlist for artist', async () => {
      const config: SmartPlaylistConfig = {
        name: 'Artist Playlist',
        artistId: 'artist-123',
        maxTracks: 50,
      };
      mockSmartPlaylistGenerator.generateSmartPlaylist.mockResolvedValue(mockResult);

      const result = await useCase.execute('user-123', config);

      expect(mockSmartPlaylistGenerator.generateSmartPlaylist).toHaveBeenCalledWith('user-123', config);
      expect(result).toEqual(mockResult);
    });

    it('should generate smart playlist for genre', async () => {
      const config: SmartPlaylistConfig = {
        name: 'Genre Mix',
        genreId: 'genre-rock',
        sortBy: 'popularity',
      };
      mockSmartPlaylistGenerator.generateSmartPlaylist.mockResolvedValue(mockResult);

      const result = await useCase.execute('user-123', config);

      expect(mockSmartPlaylistGenerator.generateSmartPlaylist).toHaveBeenCalledWith('user-123', config);
      expect(result.tracks).toHaveLength(2);
    });

    it('should generate smart playlist for mood', async () => {
      const config: SmartPlaylistConfig = {
        name: 'Chill Vibes',
        mood: 'calm',
        description: 'Relaxing tracks',
      };
      mockSmartPlaylistGenerator.generateSmartPlaylist.mockResolvedValue(mockResult);

      const result = await useCase.execute('user-123', config);

      expect(mockSmartPlaylistGenerator.generateSmartPlaylist).toHaveBeenCalledWith('user-123', config);
      expect(result.metadata).toBeDefined();
    });

    it('should apply minimum score filter', async () => {
      const config: SmartPlaylistConfig = {
        name: 'High Score Only',
        minScore: 80,
      };
      mockSmartPlaylistGenerator.generateSmartPlaylist.mockResolvedValue({
        tracks: [mockTracks[0]],
        metadata: { totalTracks: 1, avgScore: 90, topGenres: ['indie'] },
      });

      const result = await useCase.execute('user-123', config);

      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].totalScore).toBeGreaterThanOrEqual(80);
    });

    it('should propagate errors from generator', async () => {
      const config: SmartPlaylistConfig = { name: 'Test' };
      const error = new Error('Playlist generation failed');
      mockSmartPlaylistGenerator.generateSmartPlaylist.mockRejectedValue(error);

      await expect(useCase.execute('user-123', config)).rejects.toThrow('Playlist generation failed');
    });
  });
});
