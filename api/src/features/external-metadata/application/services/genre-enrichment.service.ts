import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { genres, artistGenres, albumGenres, trackGenres, tracks } from '@infrastructure/database/schema';
import { AgentRegistryService } from '../../infrastructure/services/agent-registry.service';
import { LastfmAgent } from '../../infrastructure/agents/lastfm.agent';
import { MbidSearchService } from './mbid-search.service';

/**
 * Service for enriching entities with genre information
 * Fetches genres from Last.fm (primary), MusicBrainz (fallback),
 * or aggregates from track ID3 tags (local fallback)
 */
@Injectable()
export class GenreEnrichmentService {
  constructor(
    @InjectPinoLogger(GenreEnrichmentService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly mbidSearch: MbidSearchService
  ) {}

  /**
   * Enrich artist with genre tags
   * Priority: Last.fm (if configured) → MusicBrainz → Track ID3 tags
   *
   * @param artistId Internal artist ID
   * @param mbzArtistId MusicBrainz Artist ID
   * @param artistName Artist name (for Last.fm lookup)
   * @returns Number of genres saved
   */
  async enrichArtistGenres(
    artistId: string,
    mbzArtistId: string,
    artistName?: string
  ): Promise<number> {
    try {
      let tagsToSave: Array<{ name: string; count: number }> = [];
      let source = '';

      // Priority 1: Try Last.fm (if enabled and artist name available)
      const lastfmAgent = this.agentRegistry.getAgent('lastfm') as LastfmAgent | undefined;
      if (lastfmAgent?.isEnabled() && artistName) {
        const lastfmTags = await lastfmAgent.getArtistTags(mbzArtistId, artistName);
        if (lastfmTags && lastfmTags.length > 0) {
          tagsToSave = lastfmTags;
          source = 'Last.fm';
        }
      }

      // Priority 2: Fallback to MusicBrainz
      if (tagsToSave.length === 0 && mbzArtistId) {
        const artistData = await this.mbidSearch.getArtistByMbid(mbzArtistId);
        if (artistData?.tags && artistData.tags.length > 0) {
          tagsToSave = artistData.tags.filter((tag) => tag.count >= 3).slice(0, 10);
          source = 'MusicBrainz';
        }
      }

      // Priority 3: Aggregate from track ID3 tags
      if (tagsToSave.length === 0) {
        const trackTags = await this.getGenresFromArtistTracks(artistId);
        if (trackTags.length > 0) {
          tagsToSave = trackTags;
          source = 'ID3 tags';
        }
      }

      if (tagsToSave.length === 0) {
        return 0;
      }

      const savedCount = await this.saveGenresForEntity(tagsToSave, artistId, 'artist');

      this.logger.debug(`Saved ${savedCount} genres for artist ${artistId} from ${source}`);
      return savedCount;
    } catch (error) {
      this.logger.error(`Error enriching artist genres: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Enrich album with genre tags from MusicBrainz
   *
   * @param albumId Internal album ID
   * @param mbzAlbumId MusicBrainz Release-Group ID
   * @returns Number of genres saved
   */
  async enrichAlbumGenres(albumId: string, mbzAlbumId: string): Promise<number> {
    try {
      let tagsToSave: Array<{ name: string; count: number }> = [];
      let source = '';

      // Priority 1: MusicBrainz
      if (mbzAlbumId) {
        const albumData = await this.mbidSearch.getAlbumByMbid(mbzAlbumId);
        if (albumData?.tags && albumData.tags.length > 0) {
          tagsToSave = albumData.tags.filter((tag) => tag.count >= 3).slice(0, 10);
          source = 'MusicBrainz';
        }
      }

      // Priority 2: Aggregate from track ID3 tags
      if (tagsToSave.length === 0) {
        const trackTags = await this.getGenresFromAlbumTracks(albumId);
        if (trackTags.length > 0) {
          tagsToSave = trackTags;
          source = 'ID3 tags';
        }
      }

      if (tagsToSave.length === 0) {
        return 0;
      }

      const savedCount = await this.saveGenresForEntity(tagsToSave, albumId, 'album');

      this.logger.debug(`Saved ${savedCount} genres for album ${albumId} from ${source}`);
      return savedCount;
    } catch (error) {
      this.logger.error(`Error enriching album genres: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Aggregate genres from an artist's tracks (ID3 tags)
   * Returns the most common genres across the artist's tracks, ranked by frequency
   */
  private async getGenresFromArtistTracks(
    artistId: string
  ): Promise<Array<{ name: string; count: number }>> {
    const result = await this.drizzle.db
      .select({
        name: genres.name,
        count: sql<number>`count(*)::int`,
      })
      .from(trackGenres)
      .innerJoin(tracks, eq(trackGenres.trackId, tracks.id))
      .innerJoin(genres, eq(trackGenres.genreId, genres.id))
      .where(eq(tracks.artistId, artistId))
      .groupBy(genres.name)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return result;
  }

  /**
   * Aggregate genres from an album's tracks (ID3 tags)
   * Returns the most common genres across the album's tracks, ranked by frequency
   */
  private async getGenresFromAlbumTracks(
    albumId: string
  ): Promise<Array<{ name: string; count: number }>> {
    const result = await this.drizzle.db
      .select({
        name: genres.name,
        count: sql<number>`count(*)::int`,
      })
      .from(trackGenres)
      .innerJoin(tracks, eq(trackGenres.trackId, tracks.id))
      .innerJoin(genres, eq(trackGenres.genreId, genres.id))
      .where(eq(tracks.albumId, albumId))
      .groupBy(genres.name)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    return result;
  }

  /**
   * Save genres for an entity (artist or album)
   */
  private async saveGenresForEntity(
    tags: Array<{ name: string; count: number }>,
    entityId: string,
    entityType: 'artist' | 'album'
  ): Promise<number> {
    let savedCount = 0;

    for (const tag of tags) {
      try {
        const genreName = tag.name.charAt(0).toUpperCase() + tag.name.slice(1);

        // Find or create genre
        let genreResult = await this.drizzle.db
          .select({ id: genres.id })
          .from(genres)
          .where(eq(genres.name, genreName))
          .limit(1);

        if (!genreResult[0]) {
          const newGenre = await this.drizzle.db
            .insert(genres)
            .values({ name: genreName })
            .onConflictDoNothing({ target: genres.name })
            .returning({ id: genres.id });

          if (!newGenre[0]) {
            genreResult = await this.drizzle.db
              .select({ id: genres.id })
              .from(genres)
              .where(eq(genres.name, genreName))
              .limit(1);
          } else {
            genreResult = newGenre;
          }
        }

        const genre = genreResult[0];
        if (genre) {
          if (entityType === 'artist') {
            await this.drizzle.db
              .insert(artistGenres)
              .values({ artistId: entityId, genreId: genre.id })
              .onConflictDoNothing();
          } else {
            await this.drizzle.db
              .insert(albumGenres)
              .values({ albumId: entityId, genreId: genre.id })
              .onConflictDoNothing();
          }
          savedCount++;
        }
      } catch (error) {
        this.logger.warn(`Failed to save genre "${tag.name}": ${(error as Error).message}`);
      }
    }

    return savedCount;
  }
}
