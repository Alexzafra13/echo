import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';
import { BaseCachedRepository } from '@shared/base';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { DrizzleTrackRepository } from './track.repository';
import { cacheConfig } from '@config/cache.config';

/**
 * CachedTrackRepository - Implements Cache-Aside pattern for Track entities.
 *
 * Extends BaseCachedRepository to get automatic caching for:
 * - findById (cached)
 * - search (cached with short TTL)
 * - create/update/delete (with cache invalidation)
 *
 * Additional methods delegated to base repository (not cached):
 * - findByIds, findAll, findByAlbumId, findByArtistId, findShuffledPaginated, count
 */
@Injectable()
export class CachedTrackRepository
  extends BaseCachedRepository<Track, ITrackRepository>
  implements ITrackRepository
{
  constructor(
    baseRepository: DrizzleTrackRepository,
    cache: RedisService,
    @InjectPinoLogger(CachedTrackRepository.name)
    logger: PinoLogger,
  ) {
    super(
      baseRepository,
      cache,
      logger,
      {
        keyPrefix: 'track:',
        searchKeyPrefix: 'tracks:search:',
        listKeyPrefix: 'tracks:',
        entityTtl: cacheConfig.ttl.track,
        searchTtl: cacheConfig.ttl.search,
      },
      Track.reconstruct,
    );
  }

  // ==================== TRACK-SPECIFIC METHODS (NOT CACHED) ====================

  /**
   * Find multiple tracks by IDs.
   * Not cached - use case is typically for playlist loading where order matters.
   */
  async findByIds(ids: string[]): Promise<Track[]> {
    return this.baseRepository.findByIds(ids);
  }

  /**
   * Find tracks by album ID.
   * Not cached - album track lists are typically small and change rarely.
   */
  async findByAlbumId(albumId: string, includeMissing = true): Promise<Track[]> {
    return this.baseRepository.findByAlbumId(albumId, includeMissing);
  }

  /**
   * Find tracks by artist ID with pagination.
   * Not cached - too many pagination combinations.
   */
  async findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Track[]> {
    return this.baseRepository.findByArtistId(artistId, skip, take);
  }

  /**
   * Get tracks in deterministic random order with pagination.
   * Not cached - pagination combinations are too many.
   */
  async findShuffledPaginated(
    seed: number,
    skip: number,
    take: number,
  ): Promise<Track[]> {
    return this.baseRepository.findShuffledPaginated(seed, skip, take);
  }
}
