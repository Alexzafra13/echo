import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  usePlaylists,
  usePlaylist,
  usePlaylistTracks,
  useCreatePlaylist,
  useUpdatePlaylist,
  useDeletePlaylist,
  useAddTrackToPlaylist,
  useRemoveTrackFromPlaylist,
  useReorderPlaylistTracks,
  usePlaylistsByArtist,
} from '../usePlaylists';
import { playlistsService } from '../../services/playlists.service';
import type { Playlist, PlaylistTrack } from '../../types';

// Mock the playlists service
vi.mock('../../services/playlists.service', () => ({
  playlistsService: {
    getPlaylists: vi.fn(),
    getPlaylist: vi.fn(),
    getPlaylistTracks: vi.fn(),
    createPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    addTrackToPlaylist: vi.fn(),
    removeTrackFromPlaylist: vi.fn(),
    reorderTracks: vi.fn(),
    getPlaylistsByArtist: vi.fn(),
  },
}));

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePlaylists hooks', () => {
  const mockPlaylist: Playlist = {
    id: 'playlist-1',
    name: 'Test Playlist',
    description: 'Test description',
    isPublic: false,
    trackCount: 5,
    totalDuration: 1200,
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockTrack: PlaylistTrack = {
    id: 'track-1',
    trackId: 'original-track-1',
    title: 'Test Song',
    artistName: 'Test Artist',
    albumName: 'Test Album',
    duration: 240,
    position: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePlaylists', () => {
    it('should fetch playlists successfully', async () => {
      const mockResponse = {
        items: [mockPlaylist],
        total: 1,
        skip: 0,
        take: 20,
      };
      vi.mocked(playlistsService.getPlaylists).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => usePlaylists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.items).toHaveLength(1);
      expect(result.current.data?.items[0].name).toBe('Test Playlist');
    });

    it('should pass params to service', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 10,
        take: 5,
      };
      vi.mocked(playlistsService.getPlaylists).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => usePlaylists({ skip: 10, take: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.getPlaylists).toHaveBeenCalledWith({ skip: 10, take: 5 });
    });

    it('should handle error state', async () => {
      const error = new Error('Failed to fetch playlists');
      vi.mocked(playlistsService.getPlaylists).mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePlaylists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('usePlaylist', () => {
    it('should fetch a specific playlist', async () => {
      vi.mocked(playlistsService.getPlaylist).mockResolvedValueOnce(mockPlaylist);

      const { result } = renderHook(() => usePlaylist('playlist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('playlist-1');
      expect(playlistsService.getPlaylist).toHaveBeenCalledWith('playlist-1');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => usePlaylist(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(playlistsService.getPlaylist).not.toHaveBeenCalled();
    });
  });

  describe('usePlaylistTracks', () => {
    it('should fetch playlist tracks', async () => {
      const mockResponse = {
        playlistId: 'playlist-1',
        playlistName: 'Test Playlist',
        tracks: [mockTrack],
        total: 1,
      };
      vi.mocked(playlistsService.getPlaylistTracks).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => usePlaylistTracks('playlist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.tracks).toHaveLength(1);
      expect(result.current.data?.tracks[0].title).toBe('Test Song');
    });

    it('should not fetch when playlistId is empty', () => {
      const { result } = renderHook(() => usePlaylistTracks(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreatePlaylist', () => {
    it('should create a new playlist', async () => {
      vi.mocked(playlistsService.createPlaylist).mockResolvedValueOnce(mockPlaylist);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: 'New Playlist' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.createPlaylist).toHaveBeenCalledWith({ name: 'New Playlist' });
      expect(result.current.data?.name).toBe('Test Playlist');
    });

    it('should handle creation error', async () => {
      const error = new Error('Failed to create');
      vi.mocked(playlistsService.createPlaylist).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: '' });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useUpdatePlaylist', () => {
    it('should update a playlist', async () => {
      const updatedPlaylist = { ...mockPlaylist, name: 'Updated Name' };
      vi.mocked(playlistsService.updatePlaylist).mockResolvedValueOnce(updatedPlaylist);

      const { result } = renderHook(() => useUpdatePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ id: 'playlist-1', dto: { name: 'Updated Name' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.updatePlaylist).toHaveBeenCalledWith('playlist-1', {
        name: 'Updated Name',
      });
    });
  });

  describe('useDeletePlaylist', () => {
    it('should delete a playlist', async () => {
      vi.mocked(playlistsService.deletePlaylist).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('playlist-1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.deletePlaylist).toHaveBeenCalledWith('playlist-1');
    });
  });

  describe('useAddTrackToPlaylist', () => {
    it('should add a track to playlist', async () => {
      vi.mocked(playlistsService.addTrackToPlaylist).mockResolvedValueOnce(mockTrack);

      const { result } = renderHook(() => useAddTrackToPlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        playlistId: 'playlist-1',
        dto: { trackId: 'track-123' },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.addTrackToPlaylist).toHaveBeenCalledWith('playlist-1', {
        trackId: 'track-123',
      });
    });

    it('should add track at specific position', async () => {
      vi.mocked(playlistsService.addTrackToPlaylist).mockResolvedValueOnce({
        ...mockTrack,
        position: 5,
      });

      const { result } = renderHook(() => useAddTrackToPlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        playlistId: 'playlist-1',
        dto: { trackId: 'track-123', position: 5 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.addTrackToPlaylist).toHaveBeenCalledWith('playlist-1', {
        trackId: 'track-123',
        position: 5,
      });
    });
  });

  describe('useRemoveTrackFromPlaylist', () => {
    it('should remove a track from playlist', async () => {
      vi.mocked(playlistsService.removeTrackFromPlaylist).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useRemoveTrackFromPlaylist(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        playlistId: 'playlist-1',
        trackId: 'track-1',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.removeTrackFromPlaylist).toHaveBeenCalledWith(
        'playlist-1',
        'track-1'
      );
    });
  });

  describe('useReorderPlaylistTracks', () => {
    it('should reorder tracks in playlist', async () => {
      vi.mocked(playlistsService.reorderTracks).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useReorderPlaylistTracks(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        playlistId: 'playlist-1',
        dto: { trackId: 'track-1', newPosition: 5 },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.reorderTracks).toHaveBeenCalledWith('playlist-1', {
        trackId: 'track-1',
        newPosition: 5,
      });
    });
  });

  describe('usePlaylistsByArtist', () => {
    it('should fetch playlists by artist', async () => {
      const mockResponse = {
        items: [mockPlaylist],
        total: 1,
        skip: 0,
        take: 20,
      };
      vi.mocked(playlistsService.getPlaylistsByArtist).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => usePlaylistsByArtist('artist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.getPlaylistsByArtist).toHaveBeenCalledWith('artist-1', undefined);
      expect(result.current.data?.items).toHaveLength(1);
    });

    it('should not fetch when artistId is undefined', () => {
      const { result } = renderHook(() => usePlaylistsByArtist(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(playlistsService.getPlaylistsByArtist).not.toHaveBeenCalled();
    });

    it('should pass pagination params', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 10,
        take: 5,
      };
      vi.mocked(playlistsService.getPlaylistsByArtist).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => usePlaylistsByArtist('artist-1', { skip: 10, take: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(playlistsService.getPlaylistsByArtist).toHaveBeenCalledWith('artist-1', {
        skip: 10,
        take: 5,
      });
    });
  });
});
