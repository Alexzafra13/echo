import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAutoPlaylists,
  refreshWaveMix,
  getArtistPlaylistsPaginated,
  getGenrePlaylistsPaginated,
  getDailyMix,
  getSmartPlaylistByArtist,
  getSmartPlaylistByGenre,
  calculateTrackScores,
  type AutoPlaylist,
  type SmartPlaylist,
  type ScoredTrack,
} from '../recommendations.service';
import { apiClient } from '../api';

// Mock the api client
vi.mock('../api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('recommendations.service', () => {
  const mockScoredTrack: ScoredTrack = {
    trackId: 'track-1',
    totalScore: 0.85,
    rank: 1,
    breakdown: {
      explicitFeedback: 0.3,
      implicitBehavior: 0.25,
      recency: 0.2,
      diversity: 0.1,
    },
    track: {
      id: 'track-1',
      title: 'Great Song',
      artistName: 'Test Artist',
      albumName: 'Test Album',
      duration: 240,
      albumId: 'album-1',
      artistId: 'artist-1',
      rgTrackGain: -6.5,
      rgTrackPeak: 0.95,
    },
    album: {
      id: 'album-1',
      title: 'Test Album',
      artist: 'Test Artist',
      cover: '/covers/album-1.jpg',
    },
  };

  const mockAutoPlaylist: AutoPlaylist = {
    id: 'playlist-1',
    type: 'wave-mix',
    userId: 'user-1',
    name: 'Your Wave Mix',
    description: 'A personalized mix based on your listening',
    tracks: [mockScoredTrack],
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-02T00:00:00Z',
    metadata: {
      totalTracks: 50,
      avgScore: 0.75,
      topGenres: ['Rock', 'Alternative'],
      topArtists: ['Artist 1', 'Artist 2'],
      temporalDistribution: {
        lastWeek: 10,
        lastMonth: 20,
        lastYear: 15,
        older: 5,
      },
    },
    coverColor: '#1a1a2e',
  };

  const mockArtistPlaylist: AutoPlaylist = {
    ...mockAutoPlaylist,
    id: 'artist-playlist-1',
    type: 'artist',
    name: 'Test Artist Mix',
    metadata: {
      ...mockAutoPlaylist.metadata,
      artistId: 'artist-1',
      artistName: 'Test Artist',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAutoPlaylists', () => {
    it('should fetch all auto playlists', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: [mockAutoPlaylist, mockArtistPlaylist],
      });

      const result = await getAutoPlaylists();

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations/wave-mix');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('wave-mix');
      expect(result[1].type).toBe('artist');
    });

    it('should handle empty playlists', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      const result = await getAutoPlaylists();

      expect(result).toHaveLength(0);
    });

    it('should handle API error', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(getAutoPlaylists()).rejects.toThrow('Network error');
    });
  });

  describe('refreshWaveMix', () => {
    it('should refresh and return new playlists', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: [mockAutoPlaylist],
      });

      const result = await refreshWaveMix();

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/wave-mix/refresh');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Your Wave Mix');
    });
  });

  describe('getArtistPlaylistsPaginated', () => {
    it('should fetch artist playlists with default pagination', async () => {
      const mockResponse = {
        playlists: [mockArtistPlaylist],
        total: 20,
        hasMore: true,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await getArtistPlaylistsPaginated();

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations/wave-mix/artists', {
        params: { skip: 0, take: 10 },
      });
      expect(result.playlists).toHaveLength(1);
      expect(result.total).toBe(20);
      expect(result.hasMore).toBe(true);
    });

    it('should fetch with custom pagination', async () => {
      const mockResponse = {
        playlists: [],
        total: 20,
        hasMore: false,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await getArtistPlaylistsPaginated(10, 5);

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations/wave-mix/artists', {
        params: { skip: 10, take: 5 },
      });
    });
  });

  describe('getGenrePlaylistsPaginated', () => {
    it('should fetch genre playlists with default pagination', async () => {
      const genrePlaylist: AutoPlaylist = {
        ...mockAutoPlaylist,
        id: 'genre-playlist-1',
        type: 'genre',
        name: 'Rock Mix',
      };
      const mockResponse = {
        playlists: [genrePlaylist],
        total: 15,
        hasMore: true,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await getGenrePlaylistsPaginated();

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations/wave-mix/genres', {
        params: { skip: 0, take: 10 },
      });
      expect(result.playlists[0].type).toBe('genre');
    });

    it('should fetch with custom pagination', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { playlists: [], total: 0, hasMore: false },
      });

      await getGenrePlaylistsPaginated(20, 15);

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations/wave-mix/genres', {
        params: { skip: 20, take: 15 },
      });
    });
  });

  describe('getDailyMix', () => {
    it('should fetch daily mix', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAutoPlaylist });

      const result = await getDailyMix();

      expect(apiClient.get).toHaveBeenCalledWith('/recommendations/daily-mix');
      expect(result.name).toBe('Your Wave Mix');
      expect(result.tracks).toHaveLength(1);
      expect(result.metadata.totalTracks).toBe(50);
    });

    it('should include score breakdown in tracks', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAutoPlaylist });

      const result = await getDailyMix();

      const track = result.tracks[0];
      expect(track.totalScore).toBe(0.85);
      expect(track.breakdown.explicitFeedback).toBe(0.3);
      expect(track.breakdown.implicitBehavior).toBe(0.25);
    });
  });

  describe('getSmartPlaylistByArtist', () => {
    it('should generate smart playlist for artist with default limit', async () => {
      const mockSmartPlaylist: SmartPlaylist = {
        name: 'Autoplay',
        tracks: [mockScoredTrack],
        generatedAt: '2024-01-01T00:00:00Z',
        totalTracks: 20,
        criteria: {
          artistId: 'artist-1',
          limit: 20,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockSmartPlaylist });

      const result = await getSmartPlaylistByArtist('artist-1');

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/smart-playlist', {
        name: 'Autoplay',
        artistId: 'artist-1',
        maxTracks: 20,
      });
      expect(result.criteria.artistId).toBe('artist-1');
      expect(result.totalTracks).toBe(20);
    });

    it('should generate with custom limit', async () => {
      const mockSmartPlaylist: SmartPlaylist = {
        name: 'Autoplay',
        tracks: [],
        generatedAt: '2024-01-01T00:00:00Z',
        totalTracks: 50,
        criteria: {
          artistId: 'artist-1',
          limit: 50,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockSmartPlaylist });

      await getSmartPlaylistByArtist('artist-1', 50);

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/smart-playlist', {
        name: 'Autoplay',
        artistId: 'artist-1',
        maxTracks: 50,
      });
    });
  });

  describe('getSmartPlaylistByGenre', () => {
    it('should generate smart playlist for genre', async () => {
      const mockSmartPlaylist: SmartPlaylist = {
        name: 'Genre Mix',
        tracks: [mockScoredTrack],
        generatedAt: '2024-01-01T00:00:00Z',
        totalTracks: 20,
        criteria: {
          genre: 'rock',
          limit: 20,
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockSmartPlaylist });

      const result = await getSmartPlaylistByGenre('rock');

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/smart-playlist', {
        name: 'Genre Mix',
        genreId: 'rock',
        maxTracks: 20,
      });
      expect(result.name).toBe('Genre Mix');
    });

    it('should generate with custom limit', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          name: 'Genre Mix',
          tracks: [],
          generatedAt: '2024-01-01T00:00:00Z',
          totalTracks: 30,
          criteria: { genre: 'jazz', limit: 30 },
        },
      });

      await getSmartPlaylistByGenre('jazz', 30);

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/smart-playlist', {
        name: 'Genre Mix',
        genreId: 'jazz',
        maxTracks: 30,
      });
    });
  });

  describe('calculateTrackScores', () => {
    it('should calculate scores for multiple tracks', async () => {
      const scoredTracks: ScoredTrack[] = [
        mockScoredTrack,
        {
          ...mockScoredTrack,
          trackId: 'track-2',
          totalScore: 0.72,
          rank: 2,
        },
      ];
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: scoredTracks });

      const result = await calculateTrackScores(['track-1', 'track-2']);

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/calculate-score', {
        trackIds: ['track-1', 'track-2'],
      });
      expect(result).toHaveLength(2);
      expect(result[0].totalScore).toBe(0.85);
      expect(result[1].totalScore).toBe(0.72);
    });

    it('should calculate score for single track', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: [mockScoredTrack] });

      const result = await calculateTrackScores(['track-1']);

      expect(apiClient.post).toHaveBeenCalledWith('/recommendations/calculate-score', {
        trackIds: ['track-1'],
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty input', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: [] });

      const result = await calculateTrackScores([]);

      expect(result).toHaveLength(0);
    });

    it('should include ReplayGain data in track info', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: [mockScoredTrack] });

      const result = await calculateTrackScores(['track-1']);

      expect(result[0].track?.rgTrackGain).toBe(-6.5);
      expect(result[0].track?.rgTrackPeak).toBe(0.95);
    });
  });
});
