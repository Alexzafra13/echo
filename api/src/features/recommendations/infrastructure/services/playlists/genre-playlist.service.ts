import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq, inArray, count, desc } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { tracks, genres, trackGenres } from '@infrastructure/database/schema';
import { AutoPlaylist, PlaylistMetadata } from '../../../domain/entities/track-score.entity';
import { ScoringService } from '../../../domain/services/scoring.service';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';
import { PlaylistCoverService } from './playlist-cover.service';

interface GenreData {
  genreId: string;
  genreName: string;
  playCount: number;
}

interface TrackWithGenres {
  id: string;
  artistId: string | null;
  albumId: string | null;
  title: string | null;
  genres: Array<{ genre: { id: string; name: string | null } }>;
}

/**
 * Service for generating genre-based playlists
 */
@Injectable()
export class GenrePlaylistService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly scoringService: ScoringService,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
    private readonly coverService: PlaylistCoverService,
    @InjectPinoLogger(GenrePlaylistService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Generate genre playlists for a user
   */
  async generatePlaylists(userId: string, limit: number = 5): Promise<AutoPlaylist[]> {
    const topGenres = await this.getTopUserGenres(userId, limit);

    this.logger.info({ userId, topGenresCount: topGenres.length }, 'Top genres for user');

    if (topGenres.length === 0) {
      this.logger.warn({ userId }, 'No genres found for user');
      return [];
    }

    const { tracksByGenre } = await this.loadGenreData(userId, topGenres.map(g => g.genreId));

    return this.buildPlaylists(userId, topGenres, tracksByGenre);
  }

  /**
   * Get paginated genre playlists
   */
  async getPaginated(
    userId: string,
    skip: number = 0,
    take: number = 10
  ): Promise<{ playlists: AutoPlaylist[]; total: number; hasMore: boolean }> {
    const allTopGenres = await this.getTopUserGenres(userId, 50);
    const total = allTopGenres.length;

    const paginatedGenres = allTopGenres.slice(skip, skip + take);

    if (paginatedGenres.length === 0) {
      return { playlists: [], total, hasMore: false };
    }

    const { tracksByGenre } = await this.loadGenreData(userId, paginatedGenres.map(g => g.genreId));
    const playlists = await this.buildPlaylists(userId, paginatedGenres, tracksByGenre);

    return {
      playlists,
      total,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get user's top genres based on listening history
   */
  async getTopUserGenres(userId: string, limit: number): Promise<GenreData[]> {
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
      this.logger.warn({ userId, trackCount: trackIds.length }, 'No genres found for user tracks');
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
   * Load track data with genres in batch
   */
  private async loadGenreData(
    userId: string,
    genreIds: string[]
  ): Promise<{
    tracksByGenre: Map<string, TrackWithGenres[]>;
  }> {
    const allPlayStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackIds = allPlayStats.map(t => t.itemId);

    if (trackIds.length === 0) {
      return { tracksByGenre: new Map() };
    }

    // Batch load tracks with genres
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

    // Group results by track
    const tracksMap = new Map<string, TrackWithGenres>();
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
        tracksMap.get(row.trackId)!.genres.push({
          genre: {
            id: row.genreId,
            name: row.genreName,
          },
        });
      }
    }
    const allTracks = Array.from(tracksMap.values());

    // Group tracks by genre (only for requested genres)
    const genreIdSet = new Set(genreIds);
    const tracksByGenre = new Map<string, TrackWithGenres[]>();
    for (const track of allTracks) {
      for (const tg of track.genres) {
        const genreId = tg.genre.id;
        if (!genreIdSet.has(genreId)) continue;
        if (!tracksByGenre.has(genreId)) {
          tracksByGenre.set(genreId, []);
        }
        tracksByGenre.get(genreId)!.push(track);
      }
    }

    return { tracksByGenre };
  }

  /**
   * Build playlists from loaded data
   */
  private async buildPlaylists(
    userId: string,
    genresData: GenreData[],
    tracksByGenre: Map<string, TrackWithGenres[]>
  ): Promise<AutoPlaylist[]> {
    const playlists: AutoPlaylist[] = [];
    const now = new Date();

    for (const genreData of genresData) {
      const genreTracks = tracksByGenre.get(genreData.genreId);
      if (!genreTracks || genreTracks.length === 0) continue;

      const trackIdsList = genreTracks.map(t => t.id);
      const trackArtistMap = new Map(genreTracks.map((t) => [t.id, t.artistId || '']));

      // Score tracks
      const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIdsList, trackArtistMap);

      // Take top 30 tracks
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

      const coverColor = this.coverService.getGenreColor(genreData.genreName);

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
}
