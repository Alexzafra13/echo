import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';
import { IPlayTrackingRepository } from '../../domain/ports/play-tracking.repository.port';
import {
  PlayEvent,
  PlayStats,
  PlayContext,
  SourceType,
  UserPlaySummary,
  TrackPlaySummary,
} from '../../domain/entities/play-event.types';
import { DrizzlePlayTrackingRepository } from './play-tracking.repository';
import { cacheConfig } from '@config/cache.config';

/**
 * CachedPlayTrackingRepository - Decorator Pattern with Redis Cache
 *
 * Caches frequently accessed play stats to reduce database load
 *
 * Cache Strategy:
 * - Read operations: Cache with TTL
 * - Write operations: Invalidate related caches
 *
 * Most cached:
 * - getUserPlayStats: 10 min TTL (called every Wave Mix generation)
 * - getUserTopTracks/Albums/Artists: 15 min TTL
 * - getRecentlyPlayed: 5 min TTL
 */
@Injectable()
export class CachedPlayTrackingRepository implements IPlayTrackingRepository {
  // TTLs from centralized config
  private readonly STATS_TTL = cacheConfig.ttl.playStats;
  private readonly TOP_ITEMS_TTL = cacheConfig.ttl.topItems;
  private readonly RECENT_TTL = cacheConfig.ttl.recent;

  private readonly KEY_PREFIX = 'play-tracking:';

  constructor(
    @InjectPinoLogger(CachedPlayTrackingRepository.name)
    private readonly logger: PinoLogger,
    private readonly baseRepository: DrizzlePlayTrackingRepository,
    private readonly cache: RedisService,
  ) {}

  // ===================================
  // CACHE HELPER
  // ===================================

