import { Injectable, Inject, Optional } from '@nestjs/common';
import { TrackScore, PlaylistMetadata } from '../../entities/track-score.entity';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';
import {
  IDjAnalysisRepository,
  DJ_ANALYSIS_REPOSITORY,
} from '@features/dj/domain/ports/dj-analysis.repository.port';
import {
  DjCompatibilityService,
  TrackDjData,
} from '@features/dj/domain/services/dj-compatibility.service';

/**
 * Service for shuffling and calculating metadata for playlists
 * Uses DJ analysis data for harmonic ordering when available
 */
@Injectable()
export class PlaylistShuffleService {
  constructor(
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
    @Optional()
    @Inject(DJ_ANALYSIS_REPOSITORY)
    private readonly djAnalysisRepo?: IDjAnalysisRepository,
    @Optional()
    private readonly djCompatibility?: DjCompatibilityService,
  ) {}

  /**
   * Intelligent shuffle that uses DJ analysis for harmonic flow when available,
   * otherwise falls back to avoiding consecutive tracks from same artist/album
   */
  async intelligentShuffle(
    tracks: TrackScore[],
    trackDetails: Array<{ id: string; artistId: string | null; albumId: string | null }>
  ): Promise<TrackScore[]> {
    if (tracks.length <= 1) return tracks;

    // Try harmonic shuffle if DJ data is available
    if (this.djAnalysisRepo && this.djCompatibility) {
      const harmonicResult = await this.tryHarmonicShuffle(tracks);
      if (harmonicResult) return harmonicResult;
    }

    // Fallback: basic shuffle avoiding same artist/album
    return this.basicShuffle(tracks, trackDetails);
  }

  /**
   * Attempts harmonic shuffle using DJ analysis data
   * Returns null if not enough tracks have analysis
   */
  private async tryHarmonicShuffle(tracks: TrackScore[]): Promise<TrackScore[] | null> {
    const trackIds = tracks.map((t) => t.trackId);
    const analyses = await this.djAnalysisRepo!.findByTrackIds(trackIds);

    // Need at least 50% of tracks with analysis to use harmonic shuffle
    if (analyses.length < tracks.length * 0.5) return null;

    const analysisMap = new Map(analyses.map((a) => [a.trackId, a]));
    const tracksWithAnalysis = tracks.filter((t) => analysisMap.has(t.trackId));
    const tracksWithoutAnalysis = tracks.filter((t) => !analysisMap.has(t.trackId));

    // Build DJ data for compatibility scoring
    const djDataMap = new Map<string, TrackDjData>();
    for (const analysis of analyses) {
      djDataMap.set(analysis.trackId, {
        trackId: analysis.trackId,
        bpm: analysis.bpm,
        key: analysis.key,
        camelotKey: analysis.camelotKey,
        energy: analysis.energy,
      });
    }

    // Start with a random track
    const shuffled: TrackScore[] = [];
    const remaining = [...tracksWithAnalysis];
    const startIdx = Math.floor(Math.random() * remaining.length);
    shuffled.push(remaining.splice(startIdx, 1)[0]);

    // Build chain by selecting compatible tracks with weighted randomness
    while (remaining.length > 0) {
      const lastTrack = shuffled[shuffled.length - 1];
      const lastDjData = djDataMap.get(lastTrack.trackId);

      if (!lastDjData) {
        // No DJ data for last track, pick random
        const idx = Math.floor(Math.random() * remaining.length);
        shuffled.push(remaining.splice(idx, 1)[0]);
        continue;
      }

      // Score all remaining tracks by compatibility
      const scored = remaining.map((track) => {
        const djData = djDataMap.get(track.trackId);
        if (!djData) return { track, score: 50 };
        const compat = this.djCompatibility!.calculateCompatibility(lastDjData, djData);
        return { track, score: compat.overall };
      });

      // Weighted random selection: higher compatibility = higher chance
      const nextTrack = this.weightedRandomSelect(scored);
      shuffled.push(nextTrack);
      remaining.splice(remaining.indexOf(nextTrack), 1);
    }

    // Append tracks without analysis at random positions
    for (const track of tracksWithoutAnalysis) {
      const insertIdx = Math.floor(Math.random() * (shuffled.length + 1));
      shuffled.splice(insertIdx, 0, track);
    }

    return shuffled;
  }

  /**
   * Weighted random selection - tracks with higher scores have higher probability
   */
  private weightedRandomSelect(scored: Array<{ track: TrackScore; score: number }>): TrackScore {
    // Convert scores to weights (exponential to favor high scores)
    const weights = scored.map((s) => Math.pow(s.score / 100, 2));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let random = Math.random() * totalWeight;
    for (let i = 0; i < scored.length; i++) {
      random -= weights[i];
      if (random <= 0) return scored[i].track;
    }
    return scored[scored.length - 1].track;
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
