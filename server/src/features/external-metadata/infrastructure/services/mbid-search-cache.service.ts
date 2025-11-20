import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Search cache entry interface
 */
export interface MbidSearchCacheEntry {
  queryText: string;
  queryType: 'artist' | 'album' | 'recording';
  queryParams?: Record<string, any>;
  results: any[];
  resultCount: number;
}

/**
 * MbidSearchCacheService
 *
 * Servicio de caché para búsquedas de MusicBrainz IDs
 *
 * Purpose:
 * - Evitar llamadas repetidas a la API de MusicBrainz
 * - Reducir rate limiting (MusicBrainz: 1 req/sec)
 * - Mejorar performance del scanner (95% menos llamadas API)
 *
 * Strategy:
 * - Cache key: normalizedQuery + queryType + params
 * - TTL: 7 días (los metadatos de MusicBrainz no cambian frecuentemente)
 * - Hit tracking: Estadísticas de uso
 *
 * Example:
 * - Scan 500 canciones de "Pink Floyd"
 * - Sin caché: 500 llamadas API = 8 minutos + risk de ban
 * - Con caché: 1 llamada API + 499 cache hits = 10 segundos
 */
@Injectable()
export class MbidSearchCacheService {
  private readonly logger = new Logger(MbidSearchCacheService.name);
  private readonly DEFAULT_TTL_DAYS = 7;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza el texto de búsqueda para cache key
   * - Lowercase
   * - Trim
   * - Normaliza espacios
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Genera cache key único
   */
  private generateCacheKey(
    queryText: string,
    queryType: string,
    queryParams?: Record<string, any>,
  ): { queryText: string; queryType: string; queryParams: Prisma.JsonValue } {
    const normalizedText = this.normalizeQuery(queryText);
    const normalizedParams = queryParams || {};

    return {
      queryText: normalizedText,
      queryType,
      queryParams: normalizedParams as Prisma.JsonValue,
    };
  }

  /**
   * Obtener resultado del caché
   *
   * @param queryText - Texto de búsqueda (artist/album name)
   * @param queryType - Tipo de búsqueda ('artist' | 'album' | 'recording')
   * @param queryParams - Parámetros adicionales (opcional)
   * @returns Resultados cacheados o null si no existe/expiró
   */
  async get(
    queryText: string,
    queryType: 'artist' | 'album' | 'recording',
    queryParams?: Record<string, any>,
  ): Promise<any[] | null> {
    try {
      const cacheKey = this.generateCacheKey(queryText, queryType, queryParams);

      const cached = await this.prisma.mbidSearchCache.findFirst({
        where: {
          queryText: cacheKey.queryText,
          queryType: cacheKey.queryType,
          queryParams: cacheKey.queryParams,
        },
      });

      if (!cached) {
        this.logger.debug(
          `Cache MISS: ${queryType}:"${queryText}" ${queryParams ? JSON.stringify(queryParams) : ''}`,
        );
        return null;
      }

      // Check expiration
      if (cached.expiresAt && new Date() > cached.expiresAt) {
        this.logger.debug(`Cache EXPIRED: ${queryType}:"${queryText}"`);
        await this.delete(cached.id);
        return null;
      }

      // Update hit stats
      await this.prisma.mbidSearchCache.update({
        where: { id: cached.id },
        data: {
          hitCount: { increment: 1 },
          lastHitAt: new Date(),
        },
      });

      this.logger.debug(
        `Cache HIT: ${queryType}:"${queryText}" (hits: ${cached.hitCount + 1})`,
      );

      return cached.results as any[];
    } catch (error) {
      this.logger.error(
        `Error reading from cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return null;
    }
  }

  /**
   * Guardar resultado en caché
   *
   * @param entry - Datos a cachear
   * @param ttlDays - TTL en días (default: 7)
   */
  async set(entry: MbidSearchCacheEntry, ttlDays?: number): Promise<void> {
    try {
      const ttl = ttlDays || this.DEFAULT_TTL_DAYS;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttl);

      const cacheKey = this.generateCacheKey(
        entry.queryText,
        entry.queryType,
        entry.queryParams,
      );

      await this.prisma.mbidSearchCache.upsert({
        where: {
          queryText_queryType_queryParams: {
            queryText: cacheKey.queryText,
            queryType: cacheKey.queryType,
            queryParams: cacheKey.queryParams,
          },
        },
        create: {
          queryText: cacheKey.queryText,
          queryType: cacheKey.queryType,
          queryParams: cacheKey.queryParams,
          results: entry.results as Prisma.JsonValue,
          resultCount: entry.resultCount,
          expiresAt,
        },
        update: {
          results: entry.results as Prisma.JsonValue,
          resultCount: entry.resultCount,
          expiresAt,
          // Reset hit count on update
          hitCount: 0,
          lastHitAt: null,
        },
      });

      this.logger.debug(
        `Cached ${entry.queryType} search: "${entry.queryText}" (${entry.resultCount} results, TTL: ${ttl}d)`,
      );
    } catch (error) {
      this.logger.error(
        `Error writing to cache: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Eliminar entrada específica del caché
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.mbidSearchCache.delete({
        where: { id },
      });
      this.logger.debug(`Deleted cache entry: ${id}`);
    } catch (error) {
      this.logger.warn(`Error deleting cache entry: ${(error as Error).message}`);
    }
  }

  /**
   * Limpiar entradas expiradas
   * Debe ejecutarse periódicamente (ej: cron diario)
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await this.prisma.mbidSearchCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired cache entries`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired cache: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * Obtener estadísticas del caché
   */
  async getStats(): Promise<{
    totalEntries: number;
    hitsByType: Record<string, number>;
    avgHitsPerEntry: number;
    oldestEntry: Date | null;
  }> {
    try {
      const entries = await this.prisma.mbidSearchCache.findMany({
        select: {
          queryType: true,
          hitCount: true,
          createdAt: true,
        },
      });

      const stats = {
        totalEntries: entries.length,
        hitsByType: {
          artist: 0,
          album: 0,
          recording: 0,
        },
        avgHitsPerEntry: 0,
        oldestEntry: null as Date | null,
      };

      if (entries.length === 0) {
        return stats;
      }

      let totalHits = 0;
      let oldestDate = entries[0].createdAt;

      entries.forEach((entry) => {
        stats.hitsByType[entry.queryType] =
          (stats.hitsByType[entry.queryType] || 0) + entry.hitCount;
        totalHits += entry.hitCount;

        if (entry.createdAt < oldestDate) {
          oldestDate = entry.createdAt;
        }
      });

      stats.avgHitsPerEntry = totalHits / entries.length;
      stats.oldestEntry = oldestDate;

      return stats;
    } catch (error) {
      this.logger.error(
        `Error getting cache stats: ${(error as Error).message}`,
      );
      return {
        totalEntries: 0,
        hitsByType: { artist: 0, album: 0, recording: 0 },
        avgHitsPerEntry: 0,
        oldestEntry: null,
      };
    }
  }

  /**
   * Invalidar todo el caché (útil para testing)
   */
  async clear(): Promise<number> {
    try {
      const result = await this.prisma.mbidSearchCache.deleteMany({});
      this.logger.warn(`Cleared entire MBID search cache (${result.count} entries)`);
      return result.count;
    } catch (error) {
      this.logger.error(`Error clearing cache: ${(error as Error).message}`);
      return 0;
    }
  }
}
