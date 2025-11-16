import { Injectable, Inject } from '@nestjs/common';
import { AutoPlaylist, WaveMixConfig, PlaylistMetadata, TrackScore } from '../entities/track-score.entity';
import { ScoringService } from './scoring.service';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';
import { PrismaService } from '@infrastructure/persistence/prisma.service';

const DEFAULT_WAVE_MIX_CONFIG: WaveMixConfig = {
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

// Pastel colors for Wave Mix covers
const WAVE_MIX_COLORS = [
  '#FF6B9D', // Pink
  '#C44569', // Dark Pink
  '#4834DF', // Blue Purple
  '#6C5CE7', // Purple
  '#00D2D3', // Cyan
  '#1ABC9C', // Turquoise
  '#F39C12', // Orange
  '#E67E22', // Dark Orange
  '#E74C3C', // Red
  '#9B59B6', // Purple
  '#3498DB', // Blue
  '#2ECC71', // Green
];

@Injectable()
export class WaveMixService {
  constructor(
    private readonly scoringService: ScoringService,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate Wave Mix for a user
   * Algorithm:
   * 1. Get user's listening history
   * 2. Score all tracks the user has interacted with
   * 3. Select top tracks with min score threshold
   * 4. Add "fresh" tracks (20%) - tracks listened recently but not heavily
   * 5. Add exploration tracks (10%) - from genres/artists less explored
   * 6. Shuffle intelligently (avoid consecutive tracks from same artist/album)
   */
  async generateWaveMix(userId: string, config?: Partial<WaveMixConfig>): Promise<AutoPlaylist> {
    // Filter out undefined values from config to preserve defaults
    const cleanConfig = config
      ? Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined))
      : {};
    const finalConfig = { ...DEFAULT_WAVE_MIX_CONFIG, ...cleanConfig };

    // Step 1: Get user's top tracks based on play stats
    const topTracks = await this.playTrackingRepo.getUserTopTracks(userId, 200); // Get more than needed
    console.log(`[WaveMix] User ${userId} has ${topTracks.length} top tracks`);

    if (topTracks.length === 0) {
      // User has no listening history, return empty mix
      console.log(`[WaveMix] No listening history for user ${userId}, returning empty mix`);
      return this.createEmptyWaveMix(userId);
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
    console.log(`[WaveMix] Calculated scores for ${scoredTracks.length} tracks`);
    if (scoredTracks.length > 0) {
      console.log(`[WaveMix] Score range: ${scoredTracks[0]?.totalScore} to ${scoredTracks[scoredTracks.length - 1]?.totalScore}`);
    }

    // Step 3: Filter tracks above minimum score
    const qualifiedTracks = scoredTracks.filter((t) => t.totalScore >= finalConfig.minScore);
    console.log(`[WaveMix] ${qualifiedTracks.length} tracks qualified (score >= ${finalConfig.minScore})`);

    if (qualifiedTracks.length === 0) {
      console.log(`[WaveMix] No tracks qualified above min score ${finalConfig.minScore}, returning empty mix`);
      return this.createEmptyWaveMix(userId);
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

    // Create Wave Mix object
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Expires in 24 hours

    // Pick a random color for the cover
    const coverColor = this.getRandomColor(userId);

    return {
      id: `wave-mix-${userId}-${now.getTime()}`,
      type: 'wave-mix',
      userId,
      name: 'Wave Mix',
      description: 'Recomendaciones personalizadas basadas en tus gustos musicales y tu atmósfera favorita en echo',
      tracks: shuffledTracks,
      createdAt: now,
      expiresAt,
      metadata,
      coverColor,
    };
  }

  /**
   * Generate artist-based playlists for user's top artists
   */
  async generateArtistPlaylists(userId: string, limit: number = 5): Promise<AutoPlaylist[]> {
    // Get user's top artists based on play stats
    const topArtists = await this.playTrackingRepo.getUserTopArtists(userId, limit);

    if (topArtists.length === 0) {
      return [];
    }

    const playlists: AutoPlaylist[] = [];

    for (const artistStat of topArtists) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: artistStat.artistId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!artist) continue;

      // Get all tracks by this artist that the user has listened to
      const artistTracks = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
      const trackIds = artistTracks.map(t => t.itemId);

      const tracks = await this.prisma.track.findMany({
        where: {
          id: { in: trackIds },
          artistId: artist.id,
        },
        select: {
          id: true,
          artistId: true,
          albumId: true,
          title: true,
        },
      });

      if (tracks.length === 0) continue;

      const trackIdsList = tracks.map(t => t.id);
      const trackArtistMap = new Map(tracks.map((t) => [t.id, t.artistId || '']));

      // Score tracks
      const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIdsList, trackArtistMap);

      // Take top 30 tracks for this artist
      const topTracks = scoredTracks.slice(0, 30);

      if (topTracks.length === 0) continue;

      const metadata: PlaylistMetadata = {
        totalTracks: topTracks.length,
        avgScore: topTracks.reduce((sum, t) => sum + t.totalScore, 0) / topTracks.length,
        topGenres: [],
        topArtists: [artist.id],
        artistId: artist.id,
        artistName: artist.name,
        temporalDistribution: {
          lastWeek: 0,
          lastMonth: 0,
          lastYear: 0,
          older: 0,
        },
      };

      const now = new Date();

      playlists.push({
        id: `artist-mix-${artist.id}-${userId}-${now.getTime()}`,
        type: 'artist',
        userId,
        name: `Lo mejor de ${artist.name}`,
        description: `Las mejores canciones de ${artist.name} basadas en tu historial de escucha`,
        tracks: topTracks,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        metadata,
        coverImageUrl: `/api/images/artist/${artist.id}/profile`, // Will use artist profile image
      });
    }

    return playlists;
  }

  /**
   * Get all auto playlists for a user (Wave Mix + Artist playlists)
   */
  async getAllAutoPlaylists(userId: string): Promise<AutoPlaylist[]> {
    const [waveMix, artistPlaylists] = await Promise.all([
      this.generateWaveMix(userId),
      this.generateArtistPlaylists(userId, 5),
    ]);

    return [waveMix, ...artistPlaylists];
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
   * Calculate metadata for the playlist
   */
  private async calculateMetadata(userId: string, tracks: TrackScore[], trackDetails: any[]): Promise<PlaylistMetadata> {
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

  /**
   * Get a consistent random color based on user ID
   */
  private getRandomColor(userId: string): string {
    // Use user ID to seed the random selection for consistency
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return WAVE_MIX_COLORS[hash % WAVE_MIX_COLORS.length];
  }

  /**
   * Create empty wave mix when user has no data
   */
  private createEmptyWaveMix(userId: string): AutoPlaylist {
    const now = new Date();
    return {
      id: `wave-mix-${userId}-${now.getTime()}`,
      type: 'wave-mix',
      userId,
      name: 'Wave Mix',
      description: '¡Empieza a escuchar música para obtener recomendaciones personalizadas!',
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
      coverColor: this.getRandomColor(userId),
    };
  }
}
