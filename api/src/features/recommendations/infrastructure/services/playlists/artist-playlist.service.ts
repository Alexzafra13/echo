import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { and, inArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { tracks, artists } from '@infrastructure/database/schema';
import { AutoPlaylist, PlaylistMetadata } from '../../../domain/entities/track-score.entity';
import { ScoringService } from '../../../domain/services/scoring.service';
import {
  IPlayTrackingRepository,
  PLAY_TRACKING_REPOSITORY,
} from '@features/play-tracking/domain/ports';
import { PlaylistCoverService } from './playlist-cover.service';

interface ArtistData {
  id: string;
  name: string;
  mbzArtistId: string | null;
}

interface TrackData {
  id: string;
  artistId: string | null;
  albumId: string | null;
  title: string | null;
}

/**
 * Service for generating artist-based playlists
 */
@Injectable()
export class ArtistPlaylistService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly scoringService: ScoringService,
    @Inject(PLAY_TRACKING_REPOSITORY)
    private readonly playTrackingRepo: IPlayTrackingRepository,
    private readonly coverService: PlaylistCoverService,
    @InjectPinoLogger(ArtistPlaylistService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Generate artist playlists for a user
   * @param userId User ID
   * @param limit Number of playlists to generate
   */
  async generatePlaylists(userId: string, limit: number = 5): Promise<AutoPlaylist[]> {
    const topArtists = await this.playTrackingRepo.getUserTopArtists(userId, limit);

    if (topArtists.length === 0) {
      return [];
    }

    const { artistMap, tracksByArtist } = await this.loadArtistData(
      userId,
      topArtists.map(a => a.artistId)
    );

    return this.buildPlaylists(userId, topArtists.map(a => a.artistId), artistMap, tracksByArtist);
  }

  /**
   * Get paginated artist playlists
   */
  async getPaginated(
    userId: string,
    skip: number = 0,
    take: number = 10
  ): Promise<{ playlists: AutoPlaylist[]; total: number; hasMore: boolean }> {
    const allTopArtists = await this.playTrackingRepo.getUserTopArtists(userId, 50);
    const total = allTopArtists.length;

    const paginatedArtistIds = allTopArtists
      .slice(skip, skip + take)
      .map(a => a.artistId);

    if (paginatedArtistIds.length === 0) {
      return { playlists: [], total, hasMore: false };
    }

    const { artistMap, tracksByArtist } = await this.loadArtistData(userId, paginatedArtistIds);
    const playlists = await this.buildPlaylists(userId, paginatedArtistIds, artistMap, tracksByArtist);

    return {
      playlists,
      total,
      hasMore: skip + take < total,
    };
  }

  /**
   * Load artist data and tracks in batch
   */
  private async loadArtistData(
    userId: string,
    artistIds: string[]
  ): Promise<{
    artistMap: Map<string, ArtistData>;
    tracksByArtist: Map<string, TrackData[]>;
  }> {
    // Batch load artists
    const artistsResult = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
        mbzArtistId: artists.mbzArtistId,
      })
      .from(artists)
      .where(inArray(artists.id, artistIds));
    const artistMap = new Map(artistsResult.map(a => [a.id, a]));

    // Get user's play stats
    const allPlayStats = await this.playTrackingRepo.getUserPlayStats(userId, 'track');
    const trackIds = allPlayStats.map(t => t.itemId);

    // Batch load tracks for these artists
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
    const tracksByArtist = new Map<string, TrackData[]>();
    for (const track of allTracks) {
      if (!track.artistId) continue;
      if (!tracksByArtist.has(track.artistId)) {
        tracksByArtist.set(track.artistId, []);
      }
      tracksByArtist.get(track.artistId)!.push(track);
    }

    return { artistMap, tracksByArtist };
  }

  /**
   * Build playlists from loaded data
   */
  private async buildPlaylists(
    userId: string,
    artistIds: string[],
    artistMap: Map<string, ArtistData>,
    tracksByArtist: Map<string, TrackData[]>
  ): Promise<AutoPlaylist[]> {
    const playlists: AutoPlaylist[] = [];
    const now = new Date();

    for (const artistId of artistIds) {
      const artist = artistMap.get(artistId);
      if (!artist) continue;

      const artistTracks = tracksByArtist.get(artist.id);
      if (!artistTracks || artistTracks.length === 0) continue;

      const trackIdsList = artistTracks.map(t => t.id);
      const trackArtistMap = new Map(artistTracks.map((t) => [t.id, t.artistId || '']));

      // Score tracks
      const scoredTracks = await this.scoringService.calculateAndRankTracks(userId, trackIdsList, trackArtistMap);

      // Take top 30 tracks
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

      const coverImageUrl = await this.coverService.getArtistCoverImage(artist);

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

    return playlists;
  }
}
