import { GetAutoPlaylistsUseCase } from './get-auto-playlists.use-case';
import { IWaveMixGenerator } from '../ports';
import { AutoPlaylist } from '../entities/track-score.entity';

describe('GetAutoPlaylistsUseCase', () => {
  let useCase: GetAutoPlaylistsUseCase;
  let mockWaveMixGenerator: jest.Mocked<IWaveMixGenerator>;

  const mockPlaylists: AutoPlaylist[] = [
    {
      id: 'wave-mix-1',
      type: 'wave-mix',
      userId: 'user-123',
      name: 'Your Wave Mix',
      description: 'Personalized mix based on your listening',
      tracks: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        totalTracks: 50,
        avgScore: 75,
        topGenres: ['rock', 'indie'],
        topArtists: ['Artist 1', 'Artist 2'],
        temporalDistribution: {
          lastWeek: 0.4,
          lastMonth: 0.3,
          lastYear: 0.2,
          older: 0.1,
        },
      },
    },
    {
      id: 'artist-mix-1',
      type: 'artist',
      userId: 'user-123',
      name: 'Artist Mix: Radiohead',
      description: 'Your top Radiohead tracks',
      tracks: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      metadata: {
        totalTracks: 30,
        avgScore: 85,
        topGenres: ['alternative'],
        topArtists: ['Radiohead'],
        artistId: 'artist-radiohead',
        artistName: 'Radiohead',
        temporalDistribution: {
          lastWeek: 0.3,
          lastMonth: 0.4,
          lastYear: 0.2,
          older: 0.1,
        },
      },
    },
  ];

  beforeEach(() => {
    mockWaveMixGenerator = {
      generateWaveMix: jest.fn(),
      getAllAutoPlaylists: jest.fn(),
    };

    useCase = new GetAutoPlaylistsUseCase(mockWaveMixGenerator);
  });

  describe('execute', () => {
    it('should return all auto playlists for user', async () => {
      mockWaveMixGenerator.getAllAutoPlaylists.mockResolvedValue(mockPlaylists);

      const result = await useCase.execute('user-123');

      expect(mockWaveMixGenerator.getAllAutoPlaylists).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockPlaylists);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no playlists exist', async () => {
      mockWaveMixGenerator.getAllAutoPlaylists.mockResolvedValue([]);

      const result = await useCase.execute('user-123');

      expect(result).toEqual([]);
    });

    it('should include different playlist types', async () => {
      mockWaveMixGenerator.getAllAutoPlaylists.mockResolvedValue(mockPlaylists);

      const result = await useCase.execute('user-123');

      const types = result.map(p => p.type);
      expect(types).toContain('wave-mix');
      expect(types).toContain('artist');
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Failed to fetch playlists');
      mockWaveMixGenerator.getAllAutoPlaylists.mockRejectedValue(error);

      await expect(useCase.execute('user-123')).rejects.toThrow('Failed to fetch playlists');
    });
  });
});
