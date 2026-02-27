import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { BaseCachedRepository } from '@shared/base';
import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { DrizzleArtistRepository } from './artist.repository';
import { cacheConfig } from '@config/cache.config';

/**
 * CachedArtistRepository - Implements Cache-Aside pattern for Artist entities.
 *
 * Extends BaseCachedRepository to get automatic caching for:
 * - findById (cached)
 * - search (cached with short TTL)
 * - create/update/delete (with cache invalidation)
 *
 * Delegates non-cached operations to base repository:
 * - findAll (too many pagination combinations)
 * - count (fast query, not worth caching)
 */
@Injectable()
export class CachedArtistRepository
  extends BaseCachedRepository<Artist, IArtistRepository>
  implements IArtistRepository
{
  constructor(
    baseRepository: DrizzleArtistRepository,
    cache: RedisService,
  ) {
    super(
      baseRepository,
      cache,
      null, // No logger (optional)
      {
        keyPrefix: 'artist:',
        searchKeyPrefix: 'artists:search:',
        listKeyPrefix: 'artists:',
        entityTtl: cacheConfig.ttl.artist,
        searchTtl: cacheConfig.ttl.search,
      },
      Artist.reconstruct,
    );
  }

  /**
   * Find artist by exact name (case-insensitive)
   * Cached with short TTL for similar artist lookups
   */
  async findByName(name: string): Promise<Artist | null> {
    const cacheKey = `${this.config.keyPrefix}name:${name.toLowerCase()}`;

    // Try cache first
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return this.reconstruct(cached);
    }

    // Cache miss - fetch from DB
    const artist = await this.baseRepository.findByName(name);

    if (artist) {
      // Cache the result
      await this.cache.set(cacheKey, artist.toPrimitives(), this.searchTtl);
    }

    return artist;
  }

  /**
   * Bulk find by IDs - delegates to base repository
   * Not cached individually (bulk operations are typically one-off)
   */
  async findByIds(ids: string[]): Promise<Artist[]> {
    return this.baseRepository.findByIds(ids);
  }

  /**
   * Bulk find by names - delegates to base repository
   * Not cached individually (bulk operations are typically one-off)
   */
  async findByNames(names: string[]): Promise<Map<string, Artist>> {
    return this.baseRepository.findByNames(names);
  }

  /**
   * Find similar artists by genre + audio profile - delegates to base repository
   * Not cached (results depend on evolving genre/audio data)
   */
  async findSimilarByGenreAndAudio(
    artistId: string,
    limit: number,
  ): Promise<{ artistId: string; score: number }[]> {
    return this.baseRepository.findSimilarByGenreAndAudio(artistId, limit);
  }
}
