import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

/**
 * Metadata Cache Service
 * Manages caching of external metadata using the metadata_cache table
 *
 * Design Pattern: Cache-Aside Pattern
 * Purpose: Reduce external API calls by caching successful responses
 *
 * Schema: entityId + entityType + provider (composite key)
 */
@Injectable()
export class MetadataCacheService {
  private readonly logger = new Logger(MetadataCacheService.name);

  // Cache TTL in days (configurable via environment)
  private readonly DEFAULT_TTL_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cached metadata for a specific entity and provider
   */
  async get(
    entityType: string,
    entityId: string,
    provider: string
  ): Promise<any | null> {
    try {
      const cached = await this.prisma.metadataCache.findUnique({
        where: {
          entityId_entityType_provider: {
            entityId,
            entityType,
            provider,
          },
        },
      });

      if (!cached) {
        this.logger.debug(`Cache miss: ${entityType}:${entityId}:${provider}`);
        return null;
      }

      // Check if cache is expired
      if (cached.expiresAt && new Date() > cached.expiresAt) {
        this.logger.debug(`Cache expired: ${entityType}:${entityId}:${provider}`);
        await this.delete(entityType, entityId, provider);
        return null;
      }

      this.logger.debug(`Cache hit: ${entityType}:${entityId}:${provider}`);
      return JSON.parse(cached.data);
    } catch (error) {
      this.logger.error(`Error reading from cache: ${(error as Error).message}`, (error as Error).stack);
      return null;
    }
  }

  /**
   * Store metadata in cache
   */
  async set(
    entityType: string,
    entityId: string,
    provider: string,
    metadata: any,
    ttlDays?: number
  ): Promise<void> {
    try {
      const ttl = ttlDays || this.DEFAULT_TTL_DAYS;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttl);

      await this.prisma.metadataCache.upsert({
        where: {
          entityId_entityType_provider: {
            entityId,
            entityType,
            provider,
          },
        },
        create: {
          entityId,
          entityType,
          provider,
          data: JSON.stringify(metadata),
          expiresAt,
        },
        update: {
          data: JSON.stringify(metadata),
          fetchedAt: new Date(),
          expiresAt,
        },
      });

      this.logger.debug(`Cached metadata: ${entityType}:${entityId}:${provider}`);
    } catch (error) {
      this.logger.error(`Error writing to cache: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  /**
   * Delete cached metadata
   */
  async delete(
    entityType: string,
    entityId: string,
    provider: string
  ): Promise<void> {
    try {
      await this.prisma.metadataCache.delete({
        where: {
          entityId_entityType_provider: {
            entityId,
            entityType,
            provider,
          },
        },
      });

      this.logger.debug(`Deleted cache: ${entityType}:${entityId}:${provider}`);
    } catch (error) {
      // Ignore if not found
      if ((error as any).code !== 'P2025') {
        this.logger.error(`Error deleting cache: ${(error as Error).message}`, (error as Error).stack);
      }
    }
  }

  /**
   * Clear all cached metadata for an entity
   */
  async clearEntity(entityType: string, entityId: string): Promise<void> {
    try {
      await this.prisma.metadataCache.deleteMany({
        where: {
          entityType,
          entityId,
        },
      });

      this.logger.debug(`Cleared all cache for ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error(`Error clearing entity cache: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  /**
   * Clear all expired cache entries
   * Should be run periodically via a cron job
   */
  async clearExpired(): Promise<number> {
    try {
      const result = await this.prisma.metadataCache.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      });

      this.logger.log(`Cleared ${result.count} expired cache entries`);
      return result.count;
    } catch (error) {
      this.logger.error(`Error clearing expired cache: ${(error as Error).message}`, (error as Error).stack);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    total: number;
    byEntityType: Record<string, number>;
    byProvider: Record<string, number>;
  }> {
    try {
      const [total, byEntityType, byProvider] = await Promise.all([
        this.prisma.metadataCache.count(),
        this.prisma.metadataCache.groupBy({
          by: ['entityType'],
          _count: true,
        }),
        this.prisma.metadataCache.groupBy({
          by: ['provider'],
          _count: true,
        }),
      ]);

      return {
        total,
        byEntityType: Object.fromEntries(
          byEntityType.map((item) => [item.entityType, item._count])
        ),
        byProvider: Object.fromEntries(
          byProvider.map((item) => [item.provider, item._count])
        ),
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats: ${(error as Error).message}`, (error as Error).stack);
      return { total: 0, byEntityType: {}, byProvider: {} };
    }
  }
}
