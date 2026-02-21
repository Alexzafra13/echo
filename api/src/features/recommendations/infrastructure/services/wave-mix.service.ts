import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AutoPlaylist, WaveMixConfig, TrackScore } from '../../domain/entities/track-score.entity';
import { ScoringService } from '../../domain/services/scoring.service';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { inArray } from 'drizzle-orm';
import { tracks } from '@infrastructure/database/schema';
import { PlaylistShuffleService } from '../../domain/services/playlists';
import { PlaylistCoverService } from './playlists/playlist-cover.service';
import { ArtistPlaylistService } from './playlists/artist-playlist.service';
import { GenrePlaylistService } from './playlists/genre-playlist.service';

// Wave Mix Configuration
const DEFAULT_WAVE_MIX_CONFIG: WaveMixConfig = {
  maxTracks: 50,
  minScore: 10,
  freshnessRatio: 0.3,
  genreDiversity: 0.2,
  temporalBalance: {
    lastWeek: 0.4,
    lastMonth: 0.3,
    lastYear: 0.2,
    older: 0.1,
  },
};

/**
 * WaveMixService - Orchestrates personalized playlist generation
 *
 * Delegates to specialized services:
 * - ArtistPlaylistService: Artist-based playlists
 * - GenrePlaylistService: Genre-based playlists
 * - PlaylistShuffleService: Intelligent shuffling and metadata
 * - PlaylistCoverService: Cover colors and images
 */
@Injectable()
export class WaveMixService {
  private readonly CACHE_KEY_PREFIX = 'auto-playlists';
  private readonly CACHE_TTL_SECONDS = 4 * 60 * 60; // 4 hours (refreshes with new listening data)

  constructor(
    @InjectPinoLogger(WaveMixService.name)
    private readonly logger: PinoLogger,
    private readonly scoringService: ScoringService,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly shuffleService: PlaylistShuffleService,
    private readonly coverService: PlaylistCoverService,
    private readonly artistPlaylistService: ArtistPlaylistService,
    private readonly genrePlaylistService: GenrePlaylistService
  ) {}

