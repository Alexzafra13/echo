import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

/**
 * Metadata Cache Service
 * Manages caching of external metadata using the metadata_cache table
 *
 * Design Pattern: Cache-Aside Pattern
 * Purpose: Reduce external API calls by caching successful responses
 */
@Injectable()
export class MetadataCacheService {
  private readonly logger = new Logger(MetadataCacheService.name);

  // Cache TTL in days (configurable via environment)
  private readonly DEFAULT_TTL_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cached metadata for a specific entity and type
   * @param entityType Type of entity (artist, album, track)
   * @param entityId ID of the entity
   * @param metadataType Type of metadata (bio, images, cover)
   * @returns Cached metadata or null if not found or expired
   */
  async get(
    entityType: string,
    entityId: string,
    metadataType: string
  ): Promise<any | null> {
    try {
      const cacheKey = this.buildCacheKey(entityType, entityId, metadataType);

      const cached = await this.prisma.metadataCache.findUnique({
        where: { cache_key: cacheKey },
      });

      if (!cached) {
        this.logger.debug(`Cache miss: ${cacheKey}`);
        return null;
      }

      // Check if cache is expired
      const ttlDays = cached.ttl_days || this.DEFAULT_TTL_DAYS;
      const expirationDate = new Date(cached.created_at);
      expirationDate.setDate(expirationDate.getDate() + ttlDays);

      if (new Date() > expirationDate) {
        this.logger.debug(`Cache expired: ${cacheKey}`);
        await this.delete(entityType, entityId, metadataType);
        return null;
      }

      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached.metadata;
    } catch (error) {
      this.logger.error(`Error reading from cache: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Store metadata in cache
   * @param entityType Type of entity (artist, album, track)
   * @param entityId ID of the entity
   * @param metadataType Type of metadata (bio, images, cover)
   * @param metadata The metadata to cache
   * @param source The source of the metadata (lastfm, fanart, coverart)
   * @param ttlDays Optional TTL in days (defaults to 30)
   */
  async set(
    entityType: string,
    entityId: string,
    metadataType: string,
    metadata: any,
    source: string,
    ttlDays?: number
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(entityType, entityId, metadataType);

      await this.prisma.metadataCache.upsert({
        where: { cache_key: cacheKey },
        create: {
          cache_key: cacheKey,
          entity_type: entityType,
          entity_id: entityId,
          metadata_type: metadataType,
          source,
          metadata: metadata as any,
          ttl_days: ttlDays || this.DEFAULT_TTL_DAYS,
        },
        update: {
          source,
          metadata: metadata as any,
          ttl_days: ttlDays || this.DEFAULT_TTL_DAYS,
          updated_at: new Date(),
        },
      });

      this.logger.debug(`Cached metadata: ${cacheKey} (source: ${source})`);
    } catch (error) {
      this.logger.error(`Error writing to cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Delete cached metadata
   * @param entityType Type of entity
   * @param entityId ID of the entity
   * @param metadataType Type of metadata
   */
  async delete(
    entityType: string,
    entityId: string,
    metadataType: string
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(entityType, entityId, metadataType);

      await this.prisma.metadataCache.delete({
        where: { cache_key: cacheKey },
      });

      this.logger.debug(`Deleted cache: ${cacheKey}`);
    } catch (error) {
      // Ignore if not found
      if (error.code !== 'P2025') {
        this.logger.error(`Error deleting cache: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Clear all cached metadata for an entity
   * @param entityType Type of entity
   * @param entityId ID of the entity
   */
  async clearEntity(entityType: string, entityId: string): Promise<void> {
    try {
      await this.prisma.metadataCache.deleteMany({
        where: {
          entity_type: entityType,
          entity_id: entityId,
        },
      });

      this.logger.debug(`Cleared all cache for ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error(`Error clearing entity cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Clear all expired cache entries
   * Should be run periodically via a cron job
   */
  async clearExpired(): Promise<number> {
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM metadata_cache
        WHERE created_at + (ttl_days || ' days')::interval < NOW()
      `;

      this.logger.log(`Cleared ${result} expired cache entries`);
      return result as number;
    } catch (error) {
      this.logger.error(`Error clearing expired cache: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  async getStats(): Promise<{
    total: number;
    byEntityType: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    try {
      const [total, byEntityType, bySource] = await Promise.all([
        this.prisma.metadataCache.count(),
        this.prisma.metadataCache.groupBy({
          by: ['entity_type'],
          _count: true,
        }),
        this.prisma.metadataCache.groupBy({
          by: ['source'],
          _count: true,
        }),
      ]);

      return {
        total,
        byEntityType: Object.fromEntries(
          byEntityType.map((item) => [item.entity_type, item._count])
        ),
        bySource: Object.fromEntries(
          bySource.map((item) => [item.source, item._count])
        ),
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats: ${error.message}`, error.stack);
      return { total: 0, byEntityType: {}, bySource: {} };
    }
  }

  /**
   * Build a cache key from entity and metadata type
   * Format: {entityType}:{entityId}:{metadataType}
   */
  private buildCacheKey(
    entityType: string,
    entityId: string,
    metadataType: string
  ): string {
    return `${entityType}:${entityId}:${metadataType}`;
  }
}
