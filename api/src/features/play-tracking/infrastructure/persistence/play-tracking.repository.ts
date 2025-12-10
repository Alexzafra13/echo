import { Injectable } from '@nestjs/common';
import { eq, desc, and, gte, count, avg, sql, sum } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { playHistory, userPlayStats, tracks, playQueues, artists } from '@infrastructure/database/schema';
import { IPlayTrackingRepository } from '../../domain/ports';
import {
  PlayEvent,
  PlayStats,
  PlayContext,
  UserPlaySummary,
  TrackPlaySummary,
  CONTEXT_WEIGHTS,
} from '../../domain/entities/play-event.entity';
import { PlayTrackingMapper } from '../mappers/play-tracking.mapper';

@Injectable()
export class DrizzlePlayTrackingRepository implements IPlayTrackingRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  // ===================================
  // WRITE OPERATIONS
  // ===================================

  async recordPlay(event: Omit<PlayEvent, 'id' | 'createdAt'>): Promise<PlayEvent> {
    const result = await this.drizzle.db
      .insert(playHistory)
      .values({
        userId: event.userId,
        trackId: event.trackId,
        playedAt: event.playedAt,
        client: event.client,
        playContext: event.playContext,
        completionRate: event.completionRate,
        skipped: event.skipped,
        sourceId: event.sourceId,
        sourceType: event.sourceType,
      })
      .returning();

    return PlayTrackingMapper.toPlayEventDomain(result[0]);
  }

  async recordSkip(
    userId: string,
    trackId: string,
    completionRate: number,
    playContext: PlayContext,
  ): Promise<PlayEvent> {
    const result = await this.drizzle.db
      .insert(playHistory)
      .values({
        userId,
        trackId,
        playedAt: new Date(),
        playContext,
        completionRate,
        skipped: true,
      })
      .returning();

    return PlayTrackingMapper.toPlayEventDomain(result[0]);
  }

  async updatePlayStats(
    userId: string,
    trackId: string,
    playContext: PlayContext,
    completionRate: number,
  ): Promise<void> {
    const contextWeight = CONTEXT_WEIGHTS[playContext];
    const weightedPlay = contextWeight * completionRate;

    // Update track stats
    await this.updateItemStats(userId, trackId, 'track', weightedPlay, completionRate);

    // Increment the track's global play count (denormalized for O(1) reads)
    await this.drizzle.db.execute(sql`
      UPDATE tracks SET play_count = play_count + 1 WHERE id = ${trackId}
    `);

    // Get album and artist IDs
    const track = await this.drizzle.db
      .select({ albumId: tracks.albumId, artistId: tracks.artistId, albumArtistId: tracks.albumArtistId })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (!track[0]) return;

    // Update album stats if exists
    if (track[0].albumId) {
      await this.updateItemStats(userId, track[0].albumId, 'album', weightedPlay, completionRate);
    }

    // Determine which artist to credit (prefer artistId, fallback to albumArtistId)
    const effectiveArtistId = track[0].artistId || track[0].albumArtistId;

    // Update artist stats if exists
    if (effectiveArtistId) {
      await this.updateItemStats(userId, effectiveArtistId, 'artist', weightedPlay, completionRate);

      // Increment the artist's global play count (denormalized for O(1) reads)
      await this.drizzle.db.execute(sql`
        UPDATE artists SET play_count = play_count + 1 WHERE id = ${effectiveArtistId}
      `);
    }
  }

  /**
   * Update item stats using upsert with atomic increments to avoid race conditions.
   * Uses raw SQL for atomic increment operations that can't be achieved with Drizzle's onConflictDoUpdate.
   */
  private async updateItemStats(
    userId: string,
    itemId: string,
    itemType: string,
    weightedPlay: number,
    completionRate: number,
  ): Promise<void> {
    const skipIncrement = completionRate < 0.5 ? 1 : 0;

    // Use INSERT ... ON CONFLICT for atomic upsert with increments
    // This avoids race conditions by doing all operations in a single atomic statement
    await this.drizzle.db.execute(sql`
      INSERT INTO user_play_stats (user_id, item_id, item_type, play_count, weighted_play_count, last_played_at, avg_completion_rate, skip_count)
      VALUES (${userId}, ${itemId}, ${itemType}, 1, ${weightedPlay}, NOW(), ${completionRate}, ${skipIncrement})
      ON CONFLICT (user_id, item_id, item_type)
      DO UPDATE SET
        play_count = user_play_stats.play_count + 1,
        weighted_play_count = user_play_stats.weighted_play_count + ${weightedPlay},
        last_played_at = NOW(),
        avg_completion_rate = (
          COALESCE(user_play_stats.avg_completion_rate, 0) * user_play_stats.play_count + ${completionRate}
        ) / (user_play_stats.play_count + 1),
        skip_count = user_play_stats.skip_count + ${skipIncrement}
    `);
  }

  // ===================================
  // READ OPERATIONS - HISTORY
  // ===================================

  async getUserPlayHistory(userId: string, limit: number = 50, offset: number = 0): Promise<PlayEvent[]> {
    const history = await this.drizzle.db
      .select()
      .from(playHistory)
      .where(eq(playHistory.userId, userId))
      .orderBy(desc(playHistory.playedAt))
      .limit(limit)
      .offset(offset);

    return PlayTrackingMapper.toPlayEventDomainArray(history);
  }

  async getTrackPlayHistory(trackId: string, limit: number = 50): Promise<PlayEvent[]> {
    const history = await this.drizzle.db
      .select()
      .from(playHistory)
      .where(eq(playHistory.trackId, trackId))
      .orderBy(desc(playHistory.playedAt))
      .limit(limit);

    return PlayTrackingMapper.toPlayEventDomainArray(history);
  }

  // ===================================
  // READ OPERATIONS - STATS
  // ===================================

  async getUserPlayStats(userId: string, itemType?: string): Promise<PlayStats[]> {
    let query = this.drizzle.db
      .select()
      .from(userPlayStats)
      .where(eq(userPlayStats.userId, userId))
      .orderBy(desc(userPlayStats.weightedPlayCount));

    if (itemType) {
      query = this.drizzle.db
        .select()
        .from(userPlayStats)
        .where(and(eq(userPlayStats.userId, userId), eq(userPlayStats.itemType, itemType)))
        .orderBy(desc(userPlayStats.weightedPlayCount));
    }

    const stats = await query;

    return stats.map((stat) => ({
      userId: stat.userId,
      itemId: stat.itemId,
      itemType: stat.itemType as 'track' | 'album' | 'artist',
      playCount: Number(stat.playCount),
      weightedPlayCount: stat.weightedPlayCount,
      lastPlayedAt: stat.lastPlayedAt || undefined,
      avgCompletionRate: stat.avgCompletionRate || undefined,
      skipCount: Number(stat.skipCount),
    }));
  }

  async getTrackPlayStats(trackId: string): Promise<PlayStats[]> {
    const stats = await this.drizzle.db
      .select()
      .from(userPlayStats)
      .where(and(eq(userPlayStats.itemId, trackId), eq(userPlayStats.itemType, 'track')))
      .orderBy(desc(userPlayStats.playCount));

    return stats.map((stat) => ({
      userId: stat.userId,
      itemId: stat.itemId,
      itemType: 'track' as const,
      playCount: Number(stat.playCount),
      weightedPlayCount: stat.weightedPlayCount,
      lastPlayedAt: stat.lastPlayedAt || undefined,
      avgCompletionRate: stat.avgCompletionRate || undefined,
      skipCount: Number(stat.skipCount),
    }));
  }

  // ===================================
  // READ OPERATIONS - SUMMARIES
  // ===================================

  async getUserPlaySummary(userId: string, days: number = 30): Promise<UserPlaySummary> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [plays, statsResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(playHistory)
        .where(and(eq(playHistory.userId, userId), gte(playHistory.playedAt, since)))
        .orderBy(desc(playHistory.playedAt))
        .limit(50),
      this.drizzle.db
        .select({
          count: count(),
          avgCompletionRate: avg(playHistory.completionRate),
        })
        .from(playHistory)
        .where(and(eq(playHistory.userId, userId), gte(playHistory.playedAt, since))),
    ]);

    const skipsCount = plays.filter((p) => p.skipped).length;

    // Count plays by context
    const playsByContext = plays.reduce((acc, play) => {
      const context = play.playContext as PlayContext;
      acc[context] = (acc[context] || 0) + 1;
      return acc;
    }, {} as Record<PlayContext, number>);

    // Find most common context
    let topContext: PlayContext = 'direct';
    let maxCount = 0;
    for (const [context, ctxCount] of Object.entries(playsByContext)) {
      if (ctxCount > maxCount) {
        maxCount = ctxCount;
        topContext = context as PlayContext;
      }
    }

    return {
      totalPlays: statsResult[0]?.count ?? 0,
      totalSkips: skipsCount,
      avgCompletionRate: Number(statsResult[0]?.avgCompletionRate) || 0,
      topContext,
      playsByContext,
      recentPlays: PlayTrackingMapper.toPlayEventDomainArray(plays),
    };
  }

  async getTrackPlaySummary(trackId: string): Promise<TrackPlaySummary> {
    const [statsResult, uniqueUsersResult, skipsResult] = await Promise.all([
      this.drizzle.db
        .select({
          count: count(),
          avgCompletionRate: avg(playHistory.completionRate),
        })
        .from(playHistory)
        .where(eq(playHistory.trackId, trackId)),
      this.drizzle.db.execute<{ userId: string }>(sql`
        SELECT DISTINCT user_id as "userId"
        FROM play_history
        WHERE track_id = ${trackId}
      `),
      this.drizzle.db
        .select({ count: count() })
        .from(playHistory)
        .where(and(eq(playHistory.trackId, trackId), eq(playHistory.skipped, true))),
    ]);

    const totalPlays = statsResult[0]?.count ?? 0;
    const avgCompletionRate = Number(statsResult[0]?.avgCompletionRate) || 0;
    const skips = skipsResult[0]?.count ?? 0;
    const skipRate = totalPlays > 0 ? skips / totalPlays : 0;
    const uniqueListeners = uniqueUsersResult.rows.length;

    // Simple popularity score
    const popularityScore =
      uniqueListeners > 0
        ? (totalPlays / uniqueListeners) * avgCompletionRate * (1 - skipRate) * 100
        : 0;

    return {
      trackId,
      totalPlays,
      uniqueListeners,
      avgCompletionRate,
      skipRate,
      popularityScore,
    };
  }

  // ===================================
  // READ OPERATIONS - TOP ITEMS
  // ===================================

  async getUserTopTracks(
    userId: string,
    limit: number = 50,
    days?: number,
  ): Promise<{ trackId: string; playCount: number; weightedPlayCount: number }[]> {
    let whereCondition = and(eq(userPlayStats.userId, userId), eq(userPlayStats.itemType, 'track'));

    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      whereCondition = and(whereCondition, gte(userPlayStats.lastPlayedAt, since));
    }

    const stats = await this.drizzle.db
      .select({
        itemId: userPlayStats.itemId,
        playCount: userPlayStats.playCount,
        weightedPlayCount: userPlayStats.weightedPlayCount,
      })
      .from(userPlayStats)
      .where(whereCondition)
      .orderBy(desc(userPlayStats.weightedPlayCount))
      .limit(limit);

    return stats.map((stat) => ({
      trackId: stat.itemId,
      playCount: Number(stat.playCount),
      weightedPlayCount: stat.weightedPlayCount,
    }));
  }

  async getUserTopAlbums(
    userId: string,
    limit: number = 50,
    days?: number,
  ): Promise<{ albumId: string; playCount: number }[]> {
    let whereCondition = and(eq(userPlayStats.userId, userId), eq(userPlayStats.itemType, 'album'));

    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      whereCondition = and(whereCondition, gte(userPlayStats.lastPlayedAt, since));
    }

    const stats = await this.drizzle.db
      .select({
        itemId: userPlayStats.itemId,
        playCount: userPlayStats.playCount,
      })
      .from(userPlayStats)
      .where(whereCondition)
      .orderBy(desc(userPlayStats.weightedPlayCount))
      .limit(limit);

    return stats.map((stat) => ({
      albumId: stat.itemId,
      playCount: Number(stat.playCount),
    }));
  }

  async getUserTopArtists(
    userId: string,
    limit: number = 50,
    days?: number,
  ): Promise<{ artistId: string; playCount: number }[]> {
    let whereCondition = and(eq(userPlayStats.userId, userId), eq(userPlayStats.itemType, 'artist'));

    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      whereCondition = and(whereCondition, gte(userPlayStats.lastPlayedAt, since));
    }

    const stats = await this.drizzle.db
      .select({
        itemId: userPlayStats.itemId,
        playCount: userPlayStats.playCount,
      })
      .from(userPlayStats)
      .where(whereCondition)
      .orderBy(desc(userPlayStats.weightedPlayCount))
      .limit(limit);

    return stats.map((stat) => ({
      artistId: stat.itemId,
      playCount: Number(stat.playCount),
    }));
  }

  async getItemPlayCount(
    userId: string,
    itemId: string,
    itemType: 'track' | 'album' | 'artist',
  ): Promise<{ playCount: number; lastPlayedAt: Date | null } | null> {
    const result = await this.drizzle.db
      .select({
        playCount: userPlayStats.playCount,
        lastPlayedAt: userPlayStats.lastPlayedAt,
      })
      .from(userPlayStats)
      .where(
        and(
          eq(userPlayStats.userId, userId),
          eq(userPlayStats.itemId, itemId),
          eq(userPlayStats.itemType, itemType),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      playCount: Number(result[0].playCount),
      lastPlayedAt: result[0].lastPlayedAt,
    };
  }

  async getItemGlobalPlayCount(
    itemId: string,
    itemType: 'track' | 'album' | 'artist',
  ): Promise<number> {
    const result = await this.drizzle.db
      .select({
        totalPlayCount: sum(userPlayStats.playCount),
      })
      .from(userPlayStats)
      .where(
        and(
          eq(userPlayStats.itemId, itemId),
          eq(userPlayStats.itemType, itemType),
        ),
      );

    return Number(result[0]?.totalPlayCount || 0);
  }

  async getRecentlyPlayed(userId: string, limit: number = 20): Promise<string[]> {
    const history = await this.drizzle.db.execute<{ trackId: string }>(sql`
      SELECT DISTINCT ON (track_id) track_id as "trackId"
      FROM play_history
      WHERE user_id = ${userId}
      ORDER BY track_id, played_at DESC
      LIMIT ${limit}
    `);

    return history.rows.map((h) => h.trackId);
  }

  // ===================================
  // READ OPERATIONS - ANALYTICS
  // ===================================

  async getListeningTimeByDay(
    userId: string,
    days: number = 30,
  ): Promise<{ date: string; minutes: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const history = await this.drizzle.db
      .select()
      .from(playHistory)
      .where(and(eq(playHistory.userId, userId), gte(playHistory.playedAt, since)))
      .orderBy(playHistory.playedAt);

    // Group by date and calculate approximate listening time
    // Assuming average song duration of 3.5 minutes
    const AVERAGE_SONG_DURATION = 3.5;

    const byDate: Record<string, number> = {};

    for (const play of history) {
      const dateKey = play.playedAt.toISOString().split('T')[0];
      const completionRate = play.completionRate || 1.0;
      const minutes = AVERAGE_SONG_DURATION * completionRate;

      byDate[dateKey] = (byDate[dateKey] || 0) + minutes;
    }

    return Object.entries(byDate).map(([date, minutes]) => ({
      date,
      minutes: Math.round(minutes * 10) / 10,
    }));
  }

  // ===================================
  // PLAYBACK STATE (Social "Listening Now")
  // ===================================

  async updatePlaybackState(
    userId: string,
    isPlaying: boolean,
    currentTrackId: string | null,
  ): Promise<void> {
    // Use upsert: insert if not exists, update if exists
    await this.drizzle.db.execute(sql`
      INSERT INTO play_queue (user_id, current_track_id, is_playing, updated_at)
      VALUES (${userId}, ${currentTrackId}, ${isPlaying}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_track_id = ${currentTrackId},
        is_playing = ${isPlaying},
        updated_at = NOW()
    `);
  }
}
