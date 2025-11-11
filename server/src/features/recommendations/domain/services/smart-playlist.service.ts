import { Injectable } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { SmartPlaylistConfig, TrackScore } from '../entities/track-score.entity';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

@Injectable()
export class SmartPlaylistService {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate smart playlist based on configuration
   * Can be filtered by artist, genre, or mood
   */
  async generateSmartPlaylist(userId: string, config: SmartPlaylistConfig): Promise<{ tracks: TrackScore[]; metadata: any }> {
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
    const tracks = await this.prisma.track.findMany({
      where: { id: { in: trackIds } },
      select: {
        id: true,
        artistId: true,
      },
    });

    const trackArtistMap = new Map(tracks.map((t) => [t.id, t.artistId || '']));

    // Calculate scores
    const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIds, trackArtistMap);

    // Filter by minimum score
    let filteredTracks = scoredTracks.filter((t) => t.totalScore >= minScore);

    // Sort according to config
    filteredTracks = this.sortTracks(filteredTracks, config.sortBy || 'score');

    // Limit tracks
    filteredTracks = filteredTracks.slice(0, maxTracks);

    // Calculate metadata
    const avgScore = filteredTracks.length > 0
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
    const tracks = await this.prisma.track.findMany({
      where: { artistId },
      select: { id: true },
    });

    return tracks.map((t) => t.id);
  }

  /**
   * Get all tracks in a genre
   */
  private async getTracksByGenre(genreId: string): Promise<string[]> {
    const trackGenres = await this.prisma.trackGenre.findMany({
      where: { genreId },
      select: { trackId: true },
    });

    return trackGenres.map((tg) => tg.trackId);
  }

  /**
   * Get all tracks user has listened to
   */
  private async getUserListenedTracks(userId: string): Promise<string[]> {
    const history = await this.prisma.playHistory.findMany({
      where: { userId },
      select: { trackId: true },
      distinct: ['trackId'],
    });

    return history.map((h) => h.trackId);
  }

  /**
   * Sort tracks according to sort type
   */
  private sortTracks(tracks: TrackScore[], sortBy: 'score' | 'popularity' | 'recent' | 'random'): TrackScore[] {
    switch (sortBy) {
      case 'score':
        return tracks.sort((a, b) => b.totalScore - a.totalScore);

      case 'popularity':
        // Sort by implicit behavior (playcount)
        return tracks.sort((a, b) => b.breakdown.implicitBehavior - a.breakdown.implicitBehavior);

      case 'recent':
        // Sort by recency
        return tracks.sort((a, b) => b.breakdown.recency - a.breakdown.recency);

      case 'random':
        // Fisher-Yates shuffle
        const shuffled = [...tracks];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;

      default:
        return tracks;
    }
  }
}