  /**
   * Generic cache-aside pattern helper
   * Checks cache first, fetches from DB if miss, then caches result
   */
  private async getCachedOrFetch<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    shouldCache: (result: T) => boolean = () => true,
  ): Promise<T> {
    const cached = await this.cache.get<T>(cacheKey);
    if (cached !== null && cached !== undefined) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Cache hit');
      return cached;
    }

    this.logger.debug({ cacheKey, type: 'MISS' }, 'Cache miss');
    const result = await fetcher();

    if (shouldCache(result)) {
      await this.cache.set(cacheKey, result, ttl);
    }

    return result;
  }

  // ===================================
  // WRITE OPERATIONS (Invalidate cache)
  // ===================================

  async recordPlay(event: Omit<PlayEvent, 'id' | 'createdAt'>): Promise<PlayEvent> {
    const result = await this.baseRepository.recordPlay(event);

    // Invalidate user-related caches
    await this.invalidateUserCaches(event.userId);

    return result;
  }

  async recordSkip(
    userId: string,
    trackId: string,
    completionRate: number,
    playContext: PlayContext,
  ): Promise<PlayEvent> {
    const result = await this.baseRepository.recordSkip(userId, trackId, completionRate, playContext);

    // Invalidate user-related caches
    await this.invalidateUserCaches(userId);

    return result;
  }

  async updatePlayStats(
    userId: string,
    trackId: string,
    playContext: PlayContext,
    completionRate: number,
  ): Promise<void> {
    await this.baseRepository.updatePlayStats(userId, trackId, playContext, completionRate);

    // Invalidate user-related caches
    await this.invalidateUserCaches(userId);
  }

  // ===================================
  // READ OPERATIONS (With cache)
  // ===================================

  // Helper to check if array result should be cached
  private readonly hasItems = <T>(arr: T[]): boolean => arr.length > 0;

  /**
   * CRITICAL: Most frequently called method (every Wave Mix generation)
   */
  async getUserPlayStats(userId: string, itemType?: string): Promise<PlayStats[]> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}user-stats:${userId}:${itemType || 'all'}`,
      () => this.baseRepository.getUserPlayStats(userId, itemType),
      this.STATS_TTL,
      this.hasItems,
    );
  }

  async getTrackPlayStats(trackId: string): Promise<PlayStats[]> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}track-stats:${trackId}`,
      () => this.baseRepository.getTrackPlayStats(trackId),
      this.STATS_TTL,
      this.hasItems,
    );
  }

  /**
   * Top items - cached with 15 min TTL
   */
  async getUserTopTracks(
    userId: string,
    limit?: number,
    days?: number,
  ): Promise<{ trackId: string; playCount: number; weightedPlayCount: number }[]> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}top-tracks:${userId}:${limit || 50}:${days || 'all'}`,
      () => this.baseRepository.getUserTopTracks(userId, limit, days),
      this.TOP_ITEMS_TTL,
      this.hasItems,
    );
  }

  async getUserTopAlbums(
    userId: string,
    limit?: number,
    days?: number,
  ): Promise<{ albumId: string; playCount: number }[]> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}top-albums:${userId}:${limit || 50}:${days || 'all'}`,
      () => this.baseRepository.getUserTopAlbums(userId, limit, days),
      this.TOP_ITEMS_TTL,
      this.hasItems,
    );
  }

  async getUserTopArtists(
    userId: string,
    limit?: number,
    days?: number,
  ): Promise<{ artistId: string; playCount: number }[]> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}top-artists:${userId}:${limit || 50}:${days || 'all'}`,
      () => this.baseRepository.getUserTopArtists(userId, limit, days),
      this.TOP_ITEMS_TTL,
      this.hasItems,
    );
  }

  /**
   * Item play count for a specific user
   */
  async getItemPlayCount(
    userId: string,
    itemId: string,
    itemType: 'track' | 'album' | 'artist',
  ): Promise<{ playCount: number; lastPlayedAt: Date | null } | null> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}item-play-count:${userId}:${itemId}:${itemType}`,
      () => this.baseRepository.getItemPlayCount(userId, itemId, itemType),
      this.STATS_TTL,
      (result) => result !== null,
    );
  }

  /**
   * Global play count (all users)
   */
  async getItemGlobalPlayCount(
    itemId: string,
    itemType: 'track' | 'album' | 'artist',
  ): Promise<number> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}item-global-play-count:${itemId}:${itemType}`,
      () => this.baseRepository.getItemGlobalPlayCount(itemId, itemType),
      this.STATS_TTL,
    );
  }

  /**
   * Recently played - cached with 5 min TTL (more dynamic)
   */
  async getRecentlyPlayed(userId: string, limit?: number): Promise<string[]> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}recent:${userId}:${limit || 20}`,
      () => this.baseRepository.getRecentlyPlayed(userId, limit),
      this.RECENT_TTL,
      this.hasItems,
    );
  }

  /**
   * Summaries
   */
  async getUserPlaySummary(userId: string, days?: number): Promise<UserPlaySummary> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}summary:${userId}:${days || 'all'}`,
      () => this.baseRepository.getUserPlaySummary(userId, days),
      this.STATS_TTL,
    );
  }

  async getTrackPlaySummary(trackId: string): Promise<TrackPlaySummary> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}track-summary:${trackId}`,
      () => this.baseRepository.getTrackPlaySummary(trackId),
      this.STATS_TTL,
    );
  }

  async getListeningTimeByDay(
    userId: string,
    days?: number,
  ): Promise<{ date: string; minutes: number }[]> {
    return this.getCachedOrFetch(
      `${this.KEY_PREFIX}listening-time:${userId}:${days || 30}`,
      () => this.baseRepository.getListeningTimeByDay(userId, days),
      this.STATS_TTL,
      this.hasItems,
    );
  }

  // ===================================
  // PASS-THROUGH OPERATIONS (No cache)
  // ===================================

  async getUserPlayHistory(userId: string, limit?: number, offset?: number): Promise<PlayEvent[]> {
    // History is too dynamic to cache effectively
    return this.baseRepository.getUserPlayHistory(userId, limit, offset);
  }

  async getTrackPlayHistory(trackId: string, limit?: number): Promise<PlayEvent[]> {
    // History is too dynamic to cache effectively
    return this.baseRepository.getTrackPlayHistory(trackId, limit);
  }

  async updatePlaybackState(
    userId: string,
    isPlaying: boolean,
    currentTrackId: string | null,
  ): Promise<void> {
    // Pass-through - no caching needed for real-time playback state
    return this.baseRepository.updatePlaybackState(userId, isPlaying, currentTrackId);
  }

  // ===================================
  // CACHE INVALIDATION
  // ===================================

  /**
   * Invalidate all caches related to a user
   * Called on write operations (recordPlay, recordSkip, updatePlayStats)
   */
  private async invalidateUserCaches(userId: string): Promise<void> {
    await Promise.all([
      this.cache.delPattern(`${this.KEY_PREFIX}user-stats:${userId}:*`),
      this.cache.delPattern(`${this.KEY_PREFIX}top-tracks:${userId}:*`),
      this.cache.delPattern(`${this.KEY_PREFIX}top-albums:${userId}:*`),
      this.cache.delPattern(`${this.KEY_PREFIX}top-artists:${userId}:*`),
      this.cache.delPattern(`${this.KEY_PREFIX}recent:${userId}:*`),
      this.cache.delPattern(`${this.KEY_PREFIX}summary:${userId}:*`),
      this.cache.delPattern(`${this.KEY_PREFIX}listening-time:${userId}:*`),
    ]);

    this.logger.debug({ userId }, 'User play tracking cache invalidated');
  }
}
