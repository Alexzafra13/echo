import { Injectable, Inject } from '@nestjs/common';
import { DailyMix, DailyMixConfig, DailyMixMetadata, TrackScore } from '../entities/track-score.entity';
import { ScoringService } from './scoring.service';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

const DEFAULT_DAILY_MIX_CONFIG: DailyMixConfig = {
  maxTracks: 50,
  minScore: 20,
  freshnessRatio: 0.2,
  genreDiversity: 0.3,
  temporalBalance: {
    lastWeek: 0.4,
    lastMonth: 0.3,
    lastYear: 0.2,
    older: 0.1,
  },
};

@Injectable()
export class DailyMixService {
  constructor(
    private readonly scoringService: ScoringService,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate Daily Mix for a user
   * Algorithm:
   * 1. Get user's listening history
   * 2. Score all tracks the user has interacted with
   * 3. Select top tracks with min score threshold
   * 4. Add "fresh" tracks (20%) - tracks listened recently but not heavily
   * 5. Add exploration tracks (10%) - from genres/artists less explored
   * 6. Shuffle intelligently (avoid consecutive tracks from same artist/album)
   */
  async generateDailyMix(userId: string, config?: Partial<DailyMixConfig>): Promise<DailyMix> {
    // Filter out undefined values from config to preserve defaults
    const cleanConfig = config
      ? Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined))
      : {};
    const finalConfig = { ...DEFAULT_DAILY_MIX_CONFIG, ...cleanConfig };

    // Step 1: Get user's top tracks based on play stats
    const topTracks = await this.playTrackingRepo.getUserTopTracks(userId, 200); // Get more than needed
    console.log(`[DailyMix] User ${userId} has ${topTracks.length} top tracks`);

    if (topTracks.length === 0) {
      // User has no listening history, return empty mix
      console.log(`[DailyMix] No listening history for user ${userId}, returning empty mix`);
      return this.createEmptyDailyMix(userId);
    }

    // Get track details with artist IDs
    const trackIds = topTracks.map((t) => t.trackId);
    const tracks = await this.prisma.track.findMany({
      where: { id: { in: trackIds } },
      select: {
        id: true,
        artistId: true,
        albumId: true,
        title: true,
      },
    });

    const trackArtistMap = new Map(tracks.map((t) => [t.id, t.artistId || '']));

