import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { albums, artists } from '@infrastructure/database/schema';
import { IAlbumCoverRetriever, MusicBrainzAlbumMatch } from '../../domain/interfaces';
import { AlbumCover } from '../../domain/entities';
import { AgentRegistryService } from '../../infrastructure/services/agent-registry.service';
import { MetadataCacheService } from '../../infrastructure/services/metadata-cache.service';
import { StorageService } from '../../infrastructure/services/storage.service';
import { ImageDownloadService } from '../../infrastructure/services/image-download.service';
import {
  MetadataConflictService,
  ConflictPriority,
  ConflictSource,
} from '../../infrastructure/services/metadata-conflict.service';
import { NotFoundError } from '@shared/errors';
import { MbidSearchService } from './mbid-search.service';
import { GenreEnrichmentService } from './genre-enrichment.service';
import { EnrichmentLogService } from './enrichment-log.service';

export interface AlbumEnrichmentResult {
  coverUpdated: boolean;
  errors: string[];
}

/**
 * Service for enriching album metadata
 * Handles cover art, MBID search, and genre enrichment
 */
@Injectable()
export class AlbumEnrichmentService {
  constructor(
    @InjectPinoLogger(AlbumEnrichmentService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService,
    private readonly storage: StorageService,
    private readonly imageDownload: ImageDownloadService,
    private readonly conflictService: MetadataConflictService,
    private readonly mbidSearch: MbidSearchService,
    private readonly genreEnrichment: GenreEnrichmentService,
    private readonly enrichmentLog: EnrichmentLogService
  ) {}

  /**
   * Enrich an album with external metadata
   */
  async enrich(albumId: string, forceRefresh = false): Promise<AlbumEnrichmentResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let coverUpdated = false;

    // Check if any cover retrieval agents are available
    const coverAgents =
      this.agentRegistry.getAgentsFor<IAlbumCoverRetriever>('IAlbumCoverRetriever');
    const hasEnrichmentAgents = coverAgents.length > 0;

    if (!hasEnrichmentAgents) {
      this.logger.warn(
        `No cover retrieval agents available for album ${albumId}. ` +
          `This may indicate a configuration issue.`
      );
      return { coverUpdated: false, errors: ['No cover retrieval agents configured'] };
    }

    try {
      // Get album from database with artist info
      const albumResult = await this.drizzle.db
        .select({
          album: albums,
          artistName: artists.name,
          artistMbzId: artists.mbzArtistId,
        })
        .from(albums)
        .leftJoin(artists, eq(albums.artistId, artists.id))
        .where(eq(albums.id, albumId))
        .limit(1);

      const album = albumResult[0]?.album;
      const artistData = albumResult[0]
        ? {
            name: albumResult[0].artistName,
            mbzArtistId: albumResult[0].artistMbzId,
          }
        : null;

      if (!album) {
        throw new NotFoundError('Album', albumId);
      }

      const artistName = artistData?.name || 'Unknown Artist';
      this.logger.info(`Enriching album: ${album.name} by ${artistName} (ID: ${albumId})`);

      // Step 1: Handle MBID search if missing
      if (!album.mbzAlbumId) {
        await this.handleMbidSearch(albumId, album.name, artistName, errors);
        // Refresh album data after potential MBID update
        const refreshed = await this.drizzle.db
          .select()
          .from(albums)
          .where(eq(albums.id, albumId))
          .limit(1);
        if (refreshed[0]?.mbzAlbumId) {
          (album as typeof albums.$inferSelect).mbzAlbumId = refreshed[0].mbzAlbumId;
        }
      }

      // Step 2: Enrich genres (if MBID available)
      if (album.mbzAlbumId) {
        try {
          const genresAdded = await this.genreEnrichment.enrichAlbumGenres(
            albumId,
            album.mbzAlbumId
          );
          if (genresAdded > 0) {
            this.logger.info(`Added ${genresAdded} genres for album: ${album.name}`);
          }
        } catch (error) {
          this.logger.warn(
            `Error enriching genres for "${album.name}": ${(error as Error).message}`
          );
          errors.push(`Genre enrichment failed: ${(error as Error).message}`);
        }
      }

      // Step 3: Enrich cover
      if (album.mbzAlbumId) {
        coverUpdated = await this.enrichCover(
          albumId,
          album,
          artistData,
          artistName,
          forceRefresh,
          startTime,
          errors
        );
      }

      // Log partial success if errors occurred
      if (errors.length > 0 && coverUpdated) {
        await this.enrichmentLog.logPartial(
          albumId,
          'album',
          album.name,
          'multiple',
          'cover',
          errors.join('; '),
          Date.now() - startTime
        );
      }

      // Mark album as processed
      if (!coverUpdated) {
        await this.drizzle.db
          .update(albums)
          .set({
            externalInfoUpdatedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(albums.id, albumId));
        this.logger.debug(`Marked album "${album.name}" as processed (no cover update needed)`);
      }

      return { coverUpdated, errors };
    } catch (error) {
      this.logger.error(
        `Error enriching album ${albumId}: ${(error as Error).message}`,
        (error as Error).stack
      );
      errors.push((error as Error).message);

      // Log the error
      try {
        const albumResult = await this.drizzle.db
          .select({ name: albums.name })
          .from(albums)
          .where(eq(albums.id, albumId))
          .limit(1);
        await this.enrichmentLog.logError(
          albumId,
          'album',
          albumResult[0]?.name || 'Unknown',
          'multiple',
          'cover',
          (error as Error).message,
          Date.now() - startTime
        );
      } catch {
        // Ignore logging errors
      }

      return { coverUpdated, errors };
    }
  }

  /**
   * Handle MBID search and auto-apply or create conflict
   */
  private async handleMbidSearch(
    albumId: string,
    albumName: string,
    artistName: string,
    errors: string[]
  ): Promise<void> {
    this.logger.info(`Album "${albumName}" missing MBID, searching MusicBrainz...`);
    try {
      const mbMatches = await this.mbidSearch.searchAlbum(albumName, artistName);

      if (mbMatches.length > 0) {
        const topMatch = mbMatches[0];

        if (topMatch.score >= 90) {
          // Auto-apply high confidence match
          await this.drizzle.db
            .update(albums)
            .set({
              mbzAlbumId: topMatch.mbid,
              mbidSearchedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(albums.id, albumId));
          this.logger.info(
            `Auto-applied MBID for "${albumName}": ${topMatch.mbid} (score: ${topMatch.score})`
          );
        } else if (topMatch.score >= 70) {
          // Create conflict for manual review
          await this.createMbidConflict(albumId, albumName, artistName, mbMatches);
          await this.markMbidSearched(albumId);
        } else {
          this.logger.info(
            `Low confidence matches for "${albumName}" (best: ${topMatch.score}), skipping MBID assignment`
          );
          await this.markMbidSearched(albumId);
        }
      } else {
        this.logger.info(`No MusicBrainz matches found for "${albumName}"`);
        await this.markMbidSearched(albumId);
      }
    } catch (error) {
      this.logger.warn(`Error searching MBID for "${albumName}": ${(error as Error).message}`);
      errors.push(`MBID search failed: ${(error as Error).message}`);
      await this.markMbidSearched(albumId);
    }
  }

  /**
   * Create conflict for MBID selection
   */
  private async createMbidConflict(
    albumId: string,
    albumName: string,
    artistName: string,
    matches: MusicBrainzAlbumMatch[]
  ): Promise<void> {
    const topMatch = matches[0];
    const suggestions = matches
      .slice(0, 3)
      .map(
        (m) =>
          `${m.title} by ${m.artistName}${m.disambiguation ? ` (${m.disambiguation})` : ''} - MBID: ${m.mbid} (score: ${m.score})`
      )
      .join('\n');

    await this.conflictService.createConflict({
      entityId: albumId,
      entityType: 'album',
      field: 'albumName',
      currentValue: albumName,
      suggestedValue: `${topMatch.title}${topMatch.disambiguation ? ` (${topMatch.disambiguation})` : ''}`,
      source: 'musicbrainz' as ConflictSource,
      priority: ConflictPriority.MEDIUM,
      metadata: {
        albumName,
        artistName,
        suggestedMbid: topMatch.mbid,
        score: topMatch.score,
        allSuggestions: suggestions,
      },
    });
    this.logger.info(
      `Created MBID conflict for "${albumName}": score ${topMatch.score}, needs manual review`
    );
  }

  /**
   * Enrich album cover
   */
  private async enrichCover(
    albumId: string,
    album: typeof albums.$inferSelect,
    artistData: { name: string | null; mbzArtistId: string | null } | null,
    artistName: string,
    forceRefresh: boolean,
    startTime: number,
    errors: string[]
  ): Promise<boolean> {
    const cover = await this.getAlbumCover(
      album.mbzAlbumId,
      artistData?.mbzArtistId || null,
      artistName,
      album.name,
      forceRefresh,
      albumId
    );

    if (!cover) return false;

    const isMusicBrainzSource =
      cover.source === 'coverartarchive' || cover.source === 'musicbrainz';
    const hasExistingCover = !!album.externalCoverPath;

    if (!hasExistingCover || forceRefresh) {
      // Apply the cover directly
      const localPath = await this.downloadAlbumCover(albumId, cover);

      await this.drizzle.db
        .update(albums)
        .set({
          externalCoverPath: localPath,
          externalCoverSource: cover.source,
          externalInfoUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(albums.id, albumId));

      await this.enrichmentLog.logSuccess(
        albumId,
        'album',
        album.name,
        cover.source,
        'cover',
        ['externalCoverPath', 'externalCoverSource'],
        Date.now() - startTime,
        `/api/images/albums/${albumId}/cover`
      );

      this.logger.info(`Updated cover for: ${album.name} (source: ${cover.source})`);
      return true;
    } else {
      // Handle conflict for existing cover
      await this.handleCoverConflict(albumId, album, artistName, cover, isMusicBrainzSource);
      return false;
    }
  }

  /**
   * Handle cover conflict when album already has a cover
   */
  private async handleCoverConflict(
    albumId: string,
    album: typeof albums.$inferSelect,
    artistName: string,
    cover: AlbumCover,
    isMusicBrainzSource: boolean
  ): Promise<void> {
    let currentCoverUrl: string | undefined = undefined;
    let currentDimensions = null;
    let currentCoverSource: 'physical' | 'external' | null = null;

    // Priority 1: Use cover from physical files
    if (album.coverArtPath) {
      currentDimensions = await this.imageDownload.getImageDimensionsFromFile(album.coverArtPath);
      if (currentDimensions) {
        currentCoverUrl = `/api/images/albums/${albumId}/cover`;
        currentCoverSource = 'physical';
      }
    }

    // Fallback: Use external cover
    if (!currentDimensions && album.externalCoverPath) {
      currentDimensions = await this.imageDownload.getImageDimensionsFromFile(
        album.externalCoverPath
      );
      if (currentDimensions) {
        currentCoverUrl = `/api/images/albums/${albumId}/cover`;
        currentCoverSource = 'external';
      }
    }

    const suggestedDimensions = await this.imageDownload.getImageDimensionsFromUrl(cover.largeUrl);

    if (!suggestedDimensions) {
      this.logger.warn(
        `Skipping cover conflict for "${album.name}": couldn't detect resolution of suggested cover`
      );
      return;
    }

    const isQualityImprovement =
      currentDimensions && suggestedDimensions
        ? this.imageDownload.isSignificantImprovement(currentDimensions, suggestedDimensions)
        : false;

    const isLowQuality = currentDimensions
      ? currentDimensions.width < 500 || currentDimensions.height < 500
      : false;

    const currentResolution = currentDimensions
      ? `${currentDimensions.width}×${currentDimensions.height}`
      : undefined;

    const suggestedResolution = `${suggestedDimensions.width}×${suggestedDimensions.height}`;

    // Check if should skip
    if (currentResolution && currentResolution === suggestedResolution) {
      this.logger.debug(
        `Skipping cover conflict for "${album.name}": resolutions are identical (${currentResolution})`
      );
      return;
    }

    if (currentDimensions && !isQualityImprovement && !isLowQuality) {
      this.logger.debug(
        `Skipping cover conflict for "${album.name}": current resolution is equal or better`
      );
      return;
    }

    // Create the conflict
    this.logger.info(
      `Cover comparison for "${album.name}": ` +
        `Current: ${currentResolution || 'none'} → Suggested: ${suggestedResolution}`
    );

    await this.conflictService.createConflict({
      entityId: albumId,
      entityType: 'album',
      field: 'externalCover',
      currentValue: currentCoverUrl,
      suggestedValue: cover.largeUrl,
      source: cover.source as ConflictSource,
      priority: isMusicBrainzSource ? ConflictPriority.HIGH : ConflictPriority.MEDIUM,
      metadata: {
        albumName: album.name,
        artistName,
        currentSource:
          currentCoverSource === 'physical' ? 'embedded' : album.externalCoverSource || 'unknown',
        currentCoverType: currentCoverSource,
        currentResolution,
        suggestedResolution,
        qualityImprovement: isQualityImprovement,
        isLowQuality,
      },
    });
    this.logger.info(
      `Created conflict for album "${album.name}": existing cover vs ${cover.source} suggestion`
    );
  }

  /**
   * Get album cover using agent chain
   */
  private async getAlbumCover(
    mbzAlbumId: string | null,
    mbzArtistId: string | null,
    artist: string,
    album: string,
    forceRefresh: boolean,
    albumId?: string
  ): Promise<AlbumCover | null> {
    // Check cache first
    if (!forceRefresh && albumId) {
      const cached = await this.cache.get('album', albumId, 'cover');
      if (cached) {
        return new AlbumCover(
          cached.smallUrl as string,
          cached.mediumUrl as string,
          cached.largeUrl as string,
          cached.source as string
        );
      }
    }

    const agents = this.agentRegistry.getAgentsFor<IAlbumCoverRetriever>('IAlbumCoverRetriever');

    for (const agentObj of agents) {
      try {
        this.logger.debug(`Trying agent "${agentObj.name}" for cover: ${artist} - ${album}`);

        // Fanart.tv needs special handling
        if (agentObj.name === 'fanart' && mbzArtistId && mbzAlbumId) {
          const fanartAgent = agentObj as IAlbumCoverRetriever & {
            getAlbumCoverByArtist?: (
              artistMbid: string,
              albumMbid: string,
              artistName: string,
              albumName: string
            ) => Promise<AlbumCover | null>;
          };
          if (fanartAgent.getAlbumCoverByArtist) {
            const cover = await fanartAgent.getAlbumCoverByArtist(
              mbzArtistId,
              mbzAlbumId,
              artist,
              album
            );
            if (cover) {
              if (albumId) {
                await this.cache.set('album', albumId, 'cover', {
                  smallUrl: cover.smallUrl,
                  mediumUrl: cover.mediumUrl,
                  largeUrl: cover.largeUrl,
                  source: cover.source,
                });
              }
              return cover;
            }
          }
          continue;
        }

        // Standard agents
        const cover = await agentObj.getAlbumCover(mbzAlbumId, artist, album);

        if (cover) {
          if (albumId) {
            await this.cache.set('album', albumId, 'cover', {
              smallUrl: cover.smallUrl,
              mediumUrl: cover.mediumUrl,
              largeUrl: cover.largeUrl,
              source: cover.source,
            });
          }
          return cover;
        }
      } catch (error) {
        this.logger.warn(
          `Agent "${agentObj.name}" failed for cover ${artist} - ${album}: ${(error as Error).message}`
        );
      }
    }

    this.logger.debug(`No cover found for: ${artist} - ${album}`);
    return null;
  }

  /**
   * Download album cover to metadata storage
   */
  private async downloadAlbumCover(albumId: string, cover: AlbumCover): Promise<string> {
    const metadataPath = await this.storage.getAlbumMetadataPath(albumId);
    const coverPath = path.join(metadataPath, 'cover.jpg');

    await this.imageDownload.downloadAndSave(cover.largeUrl, coverPath);

    return coverPath;
  }

  /**
   * Mark MBID as searched
   */
  private async markMbidSearched(albumId: string): Promise<void> {
    await this.drizzle.db
      .update(albums)
      .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
      .where(eq(albums.id, albumId));
  }
}
