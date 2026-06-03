import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';

// Entidad que se puede serializar para cachear
export interface CacheableEntity {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toPrimitives(): any;
}

// Contrato mínimo que debe cumplir un repositorio cacheable
export interface IBaseCacheableRepository<TEntity> {
  findById(id: string): Promise<TEntity | null>;
  findAll(skip: number, take: number): Promise<TEntity[]>;
  search(query: string, skip: number, take: number): Promise<TEntity[]>;
  count(): Promise<number>;
  create(entity: TEntity): Promise<TEntity>;
  update(id: string, entity: Partial<TEntity>): Promise<TEntity | null>;
  delete(id: string): Promise<boolean>;
}

export interface CachedRepositoryConfig {
  /** Prefijo de claves de entidad (ej. 'album:') */
  keyPrefix: string;
  /** Prefijo de claves de búsqueda (ej. 'albums:search:') */
  searchKeyPrefix: string;
  /** Prefijo de claves de listas (ej. 'albums:') */
  listKeyPrefix: string;
  /** TTL en s de la caché de entidad (por defecto 3600) */
  entityTtl?: number;
  /** TTL en s de la caché de búsqueda (por defecto 60) */
  searchTtl?: number;
  /** TTL en s de la caché de count (por defecto 1800) */
  countTtl?: number;
}

// Reconstruye una entidad a partir de los primitivos cacheados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityReconstructor<TEntity> = (primitives: any) => TEntity;

/**
 * Base abstracta para repositorios cacheados (patrón cache-aside): cachea
 * findById/search e invalida en create/update/delete. Las subclases pueden
 * cachear sus propias operaciones con getCachedOrFetch().
 *
 * @example
 * export class CachedArtistRepository extends BaseCachedRepository<Artist, IArtistRepository> {
 *   constructor(base: DrizzleArtistRepository, cache: RedisService, logger: PinoLogger) {
 *     super(base, cache, logger, {
 *       keyPrefix: 'artist:', searchKeyPrefix: 'artists:search:', listKeyPrefix: 'artists:',
 *     }, Artist.reconstruct);
 *   }
 * }
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

  // ==================== Lecturas (con caché) ====================

  async findById(id: string): Promise<TEntity | null> {
    const cacheKey = `${this.config.keyPrefix}${id}`;

    // 1. Caché
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'findById');
      return this.reconstruct(cached);
    }

    this.logCacheMiss(cacheKey, 'findById');

    // 2. BD
    const entity = await this.baseRepository.findById(id);

    // 3. Guarda en caché
    if (entity) {
      await this.cache.set(cacheKey, entity.toPrimitives(), this.entityTtl);
    }

    return entity;
  }

  // No cachea: demasiadas combinaciones de paginación. Sobreescribir si hace falta.
  async findAll(skip: number, take: number): Promise<TEntity[]> {
    return this.baseRepository.findAll(skip, take);
  }

  // TTL corto: los resultados de búsqueda cambian a menudo
  async search(query: string, skip: number, take: number): Promise<TEntity[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `${this.config.searchKeyPrefix}${normalizedQuery}:${skip}:${take}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logCacheHit(cacheKey, 'search');
      return this.reconstructArray(cached as unknown[]);
    }

    this.logCacheMiss(cacheKey, 'search');

    const entities = await this.baseRepository.search(query, skip, take);

    // Cachea incluso resultados vacíos para no repetir consultas
    const primitives = entities.map((e) => e.toPrimitives());
    await this.cache.set(cacheKey, primitives, this.searchTtl);

    return entities;
  }

  // Delega en el repo base; sobreescribir para cachear si hace falta
  async count(): Promise<number> {
    return this.baseRepository.count();
  }

  // ==================== Escrituras (invalidan caché) ====================

  async create(entity: TEntity): Promise<TEntity> {
    const created = await this.baseRepository.create(entity);
    await this.invalidateSearchCaches();
    this.logCacheInvalidation('create');
    return created;
  }

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

  // ==================== Helpers para subclases ====================

  /**
   * Devuelve el valor cacheado o lo busca con `fetcher` y lo cachea.
   * Para las operaciones cacheadas propias de cada subclase.
   *
   * @example
   * findByArtistId(artistId: string) {
   *   return this.getCachedOrFetch(`albums:artist:${artistId}`,
   *     () => this.baseRepository.findByArtistId(artistId), this.entityTtl, true);
   * }
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
      // entidad única (no array)
      if (!isArray && typeof cached === 'object') {
        return this.reconstruct(cached) as unknown as T;
      }
      // valores primitivos (p.ej. count)
      return cached as T;
    }

    this.logCacheMiss(cacheKey, 'custom');
    const result = await fetcher();

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

  // Cachea un valor sin buscarlo (para resultados computados)
  protected async cacheValue(cacheKey: string, value: unknown, ttl: number): Promise<void> {
    await this.cache.set(cacheKey, value, ttl);
  }

  protected async invalidateKey(cacheKey: string): Promise<void> {
    await this.cache.del(cacheKey);
  }

  protected async invalidatePattern(pattern: string): Promise<void> {
    await this.cache.delPattern(pattern);
  }

  // Invalida las cachés de búsqueda (automático en create/update/delete)
  protected async invalidateSearchCaches(): Promise<void> {
    await this.cache.delPattern(`${this.config.searchKeyPrefix}*`);
  }

  // Invalida todas las cachés (entidad, búsqueda, listas)
  protected async invalidateAllCaches(): Promise<void> {
    await Promise.all([
      this.cache.delPattern(`${this.config.keyPrefix}*`),
      this.cache.delPattern(`${this.config.searchKeyPrefix}*`),
      this.cache.delPattern(`${this.config.listKeyPrefix}*`),
    ]);
    this.logCacheInvalidation('invalidateAll');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected reconstructArray(cached: any[]): TEntity[] {
    return cached.map((item) => this.reconstruct(item));
  }

  // ==================== Logging interno ====================

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
