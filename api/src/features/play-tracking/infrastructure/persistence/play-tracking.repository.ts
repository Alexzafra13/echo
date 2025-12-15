import { Injectable } from '@nestjs/common';
import { eq, desc, and, gte, count, avg, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { playHistory, userPlayStats, tracks, playQueues } from '@infrastructure/database/schema';
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

    // Get album and artist IDs
    const track = await this.drizzle.db
      .select({ albumId: tracks.albumId, artistId: tracks.artistId })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (!track[0]) return;

    // Update album stats if exists
    if (track[0].albumId) {
      await this.updateItemStats(userId, track[0].albumId, 'album', weightedPlay, completionRate);
    }

    // Update artist stats if exists
    if (track[0].artistId) {
      await this.updateItemStats(userId, track[0].artistId, 'artist', weightedPlay, completionRate);
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

  // ===================================
  // ARTIST GLOBAL STATS (for artist detail page)
  // ===================================

  async getArtistTopTracks(
    artistId: string,
    limit: number = 10,
    days?: number,
  ): Promise<{
    trackId: string;
    title: string;
    albumId: string | null;
    albumName: string | null;
    duration: number | null;
    playCount: number;
    uniqueListeners: number;
  }[]> {
    let dateFilter = sql``;
    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter = sql` AND ph.played_at >= ${since}`;
    }

    const result = await this.drizzle.db.execute<{
      trackId: string;
      title: string;
      albumId: string | null;
      albumName: string | null;
      duration: string | null;
      playCount: string;
      uniqueListeners: string;
    }>(sql`
      SELECT
        t.id as "trackId",
        t.title as "title",
        t.album_id as "albumId",
        t.album_name as "albumName",
        t.duration::text as "duration",
        COUNT(ph.id)::text as "playCount",
        COUNT(DISTINCT ph.user_id)::text as "uniqueListeners"
      FROM tracks t
      INNER JOIN play_history ph ON ph.track_id = t.id
      WHERE t.artist_id = ${artistId}${dateFilter}
      GROUP BY t.id, t.title, t.album_id, t.album_name, t.duration
      ORDER BY COUNT(ph.id) DESC
      LIMIT ${limit}
    `);

    return result.rows.map((row) => ({
      trackId: row.trackId,
      title: row.title,
      albumId: row.albumId,
      albumName: row.albumName,
      duration: row.duration ? parseInt(row.duration, 10) : null,
      playCount: parseInt(row.playCount, 10),
      uniqueListeners: parseInt(row.uniqueListeners, 10),
    }));
  }

  async getArtistGlobalStats(artistId: string): Promise<{
    totalPlays: number;
    uniqueListeners: number;
    avgCompletionRate: number;
    skipRate: number;
  }> {
    const result = await this.drizzle.db.execute<{
      totalPlays: string;
      uniqueListeners: string;
      avgCompletionRate: string | null;
      skips: string;
    }>(sql`
      SELECT
        COUNT(ph.id)::text as "totalPlays",
        COUNT(DISTINCT ph.user_id)::text as "uniqueListeners",
        AVG(ph.completion_rate)::text as "avgCompletionRate",
        COUNT(CASE WHEN ph.skipped = true THEN 1 END)::text as "skips"
      FROM tracks t
      INNER JOIN play_history ph ON ph.track_id = t.id
      WHERE t.artist_id = ${artistId}
    `);

    const row = result.rows[0];
    if (!row) {
      return {
        totalPlays: 0,
        uniqueListeners: 0,
        avgCompletionRate: 0,
        skipRate: 0,
      };
    }

    const totalPlays = parseInt(row.totalPlays, 10) || 0;
    const skips = parseInt(row.skips, 10) || 0;

    return {
      totalPlays,
      uniqueListeners: parseInt(row.uniqueListeners, 10) || 0,
      avgCompletionRate: row.avgCompletionRate ? parseFloat(row.avgCompletionRate) : 0,
      skipRate: totalPlays > 0 ? skips / totalPlays : 0,
    };
  }

  async getRelatedArtists(
    artistId: string,
    limit: number = 10,
  ): Promise<{ artistId: string; score: number; commonListeners: number }[]> {
    // Find artists that share listeners with the target artist
    // Score is based on how many users listen to both artists
    const result = await this.drizzle.db.execute<{
      artistId: string;
      commonListeners: string;
      score: string;
    }>(sql`
      WITH artist_listeners AS (
        -- Users who listen to the target artist
        SELECT DISTINCT ups.user_id
        FROM user_play_stats ups
        WHERE ups.item_id = ${artistId} AND ups.item_type = 'artist'
      ),
      other_artist_stats AS (
        -- For each user who listens to target artist, find other artists they listen to
        SELECT
          ups.item_id as artist_id,
          COUNT(DISTINCT ups.user_id) as common_listeners,
          SUM(ups.weighted_play_count) as total_weighted_plays
        FROM user_play_stats ups
        INNER JOIN artist_listeners al ON ups.user_id = al.user_id
        WHERE ups.item_type = 'artist'
          AND ups.item_id != ${artistId}
        GROUP BY ups.item_id
      )
      SELECT
        artist_id as "artistId",
        common_listeners::text as "commonListeners",
        -- Score: combination of common listeners and their engagement
        (common_listeners * LOG(total_weighted_plays + 1))::text as "score"
      FROM other_artist_stats
      WHERE common_listeners >= 1
      ORDER BY score DESC
      LIMIT ${limit}
    `);

    return result.rows.map((row) => ({
      artistId: row.artistId,
      commonListeners: parseInt(row.commonListeners, 10),
      score: parseFloat(row.score),
    }));
  }
}
