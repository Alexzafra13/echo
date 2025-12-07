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
}
