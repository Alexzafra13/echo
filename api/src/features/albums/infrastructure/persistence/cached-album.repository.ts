import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';
import { BaseCachedRepository } from '@shared/base';
import { Album } from '../../domain/entities/album.entity';
import { IAlbumRepository } from '../../domain/ports/album-repository.port';
import { DrizzleAlbumRepository } from './album.repository';
import { cacheConfig } from '@config/cache.config';

/**
 * CachedAlbumRepository - Implements Cache-Aside pattern for Album entities.
 *
 * Extends BaseCachedRepository for common operations and adds album-specific
 * caching for methods like findByArtistId, findRecent, findMostPlayed, etc.
 *
 * Cache Strategy:
 * - Single albums: 1 hour TTL (configurable via CACHE_ALBUM_TTL)
 * - Search results: 1 minute TTL (frequent changes)
 * - Recent/Most played lists: 5-10 minutes (balance freshness vs performance)
 * - Count: 30 minutes (slow to change)
 *
 * Non-cached operations:
 * - findAll (too many pagination combinations)
 * - findAlphabetically (fast with index)
 * - findRecentlyPlayed (user-specific, changes frequently)
 * - findFavorites (user-specific, changes on like/unlike)
 */
@Injectable()
export class CachedAlbumRepository
  extends BaseCachedRepository<Album, IAlbumRepository>
  implements IAlbumRepository
{
  // Additional TTLs for album-specific caches (from centralized config)
  private readonly RECENT_TTL = cacheConfig.ttl.recent;
  private readonly MOST_PLAYED_TTL = cacheConfig.ttl.mostPlayed;
  private readonly COUNT_TTL = cacheConfig.ttl.count;

  constructor(
    baseRepository: DrizzleAlbumRepository,
    cache: RedisService,
    @InjectPinoLogger(CachedAlbumRepository.name)
    logger: PinoLogger,
  ) {
    super(
      baseRepository,
      cache,
      logger,
      {
        keyPrefix: 'album:',
        searchKeyPrefix: 'albums:search:',
        listKeyPrefix: 'albums:',
        entityTtl: cacheConfig.ttl.album,
        searchTtl: cacheConfig.ttl.search,
      },
      Album.reconstruct,
    );
  }

  // ==================== ALBUM-SPECIFIC CACHED METHODS ====================

  /**
   * Find albums by artist ID with caching.
   */
  async findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Album[]> {
    const cacheKey = `${this.config.listKeyPrefix}artist:${artistId}:${skip}:${take}`;

    return this.getCachedOrFetch(
      cacheKey,
      () => this.baseRepository.findByArtistId(artistId, skip, take),
      this.entityTtl,
      true,
    );
  }

  /**
   * Find recent albums with caching.
   */
  async findRecent(take: number): Promise<Album[]> {
    const cacheKey = `${this.config.listKeyPrefix}recent:${take}`;

    return this.getCachedOrFetch(
      cacheKey,
      () => this.baseRepository.findRecent(take),
      this.RECENT_TTL,
      true,
    );
  }

  /**
   * Find most played albums with caching.
   */
  async findMostPlayed(take: number): Promise<Album[]> {
    const cacheKey = `${this.config.listKeyPrefix}most-played:${take}`;

    return this.getCachedOrFetch(
      cacheKey,
      () => this.baseRepository.findMostPlayed(take),
      this.MOST_PLAYED_TTL,
      true,
    );
  }

  /**
   * Count albums with caching.
   */
  override async count(): Promise<number> {
    const cacheKey = `${this.config.listKeyPrefix}count`;

    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      return cached as number;
    }

    const count = await this.baseRepository.count();
    await this.cache.set(cacheKey, count, this.COUNT_TTL);

    return count;
  }

  /**
   * Count albums by artist ID with caching.
   */
  async countByArtistId(artistId: string): Promise<number> {
    const cacheKey = `${this.config.listKeyPrefix}count:artist:${artistId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      return cached as number;
    }

    const count = await this.baseRepository.countByArtistId(artistId);
    await this.cache.set(cacheKey, count, this.COUNT_TTL);

    return count;
  }

  // ==================== NON-CACHED METHODS (DELEGATED) ====================

  /**
   * Find albums alphabetically.
   * Not cached - fast with database index.
   */
  async findAlphabetically(skip: number, take: number): Promise<Album[]> {
    return this.baseRepository.findAlphabetically(skip, take);
  }

  /**
   * Find albums sorted by artist name.
   * Not cached - fast with database index.
   */
  async findByArtistName(skip: number, take: number): Promise<Album[]> {
    return this.baseRepository.findByArtistName(skip, take);
  }

  /**
   * Find recently played albums for a user.
   * Not cached - user-specific and changes frequently.
   */
  async findRecentlyPlayed(userId: string, take: number): Promise<Album[]> {
    return this.baseRepository.findRecentlyPlayed(userId, take);
  }

  /**
   * Find favorite albums for a user.
   * Not cached - user-specific and changes on like/unlike.
   */
  async findFavorites(
    userId: string,
    skip: number,
    take: number,
  ): Promise<Album[]> {
    return this.baseRepository.findFavorites(userId, skip, take);
  }

  // ==================== OVERRIDE WRITE OPERATIONS FOR EXTENDED INVALIDATION ====================

  /**
   * Create album and invalidate all related caches.
   */
  override async create(album: Album): Promise<Album> {
    const created = await this.baseRepository.create(album);
    await this.invalidateListCaches();
    return created;
  }

  /**
   * Update album and invalidate all related caches.
   */
  override async update(
    id: string,
    album: Partial<Album>,
  ): Promise<Album | null> {
    const updated = await this.baseRepository.update(id, album);

    if (updated) {
      await this.cache.del(`${this.config.keyPrefix}${id}`);
      await this.invalidateListCaches();
    }

    return updated;
  }

  /**
   * Delete album and invalidate all related caches.
   */
  override async delete(id: string): Promise<boolean> {
    const deleted = await this.baseRepository.delete(id);

    if (deleted) {
      await this.cache.del(`${this.config.keyPrefix}${id}`);
      await this.invalidateListCaches();
    }

    return deleted;
  }

  // ==================== PUBLIC CACHE INVALIDATION ====================

  /**
   * Invalidate all album-related list caches (lists, searches, etc.)
   * This is exposed publicly for use by other services (e.g., scanner).
   */
  async invalidateListCaches(): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`${this.config.keyPrefix}*`),
      this.invalidatePattern(`${this.config.listKeyPrefix}recent:*`),
      this.invalidatePattern(`${this.config.listKeyPrefix}most-played:*`),
      this.invalidatePattern(`${this.config.listKeyPrefix}artist:*`),
      this.invalidatePattern(`${this.config.searchKeyPrefix}*`),
      this.invalidateKey(`${this.config.listKeyPrefix}count`),
    ]);
    this.logger?.info('Album caches invalidated');
  }
}
