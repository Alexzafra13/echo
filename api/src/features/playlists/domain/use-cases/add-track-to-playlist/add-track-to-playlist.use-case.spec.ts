import { NotFoundError, ValidationError, ConflictError } from '@shared/errors';
import { AddTrackToPlaylistUseCase } from './add-track-to-playlist.use-case';
import { IPlaylistRepository } from '../../ports';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { Playlist, PlaylistTrack } from '../../entities';
import { Track } from '@features/tracks/domain/entities/track.entity';

describe('AddTrackToPlaylistUseCase', () => {
  let useCase: AddTrackToPlaylistUseCase;
  let playlistRepository: jest.Mocked<IPlaylistRepository>;
  let trackRepository: jest.Mocked<ITrackRepository>;

  // Helper functions to create fresh instances for each test
  const createMockPlaylist = () => Playlist.fromPrimitives({
    id: 'playlist-123',
    name: 'Test Playlist',
    description: undefined,
    coverImageUrl: undefined,
    duration: 180,
    size: Number(1000000),
    ownerId: 'user-123',
    public: false,
    songCount: 1,
    path: undefined,
    sync: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockTrack = () => Track.reconstruct({
    id: 'track-123',
    title: 'Test Track',
    duration: 200,
    size: Number(2000000),
    trackNumber: 1,
    discNumber: 1,
    path: '/music/test.mp3',
    year: 2024,
    artistId: 'artist-123',
    albumId: 'album-123',
    compilation: false,
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
      addTrackWithAutoOrder: jest.fn(),
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
        userId: 'user-123', // Owner del playlist
      };

      const mockPlaylistTrack = PlaylistTrack.fromPrimitives({
        id: 'playlist-track-123',
        playlistId: 'playlist-123',
        trackId: 'track-123',
        trackOrder: 1,
        createdAt: new Date(),
      });

      playlistRepository.findById.mockResolvedValue(createMockPlaylist());
      trackRepository.findById.mockResolvedValue(createMockTrack());
      playlistRepository.isTrackInPlaylist.mockResolvedValue(false);
      playlistRepository.addTrackWithAutoOrder.mockResolvedValue(mockPlaylistTrack);
      playlistRepository.update.mockResolvedValue(createMockPlaylist());

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(playlistRepository.findById).toHaveBeenCalledWith('playlist-123');
      expect(trackRepository.findById).toHaveBeenCalledWith('track-123');
      expect(playlistRepository.isTrackInPlaylist).toHaveBeenCalledWith('playlist-123', 'track-123');
      expect(playlistRepository.addTrackWithAutoOrder).toHaveBeenCalledWith('playlist-123', 'track-123');
      expect(playlistRepository.update).toHaveBeenCalledTimes(1);
      expect(result.playlistId).toBe('playlist-123');
      expect(result.trackId).toBe('track-123');
      expect(result.message).toBe('Track added to playlist successfully');
    });

    it('should use addTrackWithAutoOrder for race-condition safe ordering', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'track-123',
        userId: 'user-123',
      };

      const mockPlaylistTrack = PlaylistTrack.fromPrimitives({
        id: 'playlist-track-123',
        playlistId: 'playlist-123',
        trackId: 'track-123',
        trackOrder: 0,
        createdAt: new Date(),
      });

      playlistRepository.findById.mockResolvedValue(createMockPlaylist());
      trackRepository.findById.mockResolvedValue(createMockTrack());
      playlistRepository.isTrackInPlaylist.mockResolvedValue(false);
      playlistRepository.addTrackWithAutoOrder.mockResolvedValue(mockPlaylistTrack);
      playlistRepository.update.mockResolvedValue(createMockPlaylist());

      // Act
      await useCase.execute(input);

      // Assert
      expect(playlistRepository.addTrackWithAutoOrder).toHaveBeenCalledWith('playlist-123', 'track-123');
    });

    it('should throw error if playlistId is empty', async () => {
      // Arrange
      const input = {
        playlistId: '',
        trackId: 'track-123',
        userId: 'user-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('Playlist ID is required');
      expect(playlistRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if trackId is empty', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: '',
        userId: 'user-123',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(input)).rejects.toThrow('Track ID is required');
    });

    it('should throw error if playlist not found', async () => {
      // Arrange
      const input = {
        playlistId: 'non-existent',
        trackId: 'track-123',
        userId: 'user-123',
      };

      playlistRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow('Playlist with id non-existent not found');
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if track not found', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'non-existent',
        userId: 'user-123',
      };

      playlistRepository.findById.mockResolvedValue(createMockPlaylist());
      trackRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(input)).rejects.toThrow('Track with id non-existent not found');
      expect(playlistRepository.isTrackInPlaylist).not.toHaveBeenCalled();
    });

    it('should throw error if track already in playlist', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'track-123',
        userId: 'user-123',
      };

      playlistRepository.findById.mockResolvedValue(createMockPlaylist());
      trackRepository.findById.mockResolvedValue(createMockTrack());
      playlistRepository.isTrackInPlaylist.mockResolvedValue(true); // Already in playlist

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictError);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Esta canción ya está en la playlist',
      );
      expect(playlistRepository.addTrack).not.toHaveBeenCalled();
    });

    it('should update playlist metadata (duration, size, songCount)', async () => {
      // Arrange
      const input = {
        playlistId: 'playlist-123',
        trackId: 'track-123',
        userId: 'user-123',
      };

      const mockPlaylist = createMockPlaylist();
      const mockTrack = createMockTrack();

      // Save original values before mutation
      const originalDuration = mockPlaylist.duration;
      const originalSize = mockPlaylist.size;
      const originalSongCount = mockPlaylist.songCount;

      const mockPlaylistTrack = PlaylistTrack.fromPrimitives({
        id: 'playlist-track-123',
        playlistId: 'playlist-123',
        trackId: 'track-123',
        trackOrder: 1,
        createdAt: new Date(),
      });

      playlistRepository.findById.mockResolvedValue(mockPlaylist);
      trackRepository.findById.mockResolvedValue(mockTrack);
      playlistRepository.isTrackInPlaylist.mockResolvedValue(false);
      playlistRepository.addTrackWithAutoOrder.mockResolvedValue(mockPlaylistTrack);
      playlistRepository.update.mockResolvedValue(createMockPlaylist());

      // Act
      await useCase.execute(input);

      // Assert
      expect(playlistRepository.update).toHaveBeenCalledTimes(1);

      // Get the actual entity passed to update
      const updateCall = playlistRepository.update.mock.calls[0];
      expect(updateCall[0]).toBe('playlist-123');

      const updatedPlaylist = updateCall[1];
      expect(updatedPlaylist.duration).toBe(originalDuration + (mockTrack.duration ?? 0));
      expect(updatedPlaylist.size).toBe(originalSize + (mockTrack.size ?? 0));
      expect(updatedPlaylist.songCount).toBe(originalSongCount + 1);
    });
  });
});
