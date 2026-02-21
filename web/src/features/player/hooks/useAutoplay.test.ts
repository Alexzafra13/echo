import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoplay } from './useAutoplay';

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock artists service
vi.mock('@features/artists/services/artists.service', () => ({
  artistsService: {
    getRelatedArtists: vi.fn(),
  },
}));

// Mock recommendations service
vi.mock('@shared/services/recommendations.service', () => ({
  getSmartPlaylistByArtist: vi.fn(),
}));

import { artistsService } from '@features/artists/services/artists.service';
import { getSmartPlaylistByArtist } from '@shared/services/recommendations.service';

describe('useAutoplay', () => {
  const mockRelatedArtists = {
    source: 'lastfm',
    data: [
      { id: 'artist-1', name: 'Similar Artist 1' },
      { id: 'artist-2', name: 'Similar Artist 2' },
    ],
  };

  const mockPlaylistTracks = {
    tracks: [
      {
        track: {
          id: 'track-1',
          title: 'Track 1',
          artistName: 'Similar Artist 1',
          albumName: 'Album 1',
          duration: 180,
          albumId: 'album-1',
          artistId: 'artist-1',
        },
      },
      {
        track: {
          id: 'track-2',
          title: 'Track 2',
          artistName: 'Similar Artist 1',
          albumName: 'Album 1',
          duration: 200,
          albumId: 'album-1',
          artistId: 'artist-1',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(artistsService.getRelatedArtists).mockResolvedValue(mockRelatedArtists);
    vi.mocked(getSmartPlaylistByArtist).mockResolvedValue(mockPlaylistTracks);
  });

  describe('initialization', () => {
    it('should initialize with loading as false', () => {
      const { result } = renderHook(() => useAutoplay());

      expect(result.current.isLoading()).toBe(false);
    });

    it('should initialize with prefetching as false', () => {
      const { result } = renderHook(() => useAutoplay());

      expect(result.current.isPrefetching()).toBe(false);
    });

    it('should return prefetch threshold of 3', () => {
      const { result } = renderHook(() => useAutoplay());

      expect(result.current.getPrefetchThreshold()).toBe(3);
    });
  });

  describe('loadSimilarArtistTracks', () => {
    it('should load tracks from similar artists', async () => {
      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[]; sourceArtistName: string | null } = {
        tracks: [],
        sourceArtistName: null,
      };

      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      expect(loadResult.tracks.length).toBeGreaterThan(0);
      expect(artistsService.getRelatedArtists).toHaveBeenCalledWith('current-artist-id', 5);
    });

    it('should convert tracks to player format', async () => {
      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[]; sourceArtistName: string | null } = {
        tracks: [],
        sourceArtistName: null,
      };

      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      const track = loadResult.tracks[0];
      expect(track).toHaveProperty('id');
      expect(track).toHaveProperty('title');
      expect(track).toHaveProperty('artist');
      expect(track).toHaveProperty('albumId');
    });

    it('should return source artist name', async () => {
      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[]; sourceArtistName: string | null } = {
        tracks: [],
        sourceArtistName: null,
      };

      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      expect(loadResult.sourceArtistName).toBe('Similar Artist 1');
    });

    it('should return empty array when no related artists found', async () => {
      vi.mocked(artistsService.getRelatedArtists).mockResolvedValue({
        source: 'lastfm',
        data: [],
      });

      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[]; sourceArtistName: string | null } = {
        tracks: [],
        sourceArtistName: null,
      };

      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      expect(loadResult.tracks).toHaveLength(0);
      expect(loadResult.sourceArtistName).toBeNull();
    });

    it('should return empty when already loading', async () => {
      // Make the service slow
      vi.mocked(artistsService.getRelatedArtists).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockRelatedArtists), 1000))
      );

      const { result } = renderHook(() => useAutoplay());

      // Start first load (don't await)
      const firstLoad = result.current.loadSimilarArtistTracks('artist-1');

      // Try second load while first is in progress
      let secondResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        secondResult = await result.current.loadSimilarArtistTracks('artist-2');
      });

      // Second should return empty because first is still loading
      expect(secondResult.tracks).toHaveLength(0);

      // Wait for first to complete
      await act(async () => {
        await firstLoad;
      });
    });

    it('should exclude specified track IDs', async () => {
      const { result } = renderHook(() => useAutoplay());

      const excludeIds = new Set(['track-1']);

      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id', excludeIds);
      });

      // track-1 should be excluded
      const hasExcludedTrack = loadResult.tracks.some((t) => t.id === 'track-1');
      expect(hasExcludedTrack).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(artistsService.getRelatedArtists).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[]; sourceArtistName: string | null } = {
        tracks: [],
        sourceArtistName: null,
      };

      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      expect(loadResult.tracks).toHaveLength(0);
      expect(loadResult.sourceArtistName).toBeNull();
    });
  });

  describe('prefetchSimilarArtistTracks', () => {
    it('should prefetch tracks in background', async () => {
      const { result } = renderHook(() => useAutoplay());

      await act(async () => {
        await result.current.prefetchSimilarArtistTracks('current-artist-id');
      });

      expect(artistsService.getRelatedArtists).toHaveBeenCalled();
      expect(result.current.isPrefetching()).toBe(false); // Should be done
    });

    it('should use prefetched data when loading', async () => {
      const { result } = renderHook(() => useAutoplay());

      // First prefetch
      await act(async () => {
        await result.current.prefetchSimilarArtistTracks('current-artist-id');
      });

      // Clear mocks to verify we don't call API again
      vi.clearAllMocks();

      // Now load - should use cached data
      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      // Should NOT call API again
      expect(artistsService.getRelatedArtists).not.toHaveBeenCalled();
      // But should return tracks
      expect(loadResult.tracks.length).toBeGreaterThan(0);
    });

    it('should not prefetch if already prefetching', async () => {
      // Make prefetch slow
      vi.mocked(artistsService.getRelatedArtists).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockRelatedArtists), 500))
      );

      const { result } = renderHook(() => useAutoplay());

      // Start prefetch (don't await)
      const firstPrefetch = result.current.prefetchSimilarArtistTracks('artist-1');

      // Try second prefetch
      await act(async () => {
        await result.current.prefetchSimilarArtistTracks('artist-2');
      });

      // Should only have called once
      expect(artistsService.getRelatedArtists).toHaveBeenCalledTimes(1);

      // Wait for first to complete
      await act(async () => {
        await firstPrefetch;
      });
    });

    it('should not prefetch if already have cached data for same artist', async () => {
      const { result } = renderHook(() => useAutoplay());

      // First prefetch
      await act(async () => {
        await result.current.prefetchSimilarArtistTracks('current-artist-id');
      });

      vi.clearAllMocks();

      // Second prefetch for same artist
      await act(async () => {
        await result.current.prefetchSimilarArtistTracks('current-artist-id');
      });

      // Should not call API again
      expect(artistsService.getRelatedArtists).not.toHaveBeenCalled();
    });
  });

  describe('resetSession', () => {
    it('should clear played track IDs', async () => {
      const { result } = renderHook(() => useAutoplay());

      // Load some tracks to populate played IDs
      await act(async () => {
        await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      // Reset session
      act(() => {
        result.current.resetSession();
      });

      // Now the same tracks should be available again
      // (verified by loading again with same excludes)
      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      // Should get tracks (not excluded by previous session)
      expect(loadResult.tracks.length).toBeGreaterThan(0);
    });

    it('should clear prefetched cache', async () => {
      const { result } = renderHook(() => useAutoplay());

      // Prefetch
      await act(async () => {
        await result.current.prefetchSimilarArtistTracks('current-artist-id');
      });

      // Reset session
      act(() => {
        result.current.resetSession();
      });

      // Clear mocks
      vi.clearAllMocks();

      // Load should now fetch fresh (cache was cleared)
      await act(async () => {
        await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      // Should have called API again
      expect(artistsService.getRelatedArtists).toHaveBeenCalled();
    });
  });

  describe('track conversion', () => {
    it('should handle missing artist name', async () => {
      vi.mocked(getSmartPlaylistByArtist).mockResolvedValue({
        tracks: [
          {
            track: {
              id: 'track-no-artist',
              title: 'Track Without Artist',
              // artistName is undefined
              albumName: 'Album',
              duration: 180,
              albumId: 'album-1',
            },
          },
        ],
      });

      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      expect(loadResult.tracks[0].artist).toBe('Artista desconocido');
    });

    it('should generate cover image URL from albumId', async () => {
      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      expect(loadResult.tracks[0].coverImage).toBe('/api/images/albums/album-1/cover');
    });
  });

  describe('edge cases', () => {
    it('should handle null tracks in playlist', async () => {
      vi.mocked(getSmartPlaylistByArtist).mockResolvedValue({
        tracks: [
          { track: null },
          {
            track: {
              id: 'valid-track',
              title: 'Valid Track',
              artistName: 'Artist',
              albumId: 'album-1',
            },
          },
        ],
      });

      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      // Should only include valid tracks
      expect(loadResult.tracks.length).toBe(1);
      expect(loadResult.tracks[0].id).toBe('valid-track');
    });

    it('should handle empty playlist from artist', async () => {
      vi.mocked(getSmartPlaylistByArtist).mockResolvedValue({
        tracks: [],
      });

      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      expect(loadResult.tracks).toHaveLength(0);
    });

    it('should try multiple artists if first has no tracks', async () => {
      let callCount = 0;
      vi.mocked(getSmartPlaylistByArtist).mockImplementation(async (artistId) => {
        callCount++;
        if (artistId === 'artist-1') {
          return { tracks: [] }; // First artist has no tracks
        }
        return mockPlaylistTracks; // Second artist has tracks
      });

      const { result } = renderHook(() => useAutoplay());

      let loadResult: { tracks: any[] } = { tracks: [] };
      await act(async () => {
        loadResult = await result.current.loadSimilarArtistTracks('current-artist-id');
      });

      // Should have tried multiple artists
      expect(callCount).toBeGreaterThan(1);
      // Should eventually get tracks
      expect(loadResult.tracks.length).toBeGreaterThan(0);
    });
  });
});
