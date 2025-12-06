import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AutoPlaylist, WaveMixConfig, PlaylistMetadata, TrackScore } from '../entities/track-score.entity';
import { ScoringService } from './scoring.service';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { eq, inArray, and, count, desc } from 'drizzle-orm';
import { tracks, artists, genres, trackGenres } from '@infrastructure/database/schema';

// Wave Mix Configuration
// Optimized for faster first mix generation and better user experience
const DEFAULT_WAVE_MIX_CONFIG: WaveMixConfig = {
  maxTracks: 50,
  minScore: 10,         // Bajado de 20 a 10 para generar mix más rápido (especialmente para usuarios nuevos)
  freshnessRatio: 0.3,  // Subido de 0.2 a 0.3 para más variedad
  genreDiversity: 0.2,  // Bajado de 0.3 a 0.2 para ser menos estricto
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
  // Redis cache keys
  private readonly CACHE_KEY_PREFIX = 'auto-playlists';
  private readonly CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

  constructor(
    @InjectPinoLogger(WaveMixService.name)
    private readonly logger: PinoLogger,
    private readonly scoringService: ScoringService,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Generate Wave Mix for a user
   * Algorithm:
   * 1. Get user's listening history (top 200 tracks)
   * 2. Score all tracks using scoring algorithm (implicit behavior 50%, explicit 30%, recency 18%, diversity 2%)
   * 3. Select up to 50 best tracks above minimum score threshold
   * 4. Fallback: Lower threshold if needed to reach 50 tracks
   * 5. Shuffle intelligently (avoid consecutive same artist/album)
   */
  async generateWaveMix(userId: string, config?: Partial<WaveMixConfig>): Promise<AutoPlaylist> {
    // Filter out undefined values from config to preserve defaults
    const cleanConfig = config
      ? Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined))
      : {};
    const finalConfig = { ...DEFAULT_WAVE_MIX_CONFIG, ...cleanConfig };

    // Step 1: Get user's top tracks based on play stats
    const topTracks = await this.playTrackingRepo.getUserTopTracks(userId, 200); // Get more than needed
    this.logger.info({ userId, topTracksCount: topTracks.length }, 'User top tracks retrieved');

    if (topTracks.length === 0) {
      // User has no listening history, return empty mix
      this.logger.info({ userId }, 'No listening history, returning empty mix');
      return this.createEmptyWaveMix(userId);
    }

    // Get track details with artist IDs
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

    // Step 2: Calculate scores for all tracks
    const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIds, trackArtistMap);
    this.logger.info({ userId, scoredTracksCount: scoredTracks.length }, 'Calculated scores for tracks');
    if (scoredTracks.length > 0) {
      this.logger.debug({
        userId,
        maxScore: scoredTracks[0]?.totalScore,
        minScore: scoredTracks[scoredTracks.length - 1]?.totalScore,
      }, 'Score range calculated');
    }

    // Step 3: Select best tracks for the mix
    // Strategy: Always try to get maxTracks (50) by taking the best scored tracks
    let qualifiedTracks = scoredTracks.filter((t) => t.totalScore >= finalConfig.minScore);
    this.logger.info({
      userId,
      qualifiedCount: qualifiedTracks.length,
      minScore: finalConfig.minScore,
      targetTracks: finalConfig.maxTracks,
    }, 'Tracks qualified above minimum score');

    // Fallback: If we don't have enough tracks, progressively lower the threshold
    if (qualifiedTracks.length < finalConfig.maxTracks && scoredTracks.length > 0) {
      // Try with 50% lower threshold
      if (qualifiedTracks.length < finalConfig.maxTracks) {
        const fallbackMinScore = finalConfig.minScore * 0.5;
        qualifiedTracks = scoredTracks.filter((t) => t.totalScore >= fallbackMinScore);
        this.logger.info({
          userId,
          fallbackMinScore,
          qualifiedCount: qualifiedTracks.length,
        }, 'Applied fallback with lower threshold');
      }

      // Final fallback: Just take the best available tracks regardless of score
      if (qualifiedTracks.length < finalConfig.maxTracks) {
        qualifiedTracks = scoredTracks;
        this.logger.info({
          userId,
          tracksUsed: qualifiedTracks.length,
        }, 'Using all available tracks regardless of score');
      }
    }

    // If no tracks at all (user has no play history), return empty mix
    if (qualifiedTracks.length === 0) {
      this.logger.info({ userId }, 'No tracks available, returning empty mix');
      return this.createEmptyWaveMix(userId);
    }

    // Step 4: Take up to maxTracks (50) best tracks
    const finalTracks = qualifiedTracks.slice(0, finalConfig.maxTracks);
    this.logger.info({
      userId,
      selectedTracks: finalTracks.length,
      maxTracks: finalConfig.maxTracks,
    }, 'Selected tracks for Wave Mix');

    // Step 5: Intelligent shuffle (avoid consecutive same artist/album)
    const shuffledTracks = this.intelligentShuffle(finalTracks, tracksResult);

    // Calculate metadata
    const metadata = await this.calculateMetadata(userId, shuffledTracks, tracksResult);

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
   * Generates 5 playlists by default for the general view
   * Optimized to avoid N+1 queries by batch loading
   */
  async generateArtistPlaylists(userId: string, limit: number = 5): Promise<AutoPlaylist[]> {
    // Get user's top artists based on play stats
    const topArtists = await this.playTrackingRepo.getUserTopArtists(userId, limit);

    if (topArtists.length === 0) {
      return [];
    }

    // OPTIMIZATION: Batch load all artists at once (1 query instead of N)
    const artistIds = topArtists.map(a => a.artistId);
    const artistsResult = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
        mbzArtistId: artists.mbzArtistId,
      })
      .from(artists)
      .where(inArray(artists.id, artistIds));
    const artistMap = new Map(artistsResult.map(a => [a.id, a]));

    // OPTIMIZATION: Fetch all user play stats once (1 query instead of N)
    const allPlayStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackIds = allPlayStats.map(t => t.itemId);

    // OPTIMIZATION: Batch load all tracks for these artists (1 query instead of N)
    const allTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        artistId: tracks.artistId,
        albumId: tracks.albumId,
        title: tracks.title,
      })
      .from(tracks)
      .where(and(
        inArray(tracks.id, trackIds),
        inArray(tracks.artistId, artistIds)
      ));

    // Group tracks by artist
    const tracksByArtist = new Map<string, typeof allTracks>();
    for (const track of allTracks) {
      if (!track.artistId) continue;
      if (!tracksByArtist.has(track.artistId)) {
        tracksByArtist.set(track.artistId, []);
      }
      tracksByArtist.get(track.artistId)!.push(track);
    }

    const playlists: AutoPlaylist[] = [];
    const now = new Date();

    // Process each artist playlist
    for (const artistStat of topArtists) {
      const artist = artistMap.get(artistStat.artistId);
      if (!artist) continue;

      const tracks = tracksByArtist.get(artist.id);
      if (!tracks || tracks.length === 0) continue;

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

      // Try to get artist image from FanArt API and save to storage
      const coverImageUrl = await this.getArtistCoverImage(artist);

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
        coverImageUrl,
      });
    }

    return playlists;
  }

  /**
   * Generate genre-based playlists for user's top genres
   * Generates playlists based on listening history per genre
   * Optimized to avoid N+1 queries by batch loading
   */
  async generateGenrePlaylists(userId: string, limit: number = 5): Promise<AutoPlaylist[]> {
    // Get user's top genres based on tracks they've listened to
    const topGenres = await this.getTopUserGenres(userId, limit);

    this.logger.info({ userId, topGenresCount: topGenres.length, topGenres }, 'Top genres for user');

    if (topGenres.length === 0) {
      this.logger.warn({ userId }, 'No genres found for user - tracks may not have genre tags');
      return [];
    }

    const playlists: AutoPlaylist[] = [];
    const now = new Date();

    // Get user's listening history
    const allPlayStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackIds = allPlayStats.map(t => t.itemId);

    if (trackIds.length === 0) {
      return [];
    }

    // Batch load all tracks with genres
    const tracksWithGenresResult = await this.drizzle.db
      .select({
        trackId: tracks.id,
        trackArtistId: tracks.artistId,
        trackAlbumId: tracks.albumId,
        trackTitle: tracks.title,
        genreId: genres.id,
        genreName: genres.name,
      })
      .from(tracks)
      .leftJoin(trackGenres, eq(tracks.id, trackGenres.trackId))
      .leftJoin(genres, eq(trackGenres.genreId, genres.id))
      .where(inArray(tracks.id, trackIds));

    // Group results by track to reconstruct nested structure
    const tracksMap = new Map();
    for (const row of tracksWithGenresResult) {
      if (!tracksMap.has(row.trackId)) {
        tracksMap.set(row.trackId, {
          id: row.trackId,
          artistId: row.trackArtistId,
          albumId: row.trackAlbumId,
          title: row.trackTitle,
          genres: [],
        });
      }
      if (row.genreId) {
        tracksMap.get(row.trackId).genres.push({
          genre: {
            id: row.genreId,
            name: row.genreName,
          },
        });
      }
    }
    const allTracks = Array.from(tracksMap.values());

    // Group tracks by genre
    const tracksByGenre = new Map<string, typeof allTracks>();
    for (const track of allTracks) {
      for (const tg of track.genres) {
        const genreId = tg.genre.id;
        if (!tracksByGenre.has(genreId)) {
          tracksByGenre.set(genreId, []);
        }
        tracksByGenre.get(genreId)!.push(track);
      }
    }

    // Process each genre playlist
    for (const genreData of topGenres) {
      const tracks = tracksByGenre.get(genreData.genreId);
      if (!tracks || tracks.length === 0) continue;

      const trackIdsList = tracks.map(t => t.id);
      const trackArtistMap = new Map(tracks.map((t) => [t.id, t.artistId || '']));

      // Score tracks
      const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIdsList, trackArtistMap);

      // Take top 30 tracks for this genre
      const topTracks = scoredTracks.slice(0, 30);

      if (topTracks.length === 0) continue;

      const metadata: PlaylistMetadata = {
        totalTracks: topTracks.length,
        avgScore: topTracks.reduce((sum, t) => sum + t.totalScore, 0) / topTracks.length,
        topGenres: [genreData.genreName],
        topArtists: [],
        temporalDistribution: {
          lastWeek: 0,
          lastMonth: 0,
          lastYear: 0,
          older: 0,
        },
      };

      // Use a genre-themed color or generate one based on genre name
      const coverColor = this.getGenreColor(genreData.genreName);

      playlists.push({
        id: `genre-mix-${genreData.genreId}-${userId}-${now.getTime()}`,
        type: 'genre',
        userId,
        name: `${genreData.genreName} Mix`,
        description: `Tus mejores canciones de ${genreData.genreName}`,
        tracks: topTracks,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        metadata,
        coverColor,
      });
    }

    return playlists;
  }

  /**
   * Get user's top genres based on their listening history
   * Returns genres sorted by play count
   */
  private async getTopUserGenres(userId: string, limit: number): Promise<Array<{ genreId: string; genreName: string; playCount: number }>> {
    // Get user's play history
    const playStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackIds = playStats.map(p => p.itemId);

    this.logger.debug({ userId, tracksPlayed: trackIds.length }, 'User play history');

    if (trackIds.length === 0) {
      return [];
    }

    // Get genres for these tracks with play counts
    const genreStats = await this.drizzle.db
      .select({
        genreId: trackGenres.genreId,
        count: count(trackGenres.trackId),
      })
      .from(trackGenres)
      .where(inArray(trackGenres.trackId, trackIds))
      .groupBy(trackGenres.genreId)
      .orderBy(desc(count(trackGenres.trackId)))
      .limit(limit);

    this.logger.debug({ userId, genreStatsCount: genreStats.length }, 'Genre stats from DB');

    if (genreStats.length === 0) {
      this.logger.warn({ userId, trackCount: trackIds.length }, 'No genres found for user tracks - they may need genre tags');
      return [];
    }

    // Batch load genre names
    const genreIds = genreStats.map(g => g.genreId);
    const genresResult = await this.drizzle.db
      .select({
        id: genres.id,
        name: genres.name,
      })
      .from(genres)
      .where(inArray(genres.id, genreIds));
    const genreMap = new Map(genresResult.map(g => [g.id, g.name]));

    return genreStats.map(stat => ({
      genreId: stat.genreId,
      genreName: genreMap.get(stat.genreId) || 'Unknown',
      playCount: Number(stat.count),
    }));
  }

  /**
   * Get a color for a genre (based on genre name for consistency)
   */
  private getGenreColor(genreName: string): string {
    const genreColors: Record<string, string> = {
      // Rock family
      'Rock': '#34495E', // Slate gray (overlay image has red text)
      'Alternative': '#C0392B',
      'Indie': '#E67E22',
      'Metal': '#34495E',
      'Punk': '#8E44AD',
      // Pop family
      'Pop': '#FF6B9D',
      'Synthpop': '#9B59B6',
      'Dance': '#E91E63',
      'Electronic': '#3498DB',
      // Hip-hop family
      'Hip hop': '#95A5A6',
      'Rap': '#7F8C8D',
      'R&b': '#BDC3C7',
      // Jazz/Soul
      'Jazz': '#D35400',
      'Soul': '#CA6F1E',
      'Funk': '#F39C12',
      'Blues': '#2980B9',
      // Latin
      'Reggaeton': '#1ABC9C',
      'Latin': '#16A085',
      'Salsa': '#E74C3C',
      // Other
      'Classical': '#8E44AD',
      'Folk': '#27AE60',
      'Country': '#D68910',
      'Reggae': '#229954',
    };

    // Try exact match first
    if (genreColors[genreName]) {
      return genreColors[genreName];
    }

    // Try partial match
    for (const [key, color] of Object.entries(genreColors)) {
      if (genreName.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }

    // Fallback: generate color from genre name hash
    const hash = genreName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return WAVE_MIX_COLORS[hash % WAVE_MIX_COLORS.length];
  }

  /**
   * Get all auto playlists for a user (Wave Mix + Artist playlists + Genre playlists)
   * Uses Redis cache with 24-hour TTL - regenerates once per day or on force refresh
   */
  async getAllAutoPlaylists(userId: string, forceRefresh: boolean = false): Promise<AutoPlaylist[]> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:${userId}`;

    // Check Redis cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.info({ userId }, 'Serving cached playlists from Redis');
        return cached;
      }
    }

    // Generate fresh playlists
    // Generate 12 playlists each to support 2 rows on large screens
    this.logger.info({ userId }, 'Generating fresh playlists');
    const [waveMix, artistPlaylists, genrePlaylists] = await Promise.all([
      this.generateWaveMix(userId),
      this.generateArtistPlaylists(userId, 12),
      this.generateGenrePlaylists(userId, 12),
    ]);

    const playlists = [waveMix, ...artistPlaylists, ...genrePlaylists];

    // Don't cache empty playlists - user is still building listening history
    // This ensures new users see fresh playlists as they listen to more music
    const hasContent = waveMix.tracks.length > 0 || artistPlaylists.length > 0 || genrePlaylists.length > 0;
    if (hasContent) {
      // Cache in Redis for 24 hours
      await this.redis.set(cacheKey, playlists, this.CACHE_TTL_SECONDS);
      this.logger.info({
        userId,
        ttlSeconds: this.CACHE_TTL_SECONDS,
        waveMixTracks: waveMix.tracks.length,
        artistPlaylists: artistPlaylists.length,
        genrePlaylists: genrePlaylists.length,
      }, 'Cached playlists in Redis');
    } else {
      this.logger.info({ userId }, 'Skipping cache - playlists are empty (user building listening history)');
    }

    return playlists;
  }

  /**
   * Force refresh auto playlists for a user (ignores cache)
   */
  async refreshAutoPlaylists(userId: string): Promise<AutoPlaylist[]> {
    return this.getAllAutoPlaylists(userId, true);
  }

  /**
   * Get paginated artist playlists for a user
   * Used in the dedicated artists playlists page
   * Optimized to reuse the batch loading logic from generateArtistPlaylists
   */
  async getArtistPlaylistsPaginated(
    userId: string,
    skip: number = 0,
    take: number = 10
  ): Promise<{ playlists: AutoPlaylist[]; total: number; hasMore: boolean }> {
    // Get all top artists (up to 50)
    const allTopArtists = await this.playTrackingRepo.getUserTopArtists(userId, 50);
    const total = allTopArtists.length;

    // Paginate - slice the artist list
    const paginatedArtists = allTopArtists.slice(skip, skip + take);

    if (paginatedArtists.length === 0) {
      return { playlists: [], total, hasMore: false };
    }

    // OPTIMIZATION: Batch load only the paginated artists
    const artistIds = paginatedArtists.map(a => a.artistId);
    const artistsResult = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
        mbzArtistId: artists.mbzArtistId,
      })
      .from(artists)
      .where(inArray(artists.id, artistIds));
    const artistMap = new Map(artistsResult.map(a => [a.id, a]));

    // OPTIMIZATION: Fetch all user play stats once
    const allPlayStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackIds = allPlayStats.map(t => t.itemId);

    // OPTIMIZATION: Batch load all tracks for paginated artists
    const allTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        artistId: tracks.artistId,
        albumId: tracks.albumId,
        title: tracks.title,
      })
      .from(tracks)
      .where(and(
        inArray(tracks.id, trackIds),
        inArray(tracks.artistId, artistIds)
      ));

    // Group tracks by artist
    const tracksByArtist = new Map<string, typeof allTracks>();
    for (const track of allTracks) {
      if (!track.artistId) continue;
      if (!tracksByArtist.has(track.artistId)) {
        tracksByArtist.set(track.artistId, []);
      }
      tracksByArtist.get(track.artistId)!.push(track);
    }

    const playlists: AutoPlaylist[] = [];
    const now = new Date();

    // Process each paginated artist
    for (const artistStat of paginatedArtists) {
      const artist = artistMap.get(artistStat.artistId);
      if (!artist) continue;

      const tracks = tracksByArtist.get(artist.id);
      if (!tracks || tracks.length === 0) continue;

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

      // Get artist cover image (reusing helper method)
      const coverImageUrl = await this.getArtistCoverImage(artist);

      playlists.push({
        id: `artist-mix-${artist.id}-${userId}-${now.getTime()}`,
        type: 'artist',
        userId,
        name: `Lo mejor de ${artist.name}`,
        description: `Las mejores canciones de ${artist.name} basadas en tu historial de escucha`,
        tracks: topTracks,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        metadata,
        coverImageUrl,
      });
    }

    return {
      playlists,
      total,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get paginated genre playlists
   * Used in the dedicated genres playlists page
   * Optimized to reuse the batch loading logic from generateGenrePlaylists
   */
  async getGenrePlaylistsPaginated(
    userId: string,
    skip: number = 0,
    take: number = 10
  ): Promise<{ playlists: AutoPlaylist[]; total: number; hasMore: boolean }> {
    // Get all top genres (up to 50) using existing private method
    const allTopGenres = await this.getTopUserGenres(userId, 50);
    const total = allTopGenres.length;

    // Paginate - slice the genre list
    const paginatedGenres = allTopGenres.slice(skip, skip + take);

    if (paginatedGenres.length === 0) {
      return { playlists: [], total, hasMore: false };
    }

    // OPTIMIZATION: Fetch all user play stats once
    const allPlayStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackIds = allPlayStats.map(t => t.itemId);

    if (trackIds.length === 0) {
      return { playlists: [], total, hasMore: false };
    }

    // OPTIMIZATION: Batch load all tracks with genres relation
    const tracksWithGenresResult = await this.drizzle.db
      .select({
        trackId: tracks.id,
        trackArtistId: tracks.artistId,
        trackAlbumId: tracks.albumId,
        trackTitle: tracks.title,
        genreId: genres.id,
        genreName: genres.name,
      })
      .from(tracks)
      .leftJoin(trackGenres, eq(tracks.id, trackGenres.trackId))
      .leftJoin(genres, eq(trackGenres.genreId, genres.id))
      .where(inArray(tracks.id, trackIds));

    // Group results by track to reconstruct nested structure
    const tracksMap = new Map();
    for (const row of tracksWithGenresResult) {
      if (!tracksMap.has(row.trackId)) {
        tracksMap.set(row.trackId, {
          id: row.trackId,
          artistId: row.trackArtistId,
          albumId: row.trackAlbumId,
          title: row.trackTitle,
          genres: [],
        });
      }
      if (row.genreId) {
        tracksMap.get(row.trackId).genres.push({
          genre: {
            id: row.genreId,
            name: row.genreName,
          },
        });
      }
    }
    const allTracks = Array.from(tracksMap.values());

    // Group tracks by genre ID (only for paginated genres)
    const paginatedGenreIds = new Set(paginatedGenres.map(g => g.genreId));
    const tracksByGenre = new Map<string, typeof allTracks>();
    for (const track of allTracks) {
      for (const tg of track.genres) {
        const genreId = tg.genre.id;
        // Only include tracks for the genres we're showing on this page
        if (!paginatedGenreIds.has(genreId)) continue;
        if (!tracksByGenre.has(genreId)) {
          tracksByGenre.set(genreId, []);
        }
        tracksByGenre.get(genreId)!.push(track);
      }
    }

    const playlists: AutoPlaylist[] = [];
    const now = new Date();

    // Process each paginated genre
    for (const genreData of paginatedGenres) {
      const tracks = tracksByGenre.get(genreData.genreId);
      if (!tracks || tracks.length === 0) continue;

      const trackIdsList = tracks.map(t => t.id);
      const trackArtistMap = new Map(tracks.map((t) => [t.id, t.artistId || '']));

      // Score tracks
      const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIdsList, trackArtistMap);

      // Take top 30 tracks for this genre
      const topTracks = scoredTracks.slice(0, 30);

      if (topTracks.length === 0) continue;

      const metadata: PlaylistMetadata = {
        totalTracks: topTracks.length,
        avgScore: topTracks.reduce((sum, t) => sum + t.totalScore, 0) / topTracks.length,
        topGenres: [genreData.genreName],
        topArtists: [],
        temporalDistribution: {
          lastWeek: 0,
          lastMonth: 0,
          lastYear: 0,
          older: 0,
        },
      };

      // Use a genre-themed color or generate one based on genre name
      const coverColor = this.getGenreColor(genreData.genreName);

      playlists.push({
        id: `genre-mix-${genreData.genreId}-${userId}-${now.getTime()}`,
        type: 'genre',
        userId,
        name: `${genreData.genreName} Mix`,
        description: `Tus mejores canciones de ${genreData.genreName}`,
        tracks: topTracks,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        metadata,
        coverColor,
      });
    }

    return {
      playlists,
      total,
      hasMore: skip + take < total,
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
   * Get artist cover image URL
   * Reuses images already downloaded by the artist page to avoid duplication
   */
  private async getArtistCoverImage(artist: { id: string; name: string; mbzArtistId: string | null }): Promise<string> {
    // Check if artist already has an external profile image downloaded
    // (This would have been downloaded when visiting the artist page)
    const artistWithImagesResult = await this.drizzle.db
      .select({
        externalProfilePath: artists.externalProfilePath,
        profileImagePath: artists.profileImagePath,
      })
      .from(artists)
      .where(eq(artists.id, artist.id))
      .limit(1);

    const artistWithImages = artistWithImagesResult[0] || null;

    // If artist has either external or local profile image, use it
    // The ImageService will handle the priority: Custom > Local > External
    if (artistWithImages?.externalProfilePath || artistWithImages?.profileImagePath) {
      this.logger.debug({ artistId: artist.id, artistName: artist.name }, 'Reusing existing artist profile image');
      return `/api/images/artists/${artist.id}/profile`;
    }

    // If no image exists yet, still return the profile URL
    // The image will be a placeholder until the user visits the artist page
    // (where the external-metadata service will download it)
    this.logger.debug({ artistId: artist.id, artistName: artist.name }, 'No artist image found, using profile endpoint');
    return `/api/images/artists/${artist.id}/profile`;
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
