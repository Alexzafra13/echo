import { CachedGenreRepository } from './cached-genre.repository';
import { DrizzleGenreRepository } from './genre.repository';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Genre } from '../../domain/entities/genre.entity';
import { createMockPinoLogger } from '@shared/testing/mock.types';
import { PinoLogger } from 'nestjs-pino';

describe('CachedGenreRepository', () => {
  let repo: CachedGenreRepository;
  let baseRepo: jest.Mocked<DrizzleGenreRepository>;
  let cache: jest.Mocked<RedisService>;

  const mockGenre = Genre.reconstruct({
    id: 'genre-1',
    name: 'Rock',
    trackCount: 50,
    albumCount: 5,
    artistCount: 3,
    coverAlbumId: 'album-1',
    coverAlbumUpdatedAt: new Date('2025-01-01T00:00:00Z'),
  });

  beforeEach(() => {
    baseRepo = {
      list: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findAlbumsByGenre: jest.fn(),
      findTracksByGenre: jest.fn(),
      findArtistsByGenre: jest.fn(),
    } as unknown as jest.Mocked<DrizzleGenreRepository>;

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      delPattern: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    repo = new CachedGenreRepository(
      baseRepo,
      cache,
      createMockPinoLogger() as unknown as PinoLogger
    );
  });

  describe('list', () => {
    it('returns cached data on hit without hitting the base repo', async () => {
      cache.get.mockResolvedValue([mockGenre.toPrimitives()]);

      const result = await repo.list({
        skip: 0,
        take: 20,
        sort: 'trackCount',
        order: 'desc',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('genre-1');
      expect(baseRepo.list).not.toHaveBeenCalled();
    });

    it('falls through to base repo on miss and caches result', async () => {
      cache.get.mockResolvedValue(null);
      baseRepo.list.mockResolvedValue([mockGenre]);

      const result = await repo.list({
        skip: 0,
        take: 20,
        sort: 'trackCount',
        order: 'desc',
      });

      expect(baseRepo.list).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('deserializes Date fields from cached primitives', async () => {
      const iso = '2025-06-15T00:00:00.000Z';
      cache.get.mockResolvedValue([
        {
          id: 'genre-1',
          name: 'Rock',
          trackCount: 1,
          albumCount: 1,
          artistCount: 1,
          coverAlbumId: 'album-1',
          coverAlbumUpdatedAt: iso,
        },
      ]);

      const result = await repo.list({
        skip: 0,
        take: 20,
        sort: 'name',
        order: 'asc',
      });

      expect(result[0].coverAlbumUpdatedAt).toBeInstanceOf(Date);
      expect(result[0].coverAlbumUpdatedAt?.toISOString()).toBe(iso);
    });
  });

  describe('count', () => {
    it('returns cached value on hit', async () => {
      cache.get.mockResolvedValue(42);

      const result = await repo.count();

      expect(result).toBe(42);
      expect(baseRepo.count).not.toHaveBeenCalled();
    });

    it('falls through to base repo on miss and caches', async () => {
      cache.get.mockResolvedValue(null);
      baseRepo.count.mockResolvedValue(10);

      const result = await repo.count('rock');

      expect(result).toBe(10);
      expect(cache.set).toHaveBeenCalled();
    });

    it('treats zero as a valid cached value (not a miss)', async () => {
      cache.get.mockResolvedValue(0);

      const result = await repo.count();

      expect(result).toBe(0);
      expect(baseRepo.count).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns cached genre on hit', async () => {
      cache.get.mockResolvedValue(mockGenre.toPrimitives());

      const result = await repo.findById('genre-1');

      expect(result?.id).toBe('genre-1');
      expect(baseRepo.findById).not.toHaveBeenCalled();
    });

    it('returns null without caching when base repo returns null', async () => {
      cache.get.mockResolvedValue(null);
      baseRepo.findById.mockResolvedValue(null);

      const result = await repo.findById('missing');

      expect(result).toBeNull();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('caches base repo result on miss', async () => {
      cache.get.mockResolvedValue(null);
      baseRepo.findById.mockResolvedValue(mockGenre);

      const result = await repo.findById('genre-1');

      expect(result?.id).toBe('genre-1');
      expect(cache.set).toHaveBeenCalled();
    });
  });

  describe('findAlbumsByGenre / findTracksByGenre / findArtistsByGenre', () => {
    it('passes through uncached to base repo', async () => {
      baseRepo.findAlbumsByGenre.mockResolvedValue({ data: [], total: 0 });
      baseRepo.findTracksByGenre.mockResolvedValue({ data: [], total: 0 });
      baseRepo.findArtistsByGenre.mockResolvedValue({ data: [], total: 0 });

      const query = { genreId: 'genre-1', skip: 0, take: 20, order: 'asc' as const };

      await repo.findAlbumsByGenre({ ...query, sort: 'title' });
      await repo.findTracksByGenre({ ...query, sort: 'title' });
      await repo.findArtistsByGenre({ ...query, sort: 'name' });

      expect(baseRepo.findAlbumsByGenre).toHaveBeenCalled();
      expect(baseRepo.findTracksByGenre).toHaveBeenCalled();
      expect(baseRepo.findArtistsByGenre).toHaveBeenCalled();
      expect(cache.get).not.toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('clears all three genre cache prefixes', async () => {
      await repo.invalidate();

      expect(cache.delPattern).toHaveBeenCalledWith('genre:*');
      expect(cache.delPattern).toHaveBeenCalledWith('genres:list:*');
      expect(cache.delPattern).toHaveBeenCalledWith('genres:count:*');
    });
  });
});
