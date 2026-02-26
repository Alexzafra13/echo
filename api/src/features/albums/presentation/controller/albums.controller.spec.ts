import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { AlbumsController } from './albums.controller';
import { GetAlbumUseCase } from '../../domain/use-cases/get-album/get-album.use-case';
import { GetAlbumsUseCase } from '../../domain/use-cases/get-albums/get-albums.use-case';
import { SearchAlbumsUseCase } from '../../domain/use-cases/search-albums/search-albums.use-case';
import { GetRecentAlbumsUseCase } from '../../domain/use-cases/get-recent-albums/get-recent-albums.use-case';
import { GetTopPlayedAlbumsUseCase } from '../../domain/use-cases/get-top-played-albums/get-top-played-albums.use-case';
import { GetFeaturedAlbumUseCase } from '../../domain/use-cases/get-featured-album/get-featured-album.use-case';
import { GetAlbumTracksUseCase } from '../../domain/use-cases/get-album-tracks/get-album-tracks.use-case';
import { GetAlbumCoverUseCase } from '../../domain/use-cases/get-album-cover/get-album-cover.use-case';
import { GetAlbumsAlphabeticallyUseCase } from '../../domain/use-cases/get-albums-alphabetically/get-albums-alphabetically.use-case';
import { GetAlbumsByArtistUseCase } from '../../domain/use-cases/get-albums-by-artist/get-albums-by-artist.use-case';
import { GetRecentlyPlayedAlbumsUseCase } from '../../domain/use-cases/get-recently-played-albums/get-recently-played-albums.use-case';
import { GetFavoriteAlbumsUseCase } from '../../domain/use-cases/get-favorite-albums/get-favorite-albums.use-case';
import { GetUserTopPlayedAlbumsUseCase } from '../../domain/use-cases/get-user-top-played-albums/get-user-top-played-albums.use-case';
import { Album } from '../../domain/entities/album.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { NotFoundException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { JwtUser } from '@shared/types/request.types';

