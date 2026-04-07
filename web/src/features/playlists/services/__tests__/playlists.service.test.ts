import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playlistsService } from '../playlists.service';
import { apiClient } from '@shared/services/api';
import type { Playlist, PlaylistTrack } from '../../types';

// Mock the api client
vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('playlistsService', () => {
  const mockPlaylist: Playlist = {
    id: 'playlist-1',
    name: 'My Playlist',
    description: 'Test description',
    public: false,
    songCount: 5,
    duration: 1200,
    size: 50000000,
    ownerId: 'user-1',
    ownerName: 'Test User',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockTrack: PlaylistTrack = {
    id: 'track-1',
    title: 'Test Song',
    discNumber: 1,
    duration: 240,
    size: '5000000',
    path: '/music/test.mp3',
    artistName: 'Test Artist',
    albumName: 'Test Album',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlaylists', () => {
    it('should fetch all playlists', async () => {
      const mockResponse = {
        items: [mockPlaylist],
        total: 1,
        skip: 0,
        take: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await playlistsService.getPlaylists();

      expect(apiClient.get).toHaveBeenCalledWith('/playlists', { params: undefined });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('My Playlist');
    });

    it('should pass pagination params', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 10,
        take: 5,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await playlistsService.getPlaylists({ skip: 10, take: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/playlists', {
        params: { skip: 10, take: 5 },
      });
    });

    it('should filter public playlists', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 0,
        take: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await playlistsService.getPlaylists({ publicOnly: true });

      expect(apiClient.get).toHaveBeenCalledWith('/playlists', {
        params: { publicOnly: true },
      });
    });

    it('should handle empty playlists', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 0,
        take: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await playlistsService.getPlaylists();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getPlaylist', () => {
    it('should fetch a specific playlist', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPlaylist });

      const result = await playlistsService.getPlaylist('playlist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/playlists/playlist-1');
      expect(result.id).toBe('playlist-1');
      expect(result.name).toBe('My Playlist');
    });

    it('should throw error for non-existent playlist', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Playlist not found' },
        },
      };
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(playlistsService.getPlaylist('non-existent')).rejects.toEqual(error);
    });
  });

  describe('createPlaylist', () => {
    it('should create a new playlist', async () => {
      const createDto = {
        name: 'New Playlist',
        description: 'A new playlist',
        public: true,
      };
      const createdPlaylist = { ...mockPlaylist, ...createDto };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: createdPlaylist });

      const result = await playlistsService.createPlaylist(createDto);

      expect(apiClient.post).toHaveBeenCalledWith('/playlists', createDto);
      expect(result.name).toBe('New Playlist');
      expect(result.public).toBe(true);
    });

    it('should create playlist with minimal data', async () => {
      const createDto = { name: 'Minimal Playlist' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ...mockPlaylist, name: 'Minimal Playlist' } });

      const result = await playlistsService.createPlaylist(createDto);

      expect(result.name).toBe('Minimal Playlist');
    });

    it('should handle creation error', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid playlist data' },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(playlistsService.createPlaylist({ name: '' })).rejects.toEqual(error);
    });
  });

  describe('updatePlaylist', () => {
    it('should update playlist name', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedPlaylist = { ...mockPlaylist, name: 'Updated Name' };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: updatedPlaylist });

      const result = await playlistsService.updatePlaylist('playlist-1', updateDto);

      expect(apiClient.patch).toHaveBeenCalledWith('/playlists/playlist-1', updateDto);
      expect(result.name).toBe('Updated Name');
    });

    it('should update playlist visibility', async () => {
      const updateDto = { public: true };
      const updatedPlaylist = { ...mockPlaylist, public: true };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: updatedPlaylist });

      const result = await playlistsService.updatePlaylist('playlist-1', updateDto);

      expect(result.public).toBe(true);
    });

    it('should handle update error', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Not authorized to update this playlist' },
        },
      };
      vi.mocked(apiClient.patch).mockRejectedValueOnce(error);

      await expect(
        playlistsService.updatePlaylist('playlist-1', { name: 'New Name' })
      ).rejects.toEqual(error);
    });
  });

  describe('deletePlaylist', () => {
    it('should delete a playlist', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await playlistsService.deletePlaylist('playlist-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/playlists/playlist-1');
    });

    it('should handle delete error', async () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Not authorized to delete this playlist' },
        },
      };
      vi.mocked(apiClient.delete).mockRejectedValueOnce(error);

      await expect(playlistsService.deletePlaylist('playlist-1')).rejects.toEqual(error);
    });
  });

  describe('getPlaylistTracks', () => {
    it('should fetch playlist tracks', async () => {
      const mockResponse = {
        playlistId: 'playlist-1',
        playlistName: 'My Playlist',
        tracks: [mockTrack],
        total: 1,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await playlistsService.getPlaylistTracks('playlist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/playlists/playlist-1/tracks');
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].title).toBe('Test Song');
    });

    it('should handle empty playlist', async () => {
      const mockResponse = {
        playlistId: 'playlist-1',
        playlistName: 'Empty Playlist',
        tracks: [],
        total: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await playlistsService.getPlaylistTracks('playlist-1');

      expect(result.tracks).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('addTrackToPlaylist', () => {
    it('should add a track to playlist', async () => {
      const dto = { trackId: 'track-123' };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockTrack });

      const result = await playlistsService.addTrackToPlaylist('playlist-1', dto);

      expect(apiClient.post).toHaveBeenCalledWith('/playlists/playlist-1/tracks', dto);
      expect(result.title).toBe('Test Song');
    });

    it('should handle duplicate track error', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Track already in playlist' },
        },
      };
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      await expect(
        playlistsService.addTrackToPlaylist('playlist-1', { trackId: 'track-123' })
      ).rejects.toEqual(error);
    });
  });

  describe('removeTrackFromPlaylist', () => {
    it('should remove a track from playlist', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: {} });

      await playlistsService.removeTrackFromPlaylist('playlist-1', 'track-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/playlists/playlist-1/tracks/track-1');
    });

    it('should handle non-existent track error', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Track not found in playlist' },
        },
      };
      vi.mocked(apiClient.delete).mockRejectedValueOnce(error);

      await expect(
        playlistsService.removeTrackFromPlaylist('playlist-1', 'non-existent')
      ).rejects.toEqual(error);
    });
  });

  describe('reorderTracks', () => {
    it('should reorder tracks in playlist', async () => {
      const dto = {
        trackOrders: [
          { trackId: 'track-1', order: 0 },
          { trackId: 'track-2', order: 1 },
        ],
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} });

      await playlistsService.reorderTracks('playlist-1', dto);

      expect(apiClient.post).toHaveBeenCalledWith('/playlists/playlist-1/tracks/reorder', dto);
    });
  });

  describe('getPlaylistsByArtist', () => {
    it('should fetch playlists by artist', async () => {
      const mockResponse = {
        items: [mockPlaylist],
        total: 1,
        skip: 0,
        take: 20,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await playlistsService.getPlaylistsByArtist('artist-1');

      expect(apiClient.get).toHaveBeenCalledWith('/playlists/by-artist/artist-1', {
        params: undefined,
      });
      expect(result.items).toHaveLength(1);
    });

    it('should pass pagination params', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 10,
        take: 5,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      await playlistsService.getPlaylistsByArtist('artist-1', { skip: 10, take: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/playlists/by-artist/artist-1', {
        params: { skip: 10, take: 5 },
      });
    });
  });
});
