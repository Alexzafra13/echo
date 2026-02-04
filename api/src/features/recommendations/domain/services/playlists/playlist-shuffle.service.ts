import { Injectable, Inject } from '@nestjs/common';
import { TrackScore, PlaylistMetadata } from '../../entities/track-score.entity';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';

/**
 * Service for shuffling and calculating metadata for playlists
 */
@Injectable()
export class PlaylistShuffleService {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
  ) {}

  /**
   * Intelligent shuffle that avoids consecutive tracks from same artist/album
   */
  async intelligentShuffle(
    tracks: TrackScore[],
    trackDetails: Array<{ id: string; artistId: string | null; albumId: string | null }>
  ): Promise<TrackScore[]> {
    if (tracks.length <= 1) return tracks;

    return this.basicShuffle(tracks, trackDetails);
  }

  /**
   * Basic shuffle avoiding consecutive tracks from same artist/album
   */
  private basicShuffle(
    tracks: TrackScore[],
    trackDetails: Array<{ id: string; artistId: string | null; albumId: string | null }>
  ): TrackScore[] {
    const shuffled: TrackScore[] = [];
    const remaining = [...tracks];
    const trackMap = new Map(trackDetails.map((t) => [t.id, t]));

    // Start with random track
    const startIdx = Math.floor(Math.random() * remaining.length);
    shuffled.push(remaining.splice(startIdx, 1)[0]);

    while (remaining.length > 0) {
      let nextTrack: TrackScore | null = null;
      const lastTrack = shuffled[shuffled.length - 1];
      const lastTrackDetails = trackMap.get(lastTrack.trackId);

      // Try to find a track from different artist/album
      if (lastTrackDetails) {
        const candidates = remaining.filter((t) => {
          const details = trackMap.get(t.trackId);
          return (
            details &&
            details.artistId !== lastTrackDetails.artistId &&
            details.albumId !== lastTrackDetails.albumId
          );
        });
        if (candidates.length > 0) {
          nextTrack = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }

      // If no suitable track found, pick random
      if (!nextTrack) {
        nextTrack = remaining[Math.floor(Math.random() * remaining.length)];
      }

      shuffled.push(nextTrack);
      remaining.splice(remaining.indexOf(nextTrack), 1);
    }

    return shuffled;
  }

  /**
   * Calculate metadata for a playlist
   */
  async calculateMetadata(
    userId: string,
    tracks: TrackScore[],
    trackDetails: Array<{ id: string; artistId: string | null; albumId: string | null }>
  ): Promise<PlaylistMetadata> {
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
    const avgScore = tracks.length > 0
      ? tracks.reduce((sum, t) => sum + t.totalScore, 0) / tracks.length
      : 0;

    // Get top artists
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
      topGenres: [],
      topArtists,
      temporalDistribution: {
        lastWeek,
        lastMonth,
        lastYear,
        older,
      },
    };
  }
}