describe('AlbumsController', () => {
  let controller: AlbumsController;
  let getAlbumUseCase: jest.Mocked<GetAlbumUseCase>;
  let getAlbumsUseCase: jest.Mocked<GetAlbumsUseCase>;
  let searchAlbumsUseCase: jest.Mocked<SearchAlbumsUseCase>;
  let getRecentAlbumsUseCase: jest.Mocked<GetRecentAlbumsUseCase>;
  let getTopPlayedAlbumsUseCase: jest.Mocked<GetTopPlayedAlbumsUseCase>;
  let getFeaturedAlbumUseCase: jest.Mocked<GetFeaturedAlbumUseCase>;
  let getAlbumTracksUseCase: jest.Mocked<GetAlbumTracksUseCase>;
  let getAlbumCoverUseCase: jest.Mocked<GetAlbumCoverUseCase>;
  let getAlbumsAlphabeticallyUseCase: jest.Mocked<GetAlbumsAlphabeticallyUseCase>;
  let getAlbumsByArtistUseCase: jest.Mocked<GetAlbumsByArtistUseCase>;
  let getRecentlyPlayedAlbumsUseCase: jest.Mocked<GetRecentlyPlayedAlbumsUseCase>;
  let getFavoriteAlbumsUseCase: jest.Mocked<GetFavoriteAlbumsUseCase>;

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'Abbey Road',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    albumArtistId: 'artist-1',
    coverArtPath: '/covers/abbey-road.jpg',
    year: 1969,
    releaseDate: new Date('1969-09-26'),
    compilation: false,
    songCount: 17,
    duration: 2820,
    size: Number(125000000),
    description: 'The eleventh studio album',
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

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumsController],
      providers: [
        { provide: GetAlbumUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: SearchAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetRecentAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetTopPlayedAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetFeaturedAlbumUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAlbumTracksUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAlbumCoverUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAlbumsAlphabeticallyUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAlbumsByArtistUseCase, useValue: { execute: jest.fn() } },
        { provide: GetRecentlyPlayedAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetFavoriteAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetUserTopPlayedAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: getLoggerToken(AlbumsController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<AlbumsController>(AlbumsController);
    getAlbumUseCase = module.get(GetAlbumUseCase);
    getAlbumsUseCase = module.get(GetAlbumsUseCase);
    searchAlbumsUseCase = module.get(SearchAlbumsUseCase);
    getRecentAlbumsUseCase = module.get(GetRecentAlbumsUseCase);
    getTopPlayedAlbumsUseCase = module.get(GetTopPlayedAlbumsUseCase);
    getFeaturedAlbumUseCase = module.get(GetFeaturedAlbumUseCase);
    getAlbumTracksUseCase = module.get(GetAlbumTracksUseCase);
    getAlbumCoverUseCase = module.get(GetAlbumCoverUseCase);
    getAlbumsAlphabeticallyUseCase = module.get(GetAlbumsAlphabeticallyUseCase);
    getAlbumsByArtistUseCase = module.get(GetAlbumsByArtistUseCase);
    getRecentlyPlayedAlbumsUseCase = module.get(GetRecentlyPlayedAlbumsUseCase);
    getFavoriteAlbumsUseCase = module.get(GetFavoriteAlbumsUseCase);
  });

  describe('getAlbum', () => {
    it('debería retornar un álbum por ID', async () => {
      // Arrange
      getAlbumUseCase.execute.mockResolvedValue(mockAlbum.toPrimitives());

      // Act
      const result = await controller.getAlbum('album-1');

      // Assert
      expect(getAlbumUseCase.execute).toHaveBeenCalledWith({ id: 'album-1' });
      expect(result.id).toBe('album-1');
      expect(result.name).toBe('Abbey Road');
    });
  });

  describe('getAlbums', () => {
    it('debería retornar lista paginada de álbumes', async () => {
      // Arrange
      getAlbumsUseCase.execute.mockResolvedValue({
        data: [mockAlbum.toPrimitives()],
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      const result = await controller.getAlbums('0', '10');

      // Assert
      expect(getAlbumsUseCase.execute).toHaveBeenCalledWith({ skip: 0, take: 10 });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getRecentAlbums', () => {
    it('debería retornar álbumes recientes', async () => {
      // Arrange
      getRecentAlbumsUseCase.execute.mockResolvedValue([mockAlbum.toPrimitives()]);

      // Act
      const result = await controller.getRecentAlbums('12');

      // Assert
      expect(getRecentAlbumsUseCase.execute).toHaveBeenCalledWith({ take: 12 });
      expect(result).toHaveLength(1);
    });

    it('debería usar take por defecto de 12', async () => {
      // Arrange
      getRecentAlbumsUseCase.execute.mockResolvedValue([]);

      // Act
      await controller.getRecentAlbums();

      // Assert
      expect(getRecentAlbumsUseCase.execute).toHaveBeenCalledWith({ take: 12 });
    });
  });

  describe('getTopPlayedAlbums', () => {
    it('debería retornar álbumes más reproducidos', async () => {
      // Arrange
      getTopPlayedAlbumsUseCase.execute.mockResolvedValue([mockAlbum.toPrimitives()]);

      // Act
      const result = await controller.getTopPlayedAlbums('10');

      // Assert
      expect(getTopPlayedAlbumsUseCase.execute).toHaveBeenCalledWith({ take: 10 });
      expect(result).toHaveLength(1);
    });
  });

  describe('getFeaturedAlbum', () => {
    it('debería retornar el álbum destacado', async () => {
      // Arrange
      getFeaturedAlbumUseCase.execute.mockResolvedValue(mockAlbum.toPrimitives());

      // Act
      const result = await controller.getFeaturedAlbum();

      // Assert
      expect(getFeaturedAlbumUseCase.execute).toHaveBeenCalled();
      expect(result.id).toBe('album-1');
    });

    it('debería lanzar NotFoundException si no hay álbumes', async () => {
      // Arrange
      getFeaturedAlbumUseCase.execute.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.getFeaturedAlbum()).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAlbumTracks', () => {
    it('debería retornar tracks del álbum', async () => {
      // Arrange
      getAlbumTracksUseCase.execute.mockResolvedValue({ tracks: [mockTrack] });

      // Act
      const result = await controller.getAlbumTracks('album-1');

      // Assert
      expect(getAlbumTracksUseCase.execute).toHaveBeenCalledWith({ albumId: 'album-1' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Come Together');
    });
  });

  describe('getAlbumCover', () => {
    it('debería servir el cover art del álbum', async () => {
      // Arrange
      const mockBuffer = Buffer.from('fake-image');
      getAlbumCoverUseCase.execute.mockResolvedValue({
        buffer: mockBuffer,
        mimeType: 'image/jpeg',
        fileSize: mockBuffer.length,
      });

      const mockRes = {
        headers: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await controller.getAlbumCover('album-1', mockRes as unknown as FastifyReply);

      // Assert
      expect(getAlbumCoverUseCase.execute).toHaveBeenCalledWith({ albumId: 'album-1' });
      expect(mockRes.headers).toHaveBeenCalledWith({
        'Content-Type': 'image/jpeg',
        'Content-Length': mockBuffer.length.toString(),
        'Cache-Control': 'public, max-age=2592000',
      });
      expect(mockRes.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('searchAlbums', () => {
    it('debería buscar álbumes por query', async () => {
      // Arrange
      searchAlbumsUseCase.execute.mockResolvedValue({
        data: [mockAlbum.toPrimitives()],
        query: 'abbey',
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      const result = await controller.searchAlbums('abbey', '0', '10');

      // Assert
      expect(searchAlbumsUseCase.execute).toHaveBeenCalledWith({
        query: 'abbey',
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getAlbumsAlphabetically', () => {
    it('debería retornar álbumes ordenados alfabéticamente', async () => {
      // Arrange
      getAlbumsAlphabeticallyUseCase.execute.mockResolvedValue({
        albums: [mockAlbum],
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
      });

      // Act
      const result = await controller.getAlbumsAlphabetically({ page: 1, limit: 20 });

      // Assert
      expect(getAlbumsAlphabeticallyUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('getAlbumsByArtist', () => {
    it('debería retornar álbumes ordenados por artista', async () => {
      // Arrange
      getAlbumsByArtistUseCase.execute.mockResolvedValue({
        albums: [mockAlbum],
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      });

      // Act
      const result = await controller.getAlbumsByArtist({ page: 1, limit: 20 });

      // Assert
      expect(getAlbumsByArtistUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result.total).toBe(50);
    });
  });

  describe('getRecentlyPlayedAlbums', () => {
    it('debería retornar álbumes reproducidos recientemente', async () => {
      // Arrange
      getRecentlyPlayedAlbumsUseCase.execute.mockResolvedValue({
        albums: [mockAlbum],
      });

      const mockUser = { id: 'user-1', username: 'test' };

      // Act
      const result = await controller.getRecentlyPlayedAlbums(mockUser as unknown as JwtUser, {
        limit: 20,
      });

      // Assert
      expect(getRecentlyPlayedAlbumsUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        limit: 20,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getFavoriteAlbums', () => {
    it('debería retornar álbumes favoritos del usuario', async () => {
      // Arrange
      getFavoriteAlbumsUseCase.execute.mockResolvedValue({
        albums: [mockAlbum],
        page: 1,
        limit: 20,
        hasMore: false,
      });

      const mockUser = { id: 'user-1', username: 'test' };

      // Act
      const result = await controller.getFavoriteAlbums(mockUser as unknown as JwtUser, {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(getFavoriteAlbumsUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        page: 1,
        limit: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });
  });
});
