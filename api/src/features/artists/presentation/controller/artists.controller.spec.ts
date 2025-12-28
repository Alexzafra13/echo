import { Test, TestingModule } from '@nestjs/testing';
import { ArtistsController } from './artists.controller';
import { GetArtistUseCase } from '../../domain/use-cases/get-artist/get-artist.use-case';
import { GetArtistsUseCase } from '../../domain/use-cases/get-artists/get-artists.use-case';
import { GetArtistAlbumsUseCase } from '../../domain/use-cases/get-artist-albums/get-artist-albums.use-case';
import { SearchArtistsUseCase } from '../../domain/use-cases/search-artists/search-artists.use-case';
import { GetRelatedArtistsUseCase } from '../../domain/use-cases/get-related-artists/get-related-artists.use-case';
import { GetArtistTopTracksUseCase } from '../../domain/use-cases/get-artist-top-tracks/get-artist-top-tracks.use-case';
import { GetArtistStatsUseCase } from '../../domain/use-cases/get-artist-stats/get-artist-stats.use-case';
import { Artist } from '../../domain/entities/artist.entity';
import { Album } from '@features/albums/domain/entities/album.entity';

describe('ArtistsController', () => {
  let controller: ArtistsController;
  let getArtistUseCase: jest.Mocked<GetArtistUseCase>;
  let getArtistsUseCase: jest.Mocked<GetArtistsUseCase>;
  let getArtistAlbumsUseCase: jest.Mocked<GetArtistAlbumsUseCase>;
  let searchArtistsUseCase: jest.Mocked<SearchArtistsUseCase>;
  let getRelatedArtistsUseCase: jest.Mocked<GetRelatedArtistsUseCase>;
  let getArtistTopTracksUseCase: jest.Mocked<GetArtistTopTracksUseCase>;
  let getArtistStatsUseCase: jest.Mocked<GetArtistStatsUseCase>;

  const mockArtist = Artist.reconstruct({
    id: 'artist-1',
    name: 'The Beatles',
    albumCount: 13,
    songCount: 213,
    mbzArtistId: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d',
    biography: 'The Beatles were an English rock band...',
    smallImageUrl: 'https://example.com/small.jpg',
    mediumImageUrl: 'https://example.com/medium.jpg',
    largeImageUrl: 'https://example.com/large.jpg',
    externalUrl: 'https://musicbrainz.org/artist/b10bbbfc',
    externalInfoUpdatedAt: new Date('2025-01-01'),
    orderArtistName: 'Beatles, The',
    size: Number(1073741824),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArtistsController],
      providers: [
        { provide: GetArtistUseCase, useValue: { execute: jest.fn() } },
        { provide: GetArtistsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetArtistAlbumsUseCase, useValue: { execute: jest.fn() } },
        { provide: SearchArtistsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetRelatedArtistsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetArtistTopTracksUseCase, useValue: { execute: jest.fn() } },
        { provide: GetArtistStatsUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ArtistsController>(ArtistsController);
    getArtistUseCase = module.get(GetArtistUseCase);
    getArtistsUseCase = module.get(GetArtistsUseCase);
    getArtistAlbumsUseCase = module.get(GetArtistAlbumsUseCase);
    searchArtistsUseCase = module.get(SearchArtistsUseCase);
    getRelatedArtistsUseCase = module.get(GetRelatedArtistsUseCase);
    getArtistTopTracksUseCase = module.get(GetArtistTopTracksUseCase);
    getArtistStatsUseCase = module.get(GetArtistStatsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getArtist', () => {
    it('debería retornar un artista por ID', async () => {
      // Arrange
      getArtistUseCase.execute.mockResolvedValue(mockArtist.toPrimitives());

      // Act
      const result = await controller.getArtist('artist-1');

      // Assert
      expect(getArtistUseCase.execute).toHaveBeenCalledWith({ id: 'artist-1' });
      expect(result.id).toBe('artist-1');
      expect(result.name).toBe('The Beatles');
    });
  });

  describe('getArtists', () => {
    it('debería retornar lista paginada de artistas', async () => {
      // Arrange
      getArtistsUseCase.execute.mockResolvedValue({
        data: [mockArtist.toPrimitives()],
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      const result = await controller.getArtists('0', '10');

      // Assert
      expect(getArtistsUseCase.execute).toHaveBeenCalledWith({ skip: 0, take: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('debería usar valores por defecto', async () => {
      // Arrange
      getArtistsUseCase.execute.mockResolvedValue({
        data: [],
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      await controller.getArtists();

      // Assert
      expect(getArtistsUseCase.execute).toHaveBeenCalledWith({ skip: 0, take: 10 });
    });
  });

  describe('getArtistAlbums', () => {
    it('debería retornar álbumes del artista', async () => {
      // Arrange
      getArtistAlbumsUseCase.execute.mockResolvedValue({
        data: [mockAlbum.toPrimitives()],
        total: 13,
        skip: 0,
        take: 100,
        hasMore: false,
      });

      // Act
      const result = await controller.getArtistAlbums('artist-1', '0', '100');

      // Assert
      expect(getArtistAlbumsUseCase.execute).toHaveBeenCalledWith({
        artistId: 'artist-1',
        skip: 0,
        take: 100,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(13);
    });
  });

  describe('getArtistTopTracks', () => {
    it('debería retornar top tracks del artista', async () => {
      // Arrange
      const mockTopTracksResult = {
        data: [
          { trackId: 'track-1', title: 'Come Together', playCount: 100 },
          { trackId: 'track-2', title: 'Something', playCount: 80 },
        ],
        artistId: 'artist-1',
        limit: 10,
      };
      getArtistTopTracksUseCase.execute.mockResolvedValue(mockTopTracksResult);

      // Act
      const result = await controller.getArtistTopTracks('artist-1', '10');

      // Assert
      expect(getArtistTopTracksUseCase.execute).toHaveBeenCalledWith({
        artistId: 'artist-1',
        limit: 10,
        days: undefined,
      });
      expect(result.data).toHaveLength(2);
    });

    it('debería filtrar por días si se proporciona', async () => {
      // Arrange
      getArtistTopTracksUseCase.execute.mockResolvedValue({
        data: [],
        artistId: 'artist-1',
        limit: 10,
      });

      // Act
      await controller.getArtistTopTracks('artist-1', '10', '30');

      // Assert
      expect(getArtistTopTracksUseCase.execute).toHaveBeenCalledWith({
        artistId: 'artist-1',
        limit: 10,
        days: 30,
      });
    });
  });

  describe('getArtistStats', () => {
    it('debería retornar estadísticas del artista', async () => {
      // Arrange
      getArtistStatsUseCase.execute.mockResolvedValue({
        artistId: 'artist-1',
        totalPlays: 1000,
        uniqueListeners: 150,
        avgCompletionRate: 0.85,
        skipRate: 0.12,
      });

      // Act
      const result = await controller.getArtistStats('artist-1');

      // Assert
      expect(getArtistStatsUseCase.execute).toHaveBeenCalledWith({ artistId: 'artist-1' });
      expect(result.totalPlays).toBe(1000);
      expect(result.uniqueListeners).toBe(150);
      expect(result.avgCompletionRate).toBe(0.85);
    });
  });

  describe('getRelatedArtists', () => {
    it('debería retornar artistas relacionados desde proveedor externo', async () => {
      // Arrange
      getRelatedArtistsUseCase.execute.mockResolvedValue({
        data: [
          { id: 'artist-2', name: 'Pink Floyd', albumCount: 10, songCount: 100, matchScore: 80 },
        ],
        artistId: 'artist-1',
        limit: 10,
        source: 'external',
      });

      // Act
      const result = await controller.getRelatedArtists('artist-1', '10');

      // Assert
      expect(getRelatedArtistsUseCase.execute).toHaveBeenCalledWith({
        artistId: 'artist-1',
        limit: 10,
      });
      expect(result.source).toBe('external');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Pink Floyd');
    });

    it('debería usar datos internos si proveedor externo está deshabilitado', async () => {
      // Arrange
      getRelatedArtistsUseCase.execute.mockResolvedValue({
        data: [
          { id: 'artist-2', name: 'Pink Floyd', albumCount: 10, songCount: 100, matchScore: 85 },
        ],
        artistId: 'artist-1',
        limit: 10,
        source: 'internal',
      });

      // Act
      const result = await controller.getRelatedArtists('artist-1', '10');

      // Assert
      expect(result.source).toBe('internal');
      expect(result.data).toHaveLength(1);
    });

    it('debería retornar vacío si artista no existe', async () => {
      // Arrange
      getRelatedArtistsUseCase.execute.mockResolvedValue({
        data: [],
        artistId: 'nonexistent',
        limit: 10,
        source: 'none',
      });

      // Act
      const result = await controller.getRelatedArtists('nonexistent', '10');

      // Assert
      expect(result.source).toBe('none');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('searchArtists', () => {
    it('debería buscar artistas por query', async () => {
      // Arrange
      searchArtistsUseCase.execute.mockResolvedValue({
        data: [mockArtist.toPrimitives()],
        query: 'beatles',
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      const result = await controller.searchArtists('beatles', '0', '10');

      // Assert
      expect(searchArtistsUseCase.execute).toHaveBeenCalledWith({
        query: 'beatles',
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(1);
    });
  });
});
