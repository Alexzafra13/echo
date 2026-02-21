import { PlaylistMapper } from './playlist.mapper';
import { Playlist, PlaylistTrack } from '../../domain/entities';
import {
  Playlist as PlaylistDb,
  PlaylistTrack as PlaylistTrackDb,
} from '@infrastructure/database/schema/playlists';

describe('PlaylistMapper', () => {
  const mockDbPlaylist: PlaylistDb = {
    id: 'pl-1',
    name: 'My Playlist',
    description: 'Cool songs',
    coverImageUrl: '/covers/pl.jpg',
    duration: 3600,
    size: 100000,
    ownerId: 'user-1',
    public: false,
    songCount: 10,
    path: '/playlists/my-playlist',
    sync: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  };

  describe('toDomain', () => {
    it('should convert DB playlist to domain Playlist', () => {
      const playlist = PlaylistMapper.toDomain(mockDbPlaylist);

      expect(playlist).toBeInstanceOf(Playlist);
      expect(playlist.id).toBe('pl-1');
      expect(playlist.name).toBe('My Playlist');
      expect(playlist.description).toBe('Cool songs');
      expect(playlist.duration).toBe(3600);
      expect(playlist.ownerId).toBe('user-1');
      expect(playlist.public).toBe(false);
      expect(playlist.songCount).toBe(10);
      expect(playlist.sync).toBe(false);
    });

    it('should handle null optional fields', () => {
      const playlist = PlaylistMapper.toDomain({
        ...mockDbPlaylist,
        description: null,
        coverImageUrl: null,
        path: null,
      });

      expect(playlist.description).toBeUndefined();
      expect(playlist.coverImageUrl).toBeUndefined();
      expect(playlist.path).toBeUndefined();
    });
  });

  describe('toPersistence', () => {
    it('should convert domain playlist to persistence', () => {
      const playlist = PlaylistMapper.toDomain(mockDbPlaylist);
      const persistence = PlaylistMapper.toPersistence(playlist);

      expect(persistence.id).toBe('pl-1');
      expect(persistence.name).toBe('My Playlist');
      expect(persistence.ownerId).toBe('user-1');
      expect(persistence.public).toBe(false);
      expect(persistence.songCount).toBe(10);
    });

    it('should convert undefined to null', () => {
      const playlist = PlaylistMapper.toDomain({
        ...mockDbPlaylist,
        description: null,
        coverImageUrl: null,
        path: null,
      });
      const persistence = PlaylistMapper.toPersistence(playlist);

      expect(persistence.description).toBeNull();
      expect(persistence.coverImageUrl).toBeNull();
      expect(persistence.path).toBeNull();
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of DB playlists', () => {
      const playlists = PlaylistMapper.toDomainArray([mockDbPlaylist, mockDbPlaylist]);
      expect(playlists).toHaveLength(2);
      expect(playlists[0]).toBeInstanceOf(Playlist);
    });

    it('should handle empty array', () => {
      expect(PlaylistMapper.toDomainArray([])).toEqual([]);
    });
  });

  describe('playlistTrackToDomain', () => {
    it('should convert DB playlist track to domain', () => {
      const mockDbTrack: PlaylistTrackDb = {
        id: 'pt-1',
        playlistId: 'pl-1',
        trackId: 'track-1',
        trackOrder: 0,
        createdAt: new Date('2024-01-01'),
      };

      const track = PlaylistMapper.playlistTrackToDomain(mockDbTrack);

      expect(track).toBeInstanceOf(PlaylistTrack);
      expect(track.id).toBe('pt-1');
      expect(track.playlistId).toBe('pl-1');
      expect(track.trackId).toBe('track-1');
      expect(track.trackOrder).toBe(0);
    });
  });

  describe('playlistTrackToPersistence', () => {
    it('should convert domain playlist track to persistence', () => {
      const track = PlaylistTrack.fromPrimitives({
        id: 'pt-1',
        playlistId: 'pl-1',
        trackId: 'track-1',
        trackOrder: 3,
        createdAt: new Date(),
      });

      const persistence = PlaylistMapper.playlistTrackToPersistence(track);

      expect(persistence.id).toBe('pt-1');
      expect(persistence.playlistId).toBe('pl-1');
      expect(persistence.trackId).toBe('track-1');
      expect(persistence.trackOrder).toBe(3);
    });
  });
});
