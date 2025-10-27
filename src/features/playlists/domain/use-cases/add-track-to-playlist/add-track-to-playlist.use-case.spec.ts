import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AddTrackToPlaylistUseCase } from './add-track-to-playlist.use-case';
import { IPlaylistRepository } from '../../ports';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { Playlist, PlaylistTrack } from '../../entities';
import { Track } from '@features/tracks/domain/entities/track.entity';

describe('AddTrackToPlaylistUseCase', () => {
  let useCase: AddTrackToPlaylistUseCase;
  let playlistRepository: jest.Mocked<IPlaylistRepository>;
  let trackRepository: jest.Mocked<ITrackRepository>;

  const mockPlaylist = Playlist.reconstruct({
    id: 'playlist-123',
    name: 'Test Playlist',
    description: null,
    coverImageUrl: null,
    duration: 180,
    size: BigInt(1000000),
    ownerId: 'user-123',
    public: false,
    songCount: 1,
    path: null,
    sync: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockTrack = Track.reconstruct({
    id: 'track-123',
    title: 'Test Track',
    duration: 200,
    size: BigInt(2000000),
    trackNumber: 1,
    filePath: '/music/test.mp3',
    coverPath: null,
    year: 2024,
    artistId: 'artist-123',
    albumId: 'album-123',
    genre: null,
    format: 'mp3',
    bitrate: 320,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    playlistRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByOwner: jest.fn(),
      findPublic: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      getPlaylistTracks: jest.fn(),
      reorderTracks: jest.fn(),
      isTrackInPlaylist: jest.fn(),
    } as any;

    trackRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByAlbumId: jest.fn(),
      search: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    useCase = new AddTrackToPlaylistUseCase(playlistRepository, trackRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should add track to playlist successfully', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'track-123',
      };

      const mockPlaylistTrack = PlaylistTrack.reconstruct({
        playlistId: 'playlist-123',
        trackId: 'track-123',
        trackOrder: 1,
        createdAt: new Date(),
      });

      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      trackRepository.findById.mockResolvedValue(mockTrack);
      playlistRepository.isTrackInPlaylist.mockResolvedValue(false);
      playlistRepository.getPlaylistTracks.mockResolvedValue([mockPlaylistTrack]);
      playlistRepository.addTrack.mockResolvedValue(mockPlaylistTrack);
      playlistRepository.update.mockResolvedValue(mockPlaylist);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(playlistRepository.findById).toHaveBeenCalledWith('playlist-123');
      expect(trackRepository.findById).toHaveBeenCalledWith('track-123');
      expect(playlistRepository.isTrackInPlaylist).toHaveBeenCalledWith('playlist-123', 'track-123');
      expect(playlistRepository.addTrack).toHaveBeenCalledTimes(1);
      expect(playlistRepository.update).toHaveBeenCalledTimes(1);
      expect(result.playlistId).toBe('playlist-123');
      expect(result.trackId).toBe('track-123');
      expect(result.message).toBe('Track added to playlist successfully');
    });

    it('should set correct track order for first track', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'track-123',
      };

      const mockPlaylistTrack = PlaylistTrack.reconstruct({
        playlistId: 'playlist-123',
        trackId: 'track-123',
        trackOrder: 0,
        createdAt: new Date(),
      });

      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      trackRepository.findById.mockResolvedValue(mockTrack);
      playlistRepository.isTrackInPlaylist.mockResolvedValue(false);
      playlistRepository.getPlaylistTracks.mockResolvedValue([]); // Empty playlist
      playlistRepository.addTrack.mockResolvedValue(mockPlaylistTrack);
      playlistRepository.update.mockResolvedValue(mockPlaylist);

      // Act
      await useCase.execute(input);

      // Assert
      expect(playlistRepository.getPlaylistTracks).toHaveBeenCalledWith('playlist-123');
      expect(playlistRepository.addTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          trackOrder: 0, // First track should have order 0
        }),
      );
    });

    it('should throw error if playlistId is empty', async () => {
      // Arrange
      const input = {
        playlistId: '',
        trackId: 'track-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Playlist ID is required');
      expect(playlistRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if trackId is empty', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: '',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Track ID is required');
    });

    it('should throw error if playlist not found', async () => {
      // Arrange
      const input = {
        playlistId: 'non-existent',
        trackId: 'track-123',
      };

      playlistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('Playlist with ID non-existent not found');
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if track not found', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'non-existent',
      };

      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      trackRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('Track with ID non-existent not found');
      expect(playlistRepository.isTrackInPlaylist).not.toHaveBeenCalled();
    });

    it('should throw error if track already in playlist', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'track-123',
      };

      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      trackRepository.findById.mockResolvedValue(mockTrack);
      playlistRepository.isTrackInPlaylist.mockResolvedValue(true); // Already in playlist

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Track track-123 is already in playlist playlist-123',
      );
      expect(playlistRepository.addTrack).not.toHaveBeenCalled();
    });

    it('should update playlist metadata (duration, size, songCount)', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'track-123',
      };

      const mockPlaylistTrack = PlaylistTrack.reconstruct({
        playlistId: 'playlist-123',
        trackId: 'track-123',
        trackOrder: 1,
        createdAt: new Date(),
      });

      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      trackRepository.findById.mockResolvedValue(mockTrack);
      playlistRepository.isTrackInPlaylist.mockResolvedValue(false);
      playlistRepository.getPlaylistTracks.mockResolvedValue([]);
      playlistRepository.addTrack.mockResolvedValue(mockPlaylistTrack);
      playlistRepository.update.mockResolvedValue(mockPlaylist);

      // Act
      await useCase.execute(input);

      // Assert
      expect(playlistRepository.update).toHaveBeenCalledWith(
        'playlist-123',
        expect.objectContaining({
          duration: mockPlaylist.duration + mockTrack.duration,
          size: mockPlaylist.size + mockTrack.size,
          songCount: mockPlaylist.songCount + 1,
        }),
      );
    });
  });
});