    // Step 2: Calculate scores for all tracks
    const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIds, trackArtistMap);
    console.log(`[DailyMix] Calculated scores for ${scoredTracks.length} tracks`);
    if (scoredTracks.length > 0) {
      console.log(`[DailyMix] Score range: ${scoredTracks[0]?.totalScore} to ${scoredTracks[scoredTracks.length - 1]?.totalScore}`);
      console.log(`[DailyMix] Sample scores:`, scoredTracks.slice(0, 5).map(t => ({ score: t.totalScore, breakdown: t.breakdown })));
    }

    // Step 3: Filter tracks above minimum score
    const qualifiedTracks = scoredTracks.filter((t) => t.totalScore >= finalConfig.minScore);
    console.log(`[DailyMix] ${qualifiedTracks.length} tracks qualified (score >= ${finalConfig.minScore})`);

    if (qualifiedTracks.length === 0) {
      console.log(`[DailyMix] No tracks qualified above min score ${finalConfig.minScore}, returning empty mix`);
      return this.createEmptyDailyMix(userId);
    }

    // Step 4: Select core tracks (70%)
    const coreCount = Math.floor(finalConfig.maxTracks * 0.7);
    const coreTracksSelection = qualifiedTracks.slice(0, coreCount);

    // Step 5: Add fresh tracks (20%) - high recency but medium overall score
    const freshCount = Math.floor(finalConfig.maxTracks * finalConfig.freshnessRatio);
    const freshTracks = qualifiedTracks
      .filter((t) => t.breakdown.recency > 70 && !coreTracksSelection.includes(t))
      .slice(0, freshCount);

    // Step 6: Add exploration tracks (10%) - diversity-focused
    const explorationCount = finalConfig.maxTracks - coreCount - freshTracks.length;
    const explorationTracks = qualifiedTracks
      .filter((t) => t.breakdown.diversity > 70 && !coreTracksSelection.includes(t) && !freshTracks.includes(t))
      .slice(0, explorationCount);

    // Combine all tracks
    let finalTracks = [...coreTracksSelection, ...freshTracks, ...explorationTracks];

    // Ensure we don't exceed maxTracks
    finalTracks = finalTracks.slice(0, finalConfig.maxTracks);

    // Step 7: Intelligent shuffle (avoid consecutive same artist/album)
    const shuffledTracks = this.intelligentShuffle(finalTracks, tracks);

    // Calculate metadata
    const metadata = await this.calculateMetadata(userId, shuffledTracks, tracks);

    // Create Daily Mix object
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Expires in 24 hours

    return {
      id: `daily-mix-${userId}-${now.getTime()}`,
      userId,
      name: `Daily Mix - ${now.toLocaleDateString()}`,
      description: this.generateDescription(metadata),
      tracks: shuffledTracks,
      createdAt: now,
      expiresAt,
      metadata,
    };
  }

  /**
   * Intelligent shuffle to avoid consecutive tracks from same artist/album
   */
  private intelligentShuffle(tracks: TrackScore[], trackDetails: any[]): TrackScore[] {
    const shuffled: TrackScore[] = [];
    const remaining = [...tracks];
    const trackMap = new Map(trackDetails.map((t) => [t.id, t]));

    while (remaining.length > 0) {
      let nextTrack: TrackScore | null = null;
      const lastTrack = shuffled.length > 0 ? shuffled[shuffled.length - 1] : null;
      const lastTrackDetails = lastTrack ? trackMap.get(lastTrack.trackId) : null;

      // Try to find a track from different artist/album
      if (lastTrackDetails) {
        nextTrack =
          remaining.find((t) => {
            const details = trackMap.get(t.trackId);
            return (
              details &&
              details.artistId !== lastTrackDetails.artistId &&
              details.albumId !== lastTrackDetails.albumId
            );
          }) || null;
      }

      // If no suitable track found, just take the first one
      if (!nextTrack) {
        nextTrack = remaining[0];
      }

      shuffled.push(nextTrack);
      remaining.splice(remaining.indexOf(nextTrack), 1);
    }

    return shuffled;
  }

  /**
   * Calculate metadata for the Daily Mix
   */
  private async calculateMetadata(userId: string, tracks: TrackScore[], trackDetails: any[]): Promise<DailyMixMetadata> {
    const trackMap = new Map(trackDetails.map((t) => [t.id, t]));

    // Get play history to determine temporal distribution
    const playHistory = await this.playTrackingRepo.getUserPlayHistory(userId, 1000);
    const trackIds = tracks.map((t) => t.trackId);
    const relevantHistory = playHistory.filter((h) => trackIds.includes(h.trackId));

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const lastWeek = relevantHistory.filter((h) => h.playedAt >= oneWeekAgo).length;
    const lastMonth = relevantHistory.filter((h) => h.playedAt >= oneMonthAgo && h.playedAt < oneWeekAgo).length;
    const lastYear = relevantHistory.filter((h) => h.playedAt >= oneYearAgo && h.playedAt < oneMonthAgo).length;
    const older = relevantHistory.filter((h) => h.playedAt < oneYearAgo).length;

    // Calculate average score
    const avgScore = tracks.reduce((sum, t) => sum + t.totalScore, 0) / tracks.length;

    // Get top artists (would need to fetch from DB in real implementation)
    const artistIds = tracks
      .map((t) => trackMap.get(t.trackId)?.artistId)
      .filter((id) => id) as string[];
    const artistCounts = artistIds.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    return {
      totalTracks: tracks.length,
      avgScore: Math.round(avgScore * 10) / 10,
      topGenres: [], // Would need genre data
      topArtists,
      temporalDistribution: {
        lastWeek,
        lastMonth,
        lastYear,
        older,
      },
    };
  }

  /**
   * Generate description based on metadata
   */
  private generateDescription(metadata: DailyMixMetadata): string {
    return `A personalized mix of ${metadata.totalTracks} tracks based on your listening habits. Average score: ${metadata.avgScore}/100`;
  }

  /**
   * Create empty daily mix when user has no data
   */
  private createEmptyDailyMix(userId: string): DailyMix {
    const now = new Date();
    return {
      id: `daily-mix-${userId}-${now.getTime()}`,
      userId,
      name: 'Daily Mix',
      description: 'Start listening to music to get personalized recommendations!',
      tracks: [],
      createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      metadata: {
        totalTracks: 0,
        avgScore: 0,
        topGenres: [],
        topArtists: [],
        temporalDistribution: {
          lastWeek: 0,
          lastMonth: 0,
          lastYear: 0,
          older: 0,
        },
      },
    };
  }
}
