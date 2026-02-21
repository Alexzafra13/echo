import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';

/**
 * Interface for entities that can be serialized/deserialized for caching.
 * Uses a flexible return type to accommodate various entity prop types.
 */
export interface CacheableEntity {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toPrimitives(): any;
}

/**
 * Base interface for repositories that support caching.
 * Defines the minimum contract that a repository must implement.
 */
export interface IBaseCacheableRepository<TEntity> {
  findById(id: string): Promise<TEntity | null>;
  findAll(skip: number, take: number): Promise<TEntity[]>;
  search(query: string, skip: number, take: number): Promise<TEntity[]>;
  count(): Promise<number>;
  create(entity: TEntity): Promise<TEntity>;
  update(id: string, entity: Partial<TEntity>): Promise<TEntity | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Configuration options for cached repository.
 */
export interface CachedRepositoryConfig {
  /** Prefix for single entity cache keys (e.g., 'album:') */
  keyPrefix: string;
  /** Prefix for search cache keys (e.g., 'albums:search:') */
  searchKeyPrefix: string;
  /** Prefix for list cache keys (e.g., 'albums:') */
  listKeyPrefix: string;
  /** TTL in seconds for single entity cache (default: 3600) */
  entityTtl?: number;
  /** TTL in seconds for search results cache (default: 60) */
  searchTtl?: number;
  /** TTL in seconds for count cache (default: 1800) */
  countTtl?: number;
}

/**
 * Function type for reconstructing an entity from cached primitives.
 * Uses 'unknown' to allow flexible input types from cache.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityReconstructor<TEntity> = (primitives: any) => TEntity;

/**
 * Abstract base class for cached repositories implementing the Cache-Aside pattern.
 *
 * This class provides:
 * - Automatic caching for findById, search operations
 * - Cache invalidation on create, update, delete
 * - Helper methods for caching custom operations in subclasses
 *
 * @template TEntity - The domain entity type
 * @template TRepository - The base repository type (must extend IBaseCacheableRepository)
 *
 * @example
 * ```typescript
 * export class CachedArtistRepository
 *   extends BaseCachedRepository<Artist, IArtistRepository>
 *   implements IArtistRepository
 * {
 *   constructor(
 *     baseRepository: DrizzleArtistRepository,
 *     cache: RedisService,
 *     logger: PinoLogger,
 *   ) {
 *     super(baseRepository, cache, logger, {
 *       keyPrefix: 'artist:',
 *       searchKeyPrefix: 'artists:search:',
 *       listKeyPrefix: 'artists:',
 *     }, Artist.reconstruct);
 *   }
 * }
 * ```
 */
export abstract class BaseCachedRepository<
  TEntity extends CacheableEntity,
  TRepository extends IBaseCacheableRepository<TEntity>,
> {
  protected readonly entityTtl: number;
  protected readonly searchTtl: number;
  protected readonly countTtl: number;

  constructor(
    protected readonly baseRepository: TRepository,
    protected readonly cache: RedisService,
    protected readonly logger: PinoLogger | null,
    protected readonly config: CachedRepositoryConfig,
    protected readonly reconstruct: EntityReconstructor<TEntity>
  ) {
    this.entityTtl = config.entityTtl ?? 3600;
    this.searchTtl = config.searchTtl ?? 60;
    this.countTtl = config.countTtl ?? 1800;
  }

  // ==================== READ OPERATIONS WITH CACHING ====================

  /**
   * Find entity by ID with cache-aside pattern.
   */
  async findById(id: string): Promise<TEntity | null> {
    const cacheKey = `${this.config.keyPrefix}${id}`;

    // 1. Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'findById');
      return this.reconstruct(cached);
    }

    this.logCacheMiss(cacheKey, 'findById');

    // 2. Fetch from DB
    const entity = await this.baseRepository.findById(id);

    // 3. Store in cache
    if (entity) {
      await this.cache.set(cacheKey, entity.toPrimitives(), this.entityTtl);
    }

    return entity;
  }

  /**
   * Find all entities with pagination.
   * By default, paginated lists are NOT cached due to many possible combinations.
   * Override this method if caching is needed for specific use cases.
   */
  async findAll(skip: number, take: number): Promise<TEntity[]> {
    return this.baseRepository.findAll(skip, take);
  }

