import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { IPlayTrackingRepository } from '../../domain/ports';
import {
  PlayEvent,
  PlayStats,
  PlayContext,
  SourceType,
  UserPlaySummary,
  TrackPlaySummary,
  CONTEXT_WEIGHTS,
} from '../../domain/entities/play-event.entity';
import { PlayTrackingMapper } from '../mappers/play-tracking.mapper';

@Injectable()
export class PrismaPlayTrackingRepository implements IPlayTrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ===================================
  // WRITE OPERATIONS
  // ===================================

  async recordPlay(event: Omit<PlayEvent, 'id' | 'createdAt'>): Promise<PlayEvent> {
    const playHistory = await this.prisma.playHistory.create({
      data: {
        userId: event.userId,
        trackId: event.trackId,
        playedAt: event.playedAt,
        client: event.client,
        playContext: event.playContext,
        completionRate: event.completionRate,
        skipped: event.skipped,
        sourceId: event.sourceId,
        sourceType: event.sourceType,
      },
    });

    return PlayTrackingMapper.toPlayEventDomain(playHistory);
  }

  async recordSkip(
    userId: string,
    trackId: string,
    completionRate: number,
    playContext: PlayContext,
  ): Promise<PlayEvent> {
    const playHistory = await this.prisma.playHistory.create({
      data: {
        userId,
        trackId,
        playedAt: new Date(),
        playContext,
        completionRate,
        skipped: true,
      },
    });

    return PlayTrackingMapper.toPlayEventDomain(playHistory);
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
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { albumId: true, artistId: true },
    });

    if (!track) return;

    // Update album stats if exists
    if (track.albumId) {
      await this.updateItemStats(userId, track.albumId, 'album', weightedPlay, completionRate);
    }

    // Update artist stats if exists
    if (track.artistId) {
      await this.updateItemStats(userId, track.artistId, 'artist', weightedPlay, completionRate);
    }
  }

  private async updateItemStats(
    userId: string,
    itemId: string,
    itemType: string,
    weightedPlay: number,
    completionRate: number,
  ): Promise<void> {
    const existing = await this.prisma.userPlayStats.findUnique({
      where: {
        userId_itemId_itemType: {
          userId,
          itemId,
          itemType,
        },
      },
    });

    if (existing) {
      // Calculate new average completion rate
      const totalCompletions = existing.avgCompletionRate
        ? existing.avgCompletionRate * Number(existing.playCount)
        : 0;
      const newPlayCount = Number(existing.playCount) + 1;
      const newAvgCompletionRate = (totalCompletions + completionRate) / newPlayCount;

      const skipIncrement = completionRate < 0.5 ? 1 : 0;

      await this.prisma.userPlayStats.update({
        where: {
          userId_itemId_itemType: {
            userId,
            itemId,
            itemType,
          },
        },
        data: {
          playCount: { increment: 1 },
          weightedPlayCount: { increment: weightedPlay },
          lastPlayedAt: new Date(),
          avgCompletionRate: newAvgCompletionRate,
          skipCount: { increment: skipIncrement },
        },
      });
    } else {
      const skipCount = completionRate < 0.5 ? 1 : 0;

      await this.prisma.userPlayStats.create({
        data: {
          userId,
          itemId,
          itemType,
          playCount: 1,
          weightedPlayCount: weightedPlay,
          lastPlayedAt: new Date(),
          avgCompletionRate: completionRate,
          skipCount,
        },
      });
    }
  }

  // ===================================
  // READ OPERATIONS - HISTORY
  // ===================================

  async getUserPlayHistory(userId: string, limit: number = 50, offset: number = 0): Promise<PlayEvent[]> {
    const history = await this.prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return PlayTrackingMapper.toPlayEventDomainArray(history);
  }

  async getTrackPlayHistory(trackId: string, limit: number = 50): Promise<PlayEvent[]> {
    const history = await this.prisma.playHistory.findMany({
      where: { trackId },
      orderBy: { playedAt: 'desc' },
      take: limit,
    });

    return PlayTrackingMapper.toPlayEventDomainArray(history);
  }

  // ===================================
  // READ OPERATIONS - STATS
  // ===================================

  async getUserPlayStats(userId: string, itemType?: string): Promise<PlayStats[]> {
    const stats = await this.prisma.userPlayStats.findMany({
      where: {
        userId,
        ...(itemType && { itemType }),
      },
      orderBy: { weightedPlayCount: 'desc' },
    });

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
    const stats = await this.prisma.userPlayStats.findMany({
      where: {
        itemId: trackId,
        itemType: 'track',
      },
      orderBy: { playCount: 'desc' },
    });

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

    const [plays, stats] = await Promise.all([
      this.prisma.playHistory.findMany({
        where: {
          userId,
          playedAt: { gte: since },
        },
        orderBy: { playedAt: 'desc' },
        take: 50,
      }),
      this.prisma.playHistory.aggregate({
        where: {
          userId,
          playedAt: { gte: since },
        },
        _count: { id: true },
        _avg: { completionRate: true },
      }),
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
    for (const [context, count] of Object.entries(playsByContext)) {
      if (count > maxCount) {
        maxCount = count;
        topContext = context as PlayContext;
      }
    }

    return {
      totalPlays: stats._count.id,
      totalSkips: skipsCount,
      avgCompletionRate: stats._avg.completionRate || 0,
      topContext,
      playsByContext,
      recentPlays: PlayTrackingMapper.toPlayEventDomainArray(plays),
    };
  }

  async getTrackPlaySummary(trackId: string): Promise<TrackPlaySummary> {
    const [stats, uniqueUsers] = await Promise.all([
      this.prisma.playHistory.aggregate({
        where: { trackId },
        _count: { id: true },
        _avg: { completionRate: true },
      }),
      this.prisma.playHistory.findMany({
        where: { trackId },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const skips = await this.prisma.playHistory.count({
      where: { trackId, skipped: true },
    });

    const totalPlays = stats._count.id;
    const avgCompletionRate = stats._avg.completionRate || 0;
    const skipRate = totalPlays > 0 ? skips / totalPlays : 0;
    const uniqueListeners = uniqueUsers.length;

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
    const where: any = {
      userId,
      itemType: 'track',
    };

    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.lastPlayedAt = { gte: since };
    }

    const stats = await this.prisma.userPlayStats.findMany({
      where,
      orderBy: { weightedPlayCount: 'desc' },
      take: limit,
      select: {
        itemId: true,
        playCount: true,
        weightedPlayCount: true,
      },
    });

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
    const where: any = {
      userId,
      itemType: 'album',
    };

    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.lastPlayedAt = { gte: since };
    }

    const stats = await this.prisma.userPlayStats.findMany({
      where,
      orderBy: { weightedPlayCount: 'desc' },
      take: limit,
      select: {
        itemId: true,
        playCount: true,
      },
    });

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
    const where: any = {
      userId,
      itemType: 'artist',
    };

    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.lastPlayedAt = { gte: since };
    }

    const stats = await this.prisma.userPlayStats.findMany({
      where,
      orderBy: { weightedPlayCount: 'desc' },
      take: limit,
      select: {
        itemId: true,
        playCount: true,
      },
    });

    return stats.map((stat) => ({
      artistId: stat.itemId,
      playCount: Number(stat.playCount),
    }));
  }

  async getRecentlyPlayed(userId: string, limit: number = 20): Promise<string[]> {
    const history = await this.prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      take: limit,
      distinct: ['trackId'],
      select: { trackId: true },
    });

    return history.map((h) => h.trackId);
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

    // This is a simplified version - in production you'd join with tracks table
    // to get actual durations and calculate precise listening time
    const history = await this.prisma.playHistory.findMany({
      where: {
        userId,
        playedAt: { gte: since },
      },
      orderBy: { playedAt: 'asc' },
    });

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
}
