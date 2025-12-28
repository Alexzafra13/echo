import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and, lte, sql } from 'drizzle-orm';
import { metadataCache } from '@infrastructure/database/schema';

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
  // Cache TTL in days (configurable via environment)
  private readonly DEFAULT_TTL_DAYS = 30;

  constructor(@InjectPinoLogger(MetadataCacheService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService) {}

  /**
   * Get cached metadata for a specific entity and provider
   */
  async get(
    entityType: string,
    entityId: string,
    provider: string
  ): Promise<any | null> {
    try {
      const results = await this.drizzle.db
        .select()
        .from(metadataCache)
        .where(
          and(
            eq(metadataCache.entityId, entityId),
            eq(metadataCache.entityType, entityType),
            eq(metadataCache.provider, provider)
          )
        )
        .limit(1);

      const cached = results[0] || null;

      if (!cached) {
        // Use debug level to avoid excessive logging in production
        this.logger.debug(`📭 Cache MISS: ${entityType}/${provider} (entity: ${entityId.substring(0, 8)}...)`);
        return null;
      }

      // Check if cache is expired
      if (cached.expiresAt && new Date() > cached.expiresAt) {
        this.logger.debug(`⏰ Cache EXPIRED: ${entityType}/${provider} (entity: ${entityId.substring(0, 8)}...) - expired ${cached.expiresAt.toISOString()}`);
        await this.delete(entityType, entityId, provider);
        return null;
      }

      // Calculate cache age for visibility (debug level to reduce log noise)
      const cacheAge = cached.fetchedAt
        ? Math.round((Date.now() - new Date(cached.fetchedAt).getTime()) / (1000 * 60 * 60))
        : 'unknown';
      this.logger.debug(`✅ Cache HIT: ${entityType}/${provider} (entity: ${entityId.substring(0, 8)}...) - cached ${cacheAge}h ago`);
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

      const existing = await this.drizzle.db
        .select()
        .from(metadataCache)
        .where(
          and(
            eq(metadataCache.entityId, entityId),
            eq(metadataCache.entityType, entityType),
            eq(metadataCache.provider, provider)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await this.drizzle.db
          .update(metadataCache)
          .set({
            data: JSON.stringify(metadata),
            fetchedAt: new Date(),
            expiresAt,
          })
          .where(
            and(
              eq(metadataCache.entityId, entityId),
              eq(metadataCache.entityType, entityType),
              eq(metadataCache.provider, provider)
            )
          );
      } else {
        await this.drizzle.db
          .insert(metadataCache)
          .values({
            entityId,
            entityType,
            provider,
            data: JSON.stringify(metadata),
            expiresAt,
          });
      }

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
      await this.drizzle.db
        .delete(metadataCache)
        .where(
          and(
            eq(metadataCache.entityId, entityId),
            eq(metadataCache.entityType, entityType),
            eq(metadataCache.provider, provider)
          )
        );

      this.logger.debug(`Deleted cache: ${entityType}:${entityId}:${provider}`);
    } catch (error) {
      this.logger.error(`Error deleting cache: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  /**
   * Clear all cached metadata for an entity
   */
  async clearEntity(entityType: string, entityId: string): Promise<void> {
    try {
      await this.drizzle.db
        .delete(metadataCache)
        .where(
          and(
            eq(metadataCache.entityType, entityType),
            eq(metadataCache.entityId, entityId)
          )
        );

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
      const deleted = await this.drizzle.db
        .delete(metadataCache)
        .where(lte(metadataCache.expiresAt, new Date()))
        .returning();

      const count = deleted.length;
      this.logger.info(`Cleared ${count} expired cache entries`);
      return count;
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
      const [totalResult, byEntityType, byProvider] = await Promise.all([
        this.drizzle.db
          .select({ count: sql<number>`count(*)::int` })
          .from(metadataCache),
        this.drizzle.db
          .select({
            entityType: metadataCache.entityType,
            count: sql<number>`count(*)::int`,
          })
          .from(metadataCache)
          .groupBy(metadataCache.entityType),
        this.drizzle.db
          .select({
            provider: metadataCache.provider,
            count: sql<number>`count(*)::int`,
          })
          .from(metadataCache)
          .groupBy(metadataCache.provider),
      ]);

      const total = totalResult[0]?.count || 0;

      return {
        total,
        byEntityType: Object.fromEntries(
          byEntityType.map((item) => [item.entityType, item.count])
        ),
        byProvider: Object.fromEntries(
          byProvider.map((item) => [item.provider, item.count])
        ),
      };
    } catch (error) {
      this.logger.error(`Error getting cache stats: ${(error as Error).message}`, (error as Error).stack);
      return { total: 0, byEntityType: {}, byProvider: {} };
    }
  }
}
