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
} from '../../domain/entities/play-event.entity';
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
    private readonly cache: RedisService
  ) {}

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
    playContext: PlayContext
  ): Promise<PlayEvent> {
    const result = await this.baseRepository.recordSkip(
      userId,
      trackId,
      completionRate,
      playContext
    );

    // Invalidate user-related caches
    await this.invalidateUserCaches(userId);

    return result;
  }

  async updatePlayStats(
    userId: string,
    trackId: string,
    playContext: PlayContext,
    completionRate: number
  ): Promise<void> {
    await this.baseRepository.updatePlayStats(userId, trackId, playContext, completionRate);

    // Invalidate user-related caches
    await this.invalidateUserCaches(userId);
  }

  // ===================================
  // READ OPERATIONS (With cache)
  // ===================================

  /**
   * CRITICAL: Most frequently called method (every Wave Mix generation)
   * Cache aggressively with 10 min TTL
   */
  async getUserPlayStats(userId: string, itemType?: string): Promise<PlayStats[]> {
    const cacheKey = `${this.KEY_PREFIX}user-stats:${userId}:${itemType || 'all'}`;

    // Check cache
    const cached = await this.cache.get<PlayStats[]>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Play stats cache hit');
      return cached;
    }

    this.logger.debug({ cacheKey, type: 'MISS' }, 'Play stats cache miss');

    // Fetch from DB
    const stats = await this.baseRepository.getUserPlayStats(userId, itemType);

    // Cache result
    if (stats.length > 0) {
      await this.cache.set(cacheKey, stats, this.STATS_TTL);
    }

    return stats;
  }

  async getTrackPlayStats(trackId: string): Promise<PlayStats[]> {
    const cacheKey = `${this.KEY_PREFIX}track-stats:${trackId}`;

    const cached = await this.cache.get<PlayStats[]>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Track stats cache hit');
      return cached;
    }

    const stats = await this.baseRepository.getTrackPlayStats(trackId);

    if (stats.length > 0) {
      await this.cache.set(cacheKey, stats, this.STATS_TTL);
    }

    return stats;
  }

  /**
   * Top items - cached with 15 min TTL
   */
  async getUserTopTracks(
    userId: string,
    limit?: number,
    days?: number
  ): Promise<{ trackId: string; playCount: number; weightedPlayCount: number }[]> {
    const cacheKey = `${this.KEY_PREFIX}top-tracks:${userId}:${limit || 50}:${days || 'all'}`;

    const cached =
      await this.cache.get<{ trackId: string; playCount: number; weightedPlayCount: number }[]>(
        cacheKey
      );
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Top tracks cache hit');
      return cached;
    }

    const result = await this.baseRepository.getUserTopTracks(userId, limit, days);

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, this.TOP_ITEMS_TTL);
    }

    return result;
  }

  async getUserTopAlbums(
    userId: string,
    limit?: number,
    days?: number
  ): Promise<{ albumId: string; playCount: number }[]> {
    const cacheKey = `${this.KEY_PREFIX}top-albums:${userId}:${limit || 50}:${days || 'all'}`;

    const cached = await this.cache.get<{ albumId: string; playCount: number }[]>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Top albums cache hit');
      return cached;
    }

    const result = await this.baseRepository.getUserTopAlbums(userId, limit, days);

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, this.TOP_ITEMS_TTL);
    }

    return result;
  }

  async getUserTopArtists(
    userId: string,
    limit?: number,
    days?: number
  ): Promise<{ artistId: string; playCount: number }[]> {
    const cacheKey = `${this.KEY_PREFIX}top-artists:${userId}:${limit || 50}:${days || 'all'}`;

    const cached = await this.cache.get<{ artistId: string; playCount: number }[]>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Top artists cache hit');
      return cached;
    }

    const result = await this.baseRepository.getUserTopArtists(userId, limit, days);

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, this.TOP_ITEMS_TTL);
    }

    return result;
  }

  /**
   * Recently played - cached with 5 min TTL (more dynamic)
   */
  async getRecentlyPlayed(userId: string, limit?: number): Promise<string[]> {
    const cacheKey = `${this.KEY_PREFIX}recent:${userId}:${limit || 20}`;

    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Recently played cache hit');
      return cached;
    }

    const result = await this.baseRepository.getRecentlyPlayed(userId, limit);

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, this.RECENT_TTL);
    }

    return result;
  }

  /**
   * Summaries - cached with 10 min TTL
   */
  async getUserPlaySummary(userId: string, days?: number): Promise<UserPlaySummary> {
    const cacheKey = `${this.KEY_PREFIX}summary:${userId}:${days || 'all'}`;

    const cached = await this.cache.get<UserPlaySummary>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Play summary cache hit');
      return cached;
    }

    const result = await this.baseRepository.getUserPlaySummary(userId, days);

    await this.cache.set(cacheKey, result, this.STATS_TTL);

    return result;
  }

  async getTrackPlaySummary(trackId: string): Promise<TrackPlaySummary> {
    const cacheKey = `${this.KEY_PREFIX}track-summary:${trackId}`;

    const cached = await this.cache.get<TrackPlaySummary>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Track summary cache hit');
      return cached;
    }

    const result = await this.baseRepository.getTrackPlaySummary(trackId);

    await this.cache.set(cacheKey, result, this.STATS_TTL);

    return result;
  }

  async getListeningTimeByDay(
    userId: string,
    days?: number
  ): Promise<{ date: string; minutes: number }[]> {
    const cacheKey = `${this.KEY_PREFIX}listening-time:${userId}:${days || 30}`;

    const cached = await this.cache.get<{ date: string; minutes: number }[]>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Listening time cache hit');
      return cached;
    }

    const result = await this.baseRepository.getListeningTimeByDay(userId, days);

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, this.STATS_TTL);
    }

    return result;
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
    currentTrackId: string | null
  ): Promise<void> {
    // Pass-through - no caching needed for real-time playback state
    return this.baseRepository.updatePlaybackState(userId, isPlaying, currentTrackId);
  }

  // ===================================
  // ARTIST GLOBAL STATS (for artist detail page)
  // ===================================

  /**
   * Get top tracks for an artist across ALL users
   * Cached with 15 min TTL - global data changes less frequently
   */
  async getArtistTopTracks(
    artistId: string,
    limit?: number,
    days?: number
  ): Promise<
    {
      trackId: string;
      title: string;
      albumId: string | null;
      albumName: string | null;
      duration: number | null;
      playCount: number;
      uniqueListeners: number;
    }[]
  > {
    const cacheKey = `${this.KEY_PREFIX}artist-top-tracks:${artistId}:${limit || 10}:${days || 'all'}`;

    const cached =
      await this.cache.get<
        {
          trackId: string;
          title: string;
          albumId: string | null;
          albumName: string | null;
          duration: number | null;
          playCount: number;
          uniqueListeners: number;
        }[]
      >(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Artist top tracks cache hit');
      return cached;
    }

    const result = await this.baseRepository.getArtistTopTracks(artistId, limit, days);

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, this.TOP_ITEMS_TTL);
    }

    return result;
  }

  /**
   * Get global statistics for an artist
   * Cached with 15 min TTL
   */
  async getArtistGlobalStats(artistId: string): Promise<{
    totalPlays: number;
    uniqueListeners: number;
    avgCompletionRate: number;
    skipRate: number;
  }> {
    const cacheKey = `${this.KEY_PREFIX}artist-global-stats:${artistId}`;

    const cached = await this.cache.get<{
      totalPlays: number;
      uniqueListeners: number;
      avgCompletionRate: number;
      skipRate: number;
    }>(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Artist global stats cache hit');
      return cached;
    }

    const result = await this.baseRepository.getArtistGlobalStats(artistId);

    await this.cache.set(cacheKey, result, this.TOP_ITEMS_TTL);

    return result;
  }

  /**
   * Get related artists based on co-listening patterns
   * Cached with 15 min TTL - relationships don't change quickly
   */
  async getRelatedArtists(
    artistId: string,
    limit?: number
  ): Promise<{ artistId: string; score: number; commonListeners: number }[]> {
    const cacheKey = `${this.KEY_PREFIX}related-artists:${artistId}:${limit || 10}`;

    const cached =
      await this.cache.get<{ artistId: string; score: number; commonListeners: number }[]>(
        cacheKey
      );
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Related artists cache hit');
      return cached;
    }

    const result = await this.baseRepository.getRelatedArtists(artistId, limit);

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, this.TOP_ITEMS_TTL);
    }

    return result;
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