  /**
   * Generate Wave Mix for a user
   */
  async generateWaveMix(userId: string, config?: Partial<WaveMixConfig>): Promise<AutoPlaylist> {
    const cleanConfig = config
      ? Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined))
      : {};
    const finalConfig = { ...DEFAULT_WAVE_MIX_CONFIG, ...cleanConfig };

    // Get user's top tracks
    const topTracks = await this.playTrackingRepo.getUserTopTracks(userId, 200);
    this.logger.info({ userId, topTracksCount: topTracks.length }, 'User top tracks retrieved');

    if (topTracks.length === 0) {
      this.logger.info({ userId }, 'No listening history, returning empty mix');
      return this.createEmptyWaveMix(userId);
    }

    // Get track details
    const trackIds = topTracks.map((t) => t.trackId);
    const tracksResult = await this.drizzle.db
      .select({
        id: tracks.id,
        artistId: tracks.artistId,
        albumId: tracks.albumId,
        title: tracks.title,
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
    this.logger.info(
      { userId, scoredTracksCount: scoredTracks.length },
      'Calculated scores for tracks'
    );

    // Select best tracks
    const qualifiedTracks = this.selectQualifiedTracks(scoredTracks, finalConfig);

    if (qualifiedTracks.length === 0) {
      this.logger.info({ userId }, 'No tracks available, returning empty mix');
      return this.createEmptyWaveMix(userId);
    }

    const finalTracks = qualifiedTracks.slice(0, finalConfig.maxTracks);
    this.logger.info(
      { userId, selectedTracks: finalTracks.length },
      'Selected tracks for Wave Mix'
    );

    // Intelligent shuffle (uses DJ analysis for harmonic flow when available)
    const shuffledTracks = await this.shuffleService.intelligentShuffle(finalTracks, tracksResult);

    // Calculate metadata
    const metadata = await this.shuffleService.calculateMetadata(
      userId,
      shuffledTracks,
      tracksResult
    );

    // Create Wave Mix
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const coverColor = this.coverService.getRandomColor(userId);

    return {
      id: `wave-mix-${userId}-${now.getTime()}`,
      type: 'wave-mix',
      userId,
      name: 'Wave Mix',
      description:
        'Recomendaciones personalizadas basadas en tus gustos musicales y tu atmósfera favorita en echo',
      tracks: shuffledTracks,
      createdAt: now,
      expiresAt,
      metadata,
      coverColor,
    };
  }

  /**
   * Select qualified tracks with fallback thresholds
   */
  private selectQualifiedTracks(scoredTracks: TrackScore[], config: WaveMixConfig): TrackScore[] {
    let qualifiedTracks = scoredTracks.filter((t) => t.totalScore >= config.minScore);

    this.logger.info(
      {
        qualifiedCount: qualifiedTracks.length,
        minScore: config.minScore,
        targetTracks: config.maxTracks,
      },
      'Tracks qualified above minimum score'
    );

    // Fallback with lower threshold
    if (qualifiedTracks.length < config.maxTracks && scoredTracks.length > 0) {
      if (qualifiedTracks.length < config.maxTracks) {
        const fallbackMinScore = config.minScore * 0.5;
        qualifiedTracks = scoredTracks.filter((t) => t.totalScore >= fallbackMinScore);
        this.logger.info(
          { fallbackMinScore, qualifiedCount: qualifiedTracks.length },
          'Applied fallback threshold'
        );
      }

      // Final fallback: take all available
      if (qualifiedTracks.length < config.maxTracks) {
        qualifiedTracks = scoredTracks;
        this.logger.info({ tracksUsed: qualifiedTracks.length }, 'Using all available tracks');
      }
    }

    return qualifiedTracks;
  }

  /**
   * Generate artist-based playlists (delegates to ArtistPlaylistService)
   */
  async generateArtistPlaylists(userId: string, limit: number = 5): Promise<AutoPlaylist[]> {
    return this.artistPlaylistService.generatePlaylists(userId, limit);
  }

  /**
   * Generate genre-based playlists (delegates to GenrePlaylistService)
   */
  async generateGenrePlaylists(userId: string, limit: number = 5): Promise<AutoPlaylist[]> {
    return this.genrePlaylistService.generatePlaylists(userId, limit);
  }

  /**
   * Get all auto playlists with caching
   */
  async getAllAutoPlaylists(
    userId: string,
    forceRefresh: boolean = false
  ): Promise<AutoPlaylist[]> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:${userId}`;

    if (!forceRefresh) {
      const cached = await this.redis.get<AutoPlaylist[]>(cacheKey);
      if (cached) {
        this.logger.info({ userId }, 'Serving cached playlists from Redis');
        return cached;
      }
    }

    this.logger.info({ userId }, 'Generating fresh playlists');
    const [waveMix, artistPlaylists, genrePlaylists] = await Promise.all([
      this.generateWaveMix(userId),
      this.artistPlaylistService.generatePlaylists(userId, 12),
      this.genrePlaylistService.generatePlaylists(userId, 12),
    ]);

    const playlists = [waveMix, ...artistPlaylists, ...genrePlaylists];

    const hasContent =
      waveMix.tracks.length > 0 || artistPlaylists.length > 0 || genrePlaylists.length > 0;
    if (hasContent) {
      await this.redis.set(cacheKey, playlists, this.CACHE_TTL_SECONDS);
      this.logger.info(
        {
          userId,
          ttlSeconds: this.CACHE_TTL_SECONDS,
          waveMixTracks: waveMix.tracks.length,
          artistPlaylists: artistPlaylists.length,
          genrePlaylists: genrePlaylists.length,
        },
        'Cached playlists in Redis'
      );
    } else {
      this.logger.info({ userId }, 'Skipping cache - playlists are empty');
    }

    return playlists;
  }

  /**
   * Force refresh auto playlists
   */
  async refreshAutoPlaylists(userId: string): Promise<AutoPlaylist[]> {
    return this.getAllAutoPlaylists(userId, true);
  }

  /**
   * Invalidate cached playlists for a user
   * Call this when user interactions change (new plays, favorites, etc.)
   */
  async invalidateCache(userId: string): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:${userId}`;
    await this.redis.del(cacheKey);
    this.logger.debug({ userId }, 'Invalidated playlist cache');
  }

  /**
   * Get paginated artist playlists (delegates to ArtistPlaylistService)
   */
  async getArtistPlaylistsPaginated(
    userId: string,
    skip: number = 0,
    take: number = 10
  ): Promise<{ playlists: AutoPlaylist[]; total: number; hasMore: boolean }> {
    return this.artistPlaylistService.getPaginated(userId, skip, take);
  }

  /**
   * Get paginated genre playlists (delegates to GenrePlaylistService)
   */
  async getGenrePlaylistsPaginated(
    userId: string,
    skip: number = 0,
    take: number = 10
  ): Promise<{ playlists: AutoPlaylist[]; total: number; hasMore: boolean }> {
    return this.genrePlaylistService.getPaginated(userId, skip, take);
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
      coverColor: this.coverService.getRandomColor(userId),
    };
  }
}
