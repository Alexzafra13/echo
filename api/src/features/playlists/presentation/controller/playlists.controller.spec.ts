import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistsController } from './playlists.controller';
import {
  CreatePlaylistUseCase,
  GetPlaylistUseCase,
  GetPlaylistsUseCase,
  GetPlaylistsByArtistUseCase,
  UpdatePlaylistUseCase,
  DeletePlaylistUseCase,
  AddTrackToPlaylistUseCase,
  RemoveTrackFromPlaylistUseCase,
  GetPlaylistTracksUseCase,
  ReorderPlaylistTracksUseCase,
} from '../../domain/use-cases';
import { Playlist } from '../../domain/entities/playlist.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';

describe('PlaylistsController', () => {
  let controller: PlaylistsController;
  let createPlaylistUseCase: jest.Mocked<CreatePlaylistUseCase>;
  let getPlaylistUseCase: jest.Mocked<GetPlaylistUseCase>;
  let getPlaylistsUseCase: jest.Mocked<GetPlaylistsUseCase>;
  let getPlaylistsByArtistUseCase: jest.Mocked<GetPlaylistsByArtistUseCase>;
  let updatePlaylistUseCase: jest.Mocked<UpdatePlaylistUseCase>;
  let deletePlaylistUseCase: jest.Mocked<DeletePlaylistUseCase>;
  let addTrackToPlaylistUseCase: jest.Mocked<AddTrackToPlaylistUseCase>;
  let removeTrackFromPlaylistUseCase: jest.Mocked<RemoveTrackFromPlaylistUseCase>;
  let getPlaylistTracksUseCase: jest.Mocked<GetPlaylistTracksUseCase>;
  let reorderPlaylistTracksUseCase: jest.Mocked<ReorderPlaylistTracksUseCase>;

  const mockPlaylist = Playlist.fromPrimitives({
    id: 'playlist-1',
    name: 'My Favorites',
    description: 'A collection of my favorite songs',
    ownerId: 'user-1',
    public: true,
    coverImageUrl: 'https://example.com/cover.jpg',
    songCount: 10,
    duration: 2400,
    size: 100000000,
    sync: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  const mockTrack = Track.reconstruct({
    id: 'track-1',
    title: 'Come Together',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    albumId: 'album-1',
    albumName: 'Abbey Road',
    duration: 259,
    trackNumber: 1,
    discNumber: 1,
    path: '/music/beatles/abbey-road/01-come-together.flac',
    bitrate: 1411,
    sampleRate: 44100,
    channels: 2,
    codec: 'flac',
    size: Number(45000000),
    mimeType: 'audio/flac',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  const mockRequestWithUser = {
    user: { id: 'user-1', username: 'testuser' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaylistsController],
      providers: [
        { provide: CreatePlaylistUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPlaylistUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPlaylistsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPlaylistsByArtistUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdatePlaylistUseCase, useValue: { execute: jest.fn() } },
        { provide: DeletePlaylistUseCase, useValue: { execute: jest.fn() } },
        { provide: AddTrackToPlaylistUseCase, useValue: { execute: jest.fn() } },
        { provide: RemoveTrackFromPlaylistUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPlaylistTracksUseCase, useValue: { execute: jest.fn() } },
        { provide: ReorderPlaylistTracksUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<PlaylistsController>(PlaylistsController);
    createPlaylistUseCase = module.get(CreatePlaylistUseCase);
    getPlaylistUseCase = module.get(GetPlaylistUseCase);
    getPlaylistsUseCase = module.get(GetPlaylistsUseCase);
    getPlaylistsByArtistUseCase = module.get(GetPlaylistsByArtistUseCase);
    updatePlaylistUseCase = module.get(UpdatePlaylistUseCase);
    deletePlaylistUseCase = module.get(DeletePlaylistUseCase);
    addTrackToPlaylistUseCase = module.get(AddTrackToPlaylistUseCase);
    removeTrackFromPlaylistUseCase = module.get(RemoveTrackFromPlaylistUseCase);
    getPlaylistTracksUseCase = module.get(GetPlaylistTracksUseCase);
    reorderPlaylistTracksUseCase = module.get(ReorderPlaylistTracksUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPlaylist', () => {
    it('debería crear una nueva playlist', async () => {
      // Arrange
      createPlaylistUseCase.execute.mockResolvedValue(mockPlaylist);

      // Act
      const result = await controller.createPlaylist(
        {
          name: 'My Favorites',
          description: 'A collection of my favorite songs',
          public: true,
        },
        mockRequestWithUser as any,
      );

      // Assert
      expect(createPlaylistUseCase.execute).toHaveBeenCalledWith({
        name: 'My Favorites',
        description: 'A collection of my favorite songs',
        coverImageUrl: undefined,
        ownerId: 'user-1',
        public: true,
      });
      expect(result.id).toBe('playlist-1');
      expect(result.name).toBe('My Favorites');
    });
  });

  describe('getPlaylist', () => {
    it('debería retornar una playlist por ID', async () => {
      // Arrange
      getPlaylistUseCase.execute.mockResolvedValue(mockPlaylist);

      // Act
      const result = await controller.getPlaylist('playlist-1', mockRequestWithUser as any);

      // Assert
      expect(getPlaylistUseCase.execute).toHaveBeenCalledWith({
        id: 'playlist-1',
        requesterId: 'user-1',
      });
      expect(result.id).toBe('playlist-1');
    });
  });

  describe('getPlaylists', () => {
    it('debería retornar lista de playlists del usuario', async () => {
      // Arrange
      const mockListItem = {
        id: 'playlist-1',
        name: 'My Favorites',
        description: 'A collection of my favorite songs',
        ownerId: 'user-1',
        public: true,
        coverImageUrl: 'https://example.com/cover.jpg',
        songCount: 10,
        duration: 2400,
        size: 100000000,
        albumIds: [],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };
      getPlaylistsUseCase.execute.mockResolvedValue({
        items: [mockListItem],
        total: 1,
        skip: 0,
        take: 20,
      });

      // Act
      const result = await controller.getPlaylists(0, 20, false, mockRequestWithUser);

      // Assert
      expect(getPlaylistsUseCase.execute).toHaveBeenCalledWith({
        ownerId: 'user-1',
        publicOnly: false,
        skip: 0,
        take: 20,
      });
      expect(result.items).toHaveLength(1);
    });

    it('debería filtrar solo playlists públicas', async () => {
      // Arrange
      getPlaylistsUseCase.execute.mockResolvedValue({
        items: [],
        total: 0,
        skip: 0,
        take: 20,
      });

      // Act
      await controller.getPlaylists(0, 20, true, mockRequestWithUser);

      // Assert
      expect(getPlaylistsUseCase.execute).toHaveBeenCalledWith({
        ownerId: undefined,
        publicOnly: true,
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getPlaylistsByArtist', () => {
    it('debería retornar playlists que contienen canciones del artista', async () => {
      // Arrange
      const mockListItem = {
        id: 'playlist-1',
        name: 'My Favorites',
        description: 'A collection of my favorite songs',
        ownerId: 'user-1',
        public: true,
        coverImageUrl: 'https://example.com/cover.jpg',
        songCount: 10,
        duration: 2400,
        size: 100000000,
        albumIds: [],
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };
      getPlaylistsByArtistUseCase.execute.mockResolvedValue({
        items: [mockListItem],
        total: 1,
        skip: 0,
        take: 20,
      });

      // Act
      const result = await controller.getPlaylistsByArtist('artist-1', 0, 20);

      // Assert
      expect(getPlaylistsByArtistUseCase.execute).toHaveBeenCalledWith({
        artistId: 'artist-1',
        skip: 0,
        take: 20,
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('updatePlaylist', () => {
    it('debería actualizar una playlist', async () => {
      // Arrange
      const updatedPlaylist = Playlist.fromPrimitives({
        ...mockPlaylist.toPrimitives(),
        name: 'Updated Name',
      });
      updatePlaylistUseCase.execute.mockResolvedValue(updatedPlaylist);

      // Act
      const result = await controller.updatePlaylist(
        'playlist-1',
        { name: 'Updated Name' },
        mockRequestWithUser as any,
      );

      // Assert
      expect(updatePlaylistUseCase.execute).toHaveBeenCalledWith({
        id: 'playlist-1',
        userId: 'user-1',
        name: 'Updated Name',
        description: undefined,
        coverImageUrl: undefined,
        public: undefined,
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deletePlaylist', () => {
    it('debería eliminar una playlist', async () => {
      // Arrange
      deletePlaylistUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Playlist deleted successfully',
      });

      // Act
      const result = await controller.deletePlaylist('playlist-1', mockRequestWithUser as any);

      // Assert
      expect(deletePlaylistUseCase.execute).toHaveBeenCalledWith({
        id: 'playlist-1',
        userId: 'user-1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getPlaylistTracks', () => {
    it('debería retornar tracks de una playlist', async () => {
      // Arrange
      getPlaylistTracksUseCase.execute.mockResolvedValue({
        playlistId: 'playlist-1',
        tracks: [{ track: mockTrack, order: 1 }],
        totalCount: 1,
      });

      // Act
      const result = await controller.getPlaylistTracks('playlist-1');

      // Assert
      expect(getPlaylistTracksUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
      });
      expect(result.tracks).toHaveLength(1);
    });
  });

  describe('addTrackToPlaylist', () => {
    it('debería agregar un track a la playlist', async () => {
      // Arrange
      addTrackToPlaylistUseCase.execute.mockResolvedValue({
        playlistId: 'playlist-1',
        trackId: 'track-1',
        trackOrder: 11,
        createdAt: new Date(),
        message: 'Track added successfully',
      });

      // Act
      const result = await controller.addTrackToPlaylist(
        'playlist-1',
        { trackId: 'track-1' },
        mockRequestWithUser as any,
      );

      // Assert
      expect(addTrackToPlaylistUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
        trackId: 'track-1',
        userId: 'user-1',
      });
      expect(result.trackId).toBe('track-1');
    });
  });

  describe('removeTrackFromPlaylist', () => {
    it('debería remover un track de la playlist', async () => {
      // Arrange
      removeTrackFromPlaylistUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Track removed successfully',
      });

      // Act
      const result = await controller.removeTrackFromPlaylist(
        'playlist-1',
        'track-1',
        mockRequestWithUser as any,
      );

      // Assert
      expect(removeTrackFromPlaylistUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
        trackId: 'track-1',
        userId: 'user-1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('reorderPlaylistTracks', () => {
    it('debería reordenar los tracks de la playlist', async () => {
      // Arrange
      reorderPlaylistTracksUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Tracks reordered successfully',
        playlistId: 'playlist-1',
      });

      // Act
      const result = await controller.reorderPlaylistTracks(
        'playlist-1',
        { trackOrders: [{ trackId: 'track-1', order: 2 }, { trackId: 'track-2', order: 1 }] },
        mockRequestWithUser as any,
      );

      // Assert
      expect(reorderPlaylistTracksUseCase.execute).toHaveBeenCalledWith({
        playlistId: 'playlist-1',
        trackOrders: [{ trackId: 'track-1', order: 2 }, { trackId: 'track-2', order: 1 }],
        userId: 'user-1',
      });
      expect(result.success).toBe(true);
    });
  });
});