  /**
   * Search entities with caching.
   * Uses shorter TTL since search results change frequently.
   */
  async search(query: string, skip: number, take: number): Promise<TEntity[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `${this.config.searchKeyPrefix}${normalizedQuery}:${skip}:${take}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'search');
      return this.reconstructArray(cached as unknown[]);
    }

    this.logCacheMiss(cacheKey, 'search');

    // Fetch from DB
    const entities = await this.baseRepository.search(query, skip, take);

    // Store in cache (even empty results to prevent repeated DB hits)
    const primitives = entities.map((e) => e.toPrimitives());
    await this.cache.set(cacheKey, primitives, this.searchTtl);

    return entities;
  }

  /**
   * Count entities.
   * By default delegates to base repository. Override to add caching if needed.
   */
  async count(): Promise<number> {
    return this.baseRepository.count();
  }

  // ==================== WRITE OPERATIONS WITH CACHE INVALIDATION ====================

  /**
   * Create entity and invalidate related caches.
   */
  async create(entity: TEntity): Promise<TEntity> {
    const created = await this.baseRepository.create(entity);
    await this.invalidateSearchCaches();
    this.logCacheInvalidation('create');
    return created;
  }

  /**
   * Update entity and invalidate related caches.
   */
  async update(id: string, entity: Partial<TEntity>): Promise<TEntity | null> {
    const updated = await this.baseRepository.update(id, entity);

    if (updated) {
      await Promise.all([
        this.cache.del(`${this.config.keyPrefix}${id}`),
        this.invalidateSearchCaches(),
      ]);
      this.logCacheInvalidation('update', id);
    }

    return updated;
  }

  /**
   * Delete entity and invalidate related caches.
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.baseRepository.delete(id);

    if (deleted) {
      await Promise.all([
        this.cache.del(`${this.config.keyPrefix}${id}`),
        this.invalidateSearchCaches(),
      ]);
      this.logCacheInvalidation('delete', id);
    }

    return deleted;
  }

  // ==================== PROTECTED HELPER METHODS FOR SUBCLASSES ====================

  /**
   * Get a cached value or fetch from source.
   * Use this for custom cached operations in subclasses.
   *
   * @example
   * ```typescript
   * async findByArtistId(artistId: string): Promise<Album[]> {
   *   return this.getCachedOrFetch(
   *     `albums:artist:${artistId}`,
   *     () => this.baseRepository.findByArtistId(artistId),
   *     this.entityTtl,
   *     true, // isArray
   *   );
   * }
   * ```
   */
  protected async getCachedOrFetch<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    isArray: boolean = false
  ): Promise<T> {
    const cached = await this.cache.get(cacheKey);

    if (cached !== null && cached !== undefined) {
      this.logCacheHit(cacheKey, 'custom');
      if (isArray && Array.isArray(cached)) {
        return this.reconstructArray(cached) as unknown as T;
      }
      // For non-array single entities
      if (!isArray && typeof cached === 'object') {
        return this.reconstruct(cached) as unknown as T;
      }
      // For primitive values (like count)
      return cached as T;
    }

    this.logCacheMiss(cacheKey, 'custom');
    const result = await fetcher();

    // Store in cache
    if (result !== null && result !== undefined) {
      if (isArray && Array.isArray(result)) {
        const primitives = (result as unknown as TEntity[]).map((e) => e.toPrimitives());
        await this.cache.set(cacheKey, primitives, ttl);
      } else if (!isArray && typeof result === 'object' && 'toPrimitives' in (result as object)) {
        await this.cache.set(cacheKey, (result as unknown as TEntity).toPrimitives(), ttl);
      } else {
        await this.cache.set(cacheKey, result, ttl);
      }
    }

    return result;
  }

  /**
   * Cache a value without fetching (useful for storing computed results).
   */
  protected async cacheValue(cacheKey: string, value: unknown, ttl: number): Promise<void> {
    await this.cache.set(cacheKey, value, ttl);
  }

  /**
   * Delete a specific cache key.
   */
  protected async invalidateKey(cacheKey: string): Promise<void> {
    await this.cache.del(cacheKey);
  }

  /**
   * Delete all cache keys matching a pattern.
   */
  protected async invalidatePattern(pattern: string): Promise<void> {
    await this.cache.delPattern(pattern);
  }

  /**
   * Invalidate all search-related caches.
   * Called automatically on create/update/delete.
   */
  protected async invalidateSearchCaches(): Promise<void> {
    await this.cache.delPattern(`${this.config.searchKeyPrefix}*`);
  }

  /**
   * Invalidate all caches (entity, search, lists).
   * Use this for operations that affect many entities.
   */
  protected async invalidateAllCaches(): Promise<void> {
    await Promise.all([
      this.cache.delPattern(`${this.config.keyPrefix}*`),
      this.cache.delPattern(`${this.config.searchKeyPrefix}*`),
      this.cache.delPattern(`${this.config.listKeyPrefix}*`),
    ]);
    this.logCacheInvalidation('invalidateAll');
  }

  /**
   * Reconstruct an array of entities from cached primitives.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected reconstructArray(cached: any[]): TEntity[] {
    return cached.map((item) => this.reconstruct(item));
  }

  // ==================== PRIVATE LOGGING HELPERS ====================

  private logCacheHit(cacheKey: string, operation: string): void {
    this.logger?.debug({ cacheKey, operation, type: 'HIT' }, 'Cache hit');
  }

  private logCacheMiss(cacheKey: string, operation: string): void {
    this.logger?.debug({ cacheKey, operation, type: 'MISS' }, 'Cache miss');
  }

  private logCacheInvalidation(operation: string, id?: string): void {
    this.logger?.debug({ operation, entityId: id }, 'Cache invalidated');
  }
}
