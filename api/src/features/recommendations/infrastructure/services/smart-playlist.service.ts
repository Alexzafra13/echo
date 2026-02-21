import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { ScoringService } from '../../domain/services/scoring.service';
import { SmartPlaylistConfig, TrackScore } from '../../domain/entities/track-score.entity';
import { SmartPlaylistResult } from '../../domain/ports/playlist-generator.ports';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { tracks, trackGenres, playHistory } from '@infrastructure/database/schema';

@Injectable()
export class SmartPlaylistService {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly drizzle: DrizzleService
  ) {}

  /**
   * Generate smart playlist based on configuration
   * Can be filtered by artist, genre, or mood
   */
  async generateSmartPlaylist(
    userId: string,
    config: SmartPlaylistConfig
  ): Promise<SmartPlaylistResult> {
    const maxTracks = config.maxTracks || 50;
    const minScore = config.minScore || 20;

    // Build query based on config
    let trackIds: string[] = [];

    if (config.artistId) {
      // Get all tracks by this artist
      trackIds = await this.getTracksByArtist(config.artistId);
    } else if (config.genreId) {
      // Get all tracks in this genre
      trackIds = await this.getTracksByGenre(config.genreId);
    } else {
      // Get user's all listened tracks
      trackIds = await this.getUserListenedTracks(userId);
    }

    if (trackIds.length === 0) {
      return {
        tracks: [],
        metadata: {
          totalTracks: 0,
          avgScore: 0,
        },
      };
    }

    // Get track details with artist IDs
    const tracksResult = await this.drizzle.db
      .select({
        id: tracks.id,
        artistId: tracks.artistId,
      })
      .from(tracks)
      .where(inArray(tracks.id, trackIds));

    const trackArtistMap = new Map(tracksResult.map((t) => [t.id, t.artistId || '']));

    // Calculate scores
    const scoredTracks = await this.scoringService.calculateAndRankTracks(
      userId,
      trackIds,
      trackArtistMap
    );

    // Filter by minimum score
    let filteredTracks = scoredTracks.filter((t) => t.totalScore >= minScore);

    // Sort according to config
    filteredTracks = this.sortTracks(filteredTracks, config.sortBy || 'score');

    // Limit tracks
    filteredTracks = filteredTracks.slice(0, maxTracks);

    // Calculate metadata
    const avgScore =
      filteredTracks.length > 0
        ? filteredTracks.reduce((sum, t) => sum + t.totalScore, 0) / filteredTracks.length
        : 0;

    return {
      tracks: filteredTracks,
      metadata: {
        totalTracks: filteredTracks.length,
        avgScore: Math.round(avgScore * 10) / 10,
        config,
      },
    };
  }

  /**
   * Get all tracks by an artist
   */
  private async getTracksByArtist(artistId: string): Promise<string[]> {
    const tracksResult = await this.drizzle.db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.artistId, artistId));

    return tracksResult.map((t) => t.id);
  }

  /**
   * Get all tracks in a genre
   */
  private async getTracksByGenre(genreId: string): Promise<string[]> {
    const trackGenresResult = await this.drizzle.db
      .select({ trackId: trackGenres.trackId })
      .from(trackGenres)
      .where(eq(trackGenres.genreId, genreId));

    return trackGenresResult.map((tg) => tg.trackId);
  }

  /**
   * Get all tracks user has listened to
   */
  private async getUserListenedTracks(userId: string): Promise<string[]> {
    const historyResult = await this.drizzle.db
      .selectDistinct({ trackId: playHistory.trackId })
      .from(playHistory)
      .where(eq(playHistory.userId, userId));

    return historyResult.map((h) => h.trackId);
  }

  /**
   * Sort tracks according to sort type
   */
  private sortTracks(
    tracks: TrackScore[],
    sortBy: 'score' | 'popularity' | 'recent' | 'random'
  ): TrackScore[] {
    switch (sortBy) {
      case 'score':
        return tracks.sort((a, b) => b.totalScore - a.totalScore);

      case 'popularity':
        // Sort by implicit behavior (playcount)
        return tracks.sort((a, b) => b.breakdown.implicitBehavior - a.breakdown.implicitBehavior);

      case 'recent':
        // Sort by recency
        return tracks.sort((a, b) => b.breakdown.recency - a.breakdown.recency);

      case 'random': {
        // Fisher-Yates shuffle
        const shuffled = [...tracks];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }

      default:
        return tracks;
    }
  }
}
