import { Test, TestingModule } from '@nestjs/testing';
import { GenresController } from './genres.controller';
import {
  ListGenresUseCase,
  GetGenreUseCase,
  GetAlbumsByGenreUseCase,
  GetTracksByGenreUseCase,
  GetArtistsByGenreUseCase,
} from '../../domain/use-cases';
import { Genre } from '../../domain/entities/genre.entity';
import { Album } from '@features/albums/domain/entities/album.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { Artist } from '@features/artists/domain/entities/artist.entity';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import {
  GenreSort,
  AlbumInGenreSort,
  TrackInGenreSort,
  ArtistInGenreSort,
  SortOrder,
} from '../dtos';

describe('GenresController', () => {
  let controller: GenresController;
  let listGenresUseCase: jest.Mocked<ListGenresUseCase>;
  let getGenreUseCase: jest.Mocked<GetGenreUseCase>;
  let getAlbumsByGenreUseCase: jest.Mocked<GetAlbumsByGenreUseCase>;
  let getTracksByGenreUseCase: jest.Mocked<GetTracksByGenreUseCase>;
  let getArtistsByGenreUseCase: jest.Mocked<GetArtistsByGenreUseCase>;

  const mockGenre = Genre.reconstruct({
    id: 'genre-1',
    name: 'Hip-Hop',
    trackCount: 120,
    albumCount: 10,
    artistCount: 5,
    coverAlbumId: 'album-cover-1',
    coverAlbumUpdatedAt: new Date('2025-01-01'),
  });

  const mockAlbum = Album.reconstruct({
    id: 'album-1',
    name: 'Illmatic',
    compilation: false,
    songCount: 10,
    duration: 2400,
    size: 80000000,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  const mockTrack = Track.reconstruct({
    id: 'track-1',
    title: 'N.Y. State of Mind',
    discNumber: 1,
    path: '/music/ny.flac',
    compilation: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  const mockArtist = Artist.reconstruct({
    id: 'artist-1',
    name: 'Nas',
    albumCount: 14,
    songCount: 180,
    size: 2500000000,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenresController],
      providers: [
        { provide: ListGenresUseCase, useValue: { execute: jest.fn() } },
        { provide: GetGenreUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAlbumsByGenreUseCase, useValue: { execute: jest.fn() } },
        { provide: GetTracksByGenreUseCase, useValue: { execute: jest.fn() } },
        { provide: GetArtistsByGenreUseCase, useValue: { execute: jest.fn() } },
        {
          provide: `PinoLogger:${GenresController.name}`,
          useValue: createMockPinoLogger(),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GenresController>(GenresController);
    listGenresUseCase = module.get(ListGenresUseCase);
    getGenreUseCase = module.get(GetGenreUseCase);
    getAlbumsByGenreUseCase = module.get(GetAlbumsByGenreUseCase);
    getTracksByGenreUseCase = module.get(GetTracksByGenreUseCase);
    getArtistsByGenreUseCase = module.get(GetArtistsByGenreUseCase);
  });

  describe('list', () => {
    it('returns paginated genres with defaults', async () => {
      listGenresUseCase.execute.mockResolvedValue({
        data: [mockGenre],
        total: 1,
        skip: 0,
        take: 20,
        hasMore: false,
      });

      const result = await controller.list({});

      expect(listGenresUseCase.execute).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        sort: GenreSort.TrackCount,
        order: SortOrder.Desc,
        search: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('genre-1');
      expect(result.data[0].slug).toBe('hip-hop');
    });

    it('passes through query params when provided', async () => {
      listGenresUseCase.execute.mockResolvedValue({
        data: [],
        total: 0,
        skip: 10,
        take: 5,
        hasMore: false,
      });

      await controller.list({
        skip: 10,
        take: 5,
        sort: GenreSort.Name,
        order: SortOrder.Asc,
        search: 'rock',
      });

      expect(listGenresUseCase.execute).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        sort: GenreSort.Name,
        order: SortOrder.Asc,
        search: 'rock',
      });
    });
  });

  describe('getOne', () => {
    it('returns a single genre with cover', async () => {
      getGenreUseCase.execute.mockResolvedValue(mockGenre);

      const result = await controller.getOne('genre-1');

      expect(getGenreUseCase.execute).toHaveBeenCalledWith({ id: 'genre-1' });
      expect(result.id).toBe('genre-1');
      expect(result.name).toBe('Hip-Hop');
      expect(result.slug).toBe('hip-hop');
      expect(result.coverImageUrl).toContain('/api/images/albums/album-cover-1/cover');
      expect(result.coverColor).toBeDefined();
    });
  });

  describe('getAlbums', () => {
    it('returns albums for a genre with defaults', async () => {
      getAlbumsByGenreUseCase.execute.mockResolvedValue({
        data: [mockAlbum],
        total: 1,
        skip: 0,
        take: 20,
        hasMore: false,
      });

      const result = await controller.getAlbums('genre-1', {});

      expect(getAlbumsByGenreUseCase.execute).toHaveBeenCalledWith({
        genreId: 'genre-1',
        skip: 0,
        take: 20,
        sort: AlbumInGenreSort.ReleaseYear,
        order: SortOrder.Desc,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getTracks', () => {
    it('returns tracks for a genre with defaults', async () => {
      getTracksByGenreUseCase.execute.mockResolvedValue({
        data: [mockTrack],
        total: 1,
        skip: 0,
        take: 20,
        hasMore: false,
      });

      const result = await controller.getTracks('genre-1', {});

      expect(getTracksByGenreUseCase.execute).toHaveBeenCalledWith({
        genreId: 'genre-1',
        skip: 0,
        take: 20,
        sort: TrackInGenreSort.PlayCount,
        order: SortOrder.Desc,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getArtists', () => {
    it('returns artists for a genre with defaults (asc by name)', async () => {
      getArtistsByGenreUseCase.execute.mockResolvedValue({
        data: [mockArtist],
        total: 1,
        skip: 0,
        take: 20,
        hasMore: false,
      });

      const result = await controller.getArtists('genre-1', {});

      expect(getArtistsByGenreUseCase.execute).toHaveBeenCalledWith({
        genreId: 'genre-1',
        skip: 0,
        take: 20,
        sort: ArtistInGenreSort.Name,
        order: SortOrder.Asc,
      });
      expect(result.data).toHaveLength(1);
    });
  });
});
