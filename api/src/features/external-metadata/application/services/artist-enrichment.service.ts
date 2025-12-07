import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists } from '@infrastructure/database/schema';
import { IArtistBioRetriever, IArtistImageRetriever, MusicBrainzArtistMatch } from '../../domain/interfaces';
import { ArtistBio, ArtistImages } from '../../domain/entities';
import { AgentRegistryService } from '../../infrastructure/services/agent-registry.service';
import { MetadataCacheService } from '../../infrastructure/services/metadata-cache.service';
import { StorageService } from '../../infrastructure/services/storage.service';
import { ImageDownloadService } from '../../infrastructure/services/image-download.service';
import { MetadataConflictService, ConflictPriority } from '../../infrastructure/services/metadata-conflict.service';
import { NotFoundError } from '@shared/errors';
import { MbidSearchService } from './mbid-search.service';
import { GenreEnrichmentService } from './genre-enrichment.service';
import { EnrichmentLogService } from './enrichment-log.service';

export interface ArtistEnrichmentResult {
  bioUpdated: boolean;
  imagesUpdated: boolean;
  errors: string[];
}

/**
 * Service for enriching artist metadata
 * Handles biography, images, MBID search, and genre enrichment
 */
@Injectable()
export class ArtistEnrichmentService {
  private readonly logger = new Logger(ArtistEnrichmentService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService,
    private readonly storage: StorageService,
    private readonly imageDownload: ImageDownloadService,
    private readonly conflictService: MetadataConflictService,
    private readonly mbidSearch: MbidSearchService,
    private readonly genreEnrichment: GenreEnrichmentService,
    private readonly enrichmentLog: EnrichmentLogService,
  ) {}

  /**
   * Enrich an artist with external metadata
   */
  async enrich(artistId: string, forceRefresh = false): Promise<ArtistEnrichmentResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let bioUpdated = false;
    let imagesUpdated = false;

    // Check if any enrichment agents are available
    const bioAgents = this.agentRegistry.getAgentsFor<IArtistBioRetriever>('IArtistBioRetriever');
    const imageAgents = this.agentRegistry.getAgentsFor<IArtistImageRetriever>('IArtistImageRetriever');
    const hasEnrichmentAgents = bioAgents.length > 0 || imageAgents.length > 0;

    if (!hasEnrichmentAgents) {
      this.logger.warn(
        `No enrichment agents available for artist ${artistId}. ` +
        `Configure API keys (Last.fm, Fanart.tv) to enable metadata enrichment.`
      );
      return { bioUpdated: false, imagesUpdated: false, errors: ['No enrichment agents configured'] };
    }

    try {
      // Get artist from database
      const artistResult = await this.drizzle.db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      const artist = artistResult[0];

      if (!artist) {
        throw new NotFoundError('Artist', artistId);
      }

      this.logger.log(`Enriching artist: ${artist.name} (ID: ${artistId})`);

      // Step 1: Handle MBID search if missing
      if (!artist.mbzArtistId) {
        await this.handleMbidSearch(artistId, artist.name, errors);
        // Refresh artist data after potential MBID update
        const refreshed = await this.drizzle.db
          .select()
          .from(artists)
          .where(eq(artists.id, artistId))
          .limit(1);
        if (refreshed[0]?.mbzArtistId) {
          artist.mbzArtistId = refreshed[0].mbzArtistId;
        }
      }

      // Step 2: Enrich genres
      try {
        const genresAdded = await this.genreEnrichment.enrichArtistGenres(
          artistId,
          artist.mbzArtistId || '',
          artist.name
        );
        if (genresAdded > 0) {
          this.logger.log(`Added ${genresAdded} genres for artist: ${artist.name}`);
        }
      } catch (error) {
        this.logger.warn(`Error enriching genres for "${artist.name}": ${(error as Error).message}`);
        errors.push(`Genre enrichment failed: ${(error as Error).message}`);
      }

      // Step 3: Enrich biography
      bioUpdated = await this.enrichBiography(artistId, artist, forceRefresh, startTime, errors);

      // Step 4: Enrich images
      imagesUpdated = await this.enrichImages(artistId, artist, forceRefresh, startTime, errors);

      // Log partial success if errors occurred
      if (errors.length > 0 && (bioUpdated || imagesUpdated)) {
        await this.enrichmentLog.logPartial(
          artistId,
          'artist',
          artist.name,
          'multiple',
          'mixed',
          errors.join('; '),
          Date.now() - startTime
        );
      }

      // Ensure artist is marked as processed
      await this.markAsProcessed(artistId, artist.name);

      return { bioUpdated, imagesUpdated, errors };
    } catch (error) {
      this.logger.error(`Error enriching artist ${artistId}: ${(error as Error).message}`, (error as Error).stack);
      errors.push((error as Error).message);

      // Log the error
      try {
        const artistResult = await this.drizzle.db
          .select({ name: artists.name })
          .from(artists)
          .where(eq(artists.id, artistId))
          .limit(1);
        await this.enrichmentLog.logError(
          artistId,
          'artist',
          artistResult[0]?.name || 'Unknown',
          'multiple',
          'mixed',
          (error as Error).message,
          Date.now() - startTime
        );
      } catch {
        // Ignore logging errors
      }

      return { bioUpdated, imagesUpdated, errors };
    }
  }

  /**
   * Handle MBID search and auto-apply or create conflict
   */
  private async handleMbidSearch(artistId: string, artistName: string, errors: string[]): Promise<void> {
    this.logger.log(`Artist "${artistName}" missing MBID, searching MusicBrainz...`);
    try {
      const mbMatches = await this.mbidSearch.searchArtist(artistName);

      if (mbMatches.length > 0) {
        const topMatch = mbMatches[0];

        if (topMatch.score >= 90) {
          // Auto-apply high confidence match
          await this.drizzle.db
            .update(artists)
            .set({
              mbzArtistId: topMatch.mbid,
              mbidSearchedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artistId));
          this.logger.log(
            `Auto-applied MBID for "${artistName}": ${topMatch.mbid} (score: ${topMatch.score})`
          );
        } else if (topMatch.score >= 70) {
          // Create conflict for manual review
          await this.createMbidConflict(artistId, artistName, mbMatches);
          await this.markMbidSearched(artistId);
        } else {
          this.logger.log(
            `Low confidence matches for "${artistName}" (best: ${topMatch.score}), skipping MBID assignment`
          );
          await this.markMbidSearched(artistId);
        }
      } else {
        this.logger.log(`No MusicBrainz matches found for "${artistName}"`);
        await this.markMbidSearched(artistId);
      }
    } catch (error) {
      this.logger.warn(`Error searching MBID for "${artistName}": ${(error as Error).message}`);
      errors.push(`MBID search failed: ${(error as Error).message}`);
      await this.markMbidSearched(artistId);
    }
  }

  /**
   * Create conflict for MBID selection
   */
  private async createMbidConflict(
    artistId: string,
    artistName: string,
    matches: MusicBrainzArtistMatch[]
  ): Promise<void> {
    const topMatch = matches[0];
    const suggestions = matches.slice(0, 3).map((m) =>
      `${m.name}${m.disambiguation ? ` (${m.disambiguation})` : ''} - MBID: ${m.mbid} (score: ${m.score})`
    ).join('\n');

    await this.conflictService.createConflict({
      entityId: artistId,
      entityType: 'artist',
      field: 'artistName',
      currentValue: artistName,
      suggestedValue: `${topMatch.name}${topMatch.disambiguation ? ` (${topMatch.disambiguation})` : ''}`,
      source: 'musicbrainz' as any,
      priority: ConflictPriority.MEDIUM,
      metadata: {
        artistName,
        suggestedMbid: topMatch.mbid,
        score: topMatch.score,
        allSuggestions: suggestions,
      },
    });
    this.logger.log(
      `Created MBID conflict for "${artistName}": score ${topMatch.score}, needs manual review`
    );
  }

  /**
   * Enrich artist biography
   */
  private async enrichBiography(
    artistId: string,
    artist: any,
    forceRefresh: boolean,
    startTime: number,
    errors: string[]
  ): Promise<boolean> {
    const bio = await this.getArtistBio(artist.mbzArtistId, artist.name, forceRefresh, artistId);
    if (!bio) return false;

    const hasExistingBio = !!artist.biography;
    const isMusicBrainzSource = bio.source === 'musicbrainz';

    if (!hasExistingBio || forceRefresh) {
      await this.drizzle.db
        .update(artists)
        .set({
          biography: bio.content,
          biographySource: bio.source,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistId));

      await this.enrichmentLog.logSuccess(
        artistId,
        'artist',
        artist.name,
        bio.source,
        'biography',
        ['biography', 'biographySource'],
        Date.now() - startTime
      );

      this.logger.log(`Updated biography for: ${artist.name} (source: ${bio.source})`);
      return true;
    } else {
      // Create conflict if content is different
      const currentBio = artist.biography || '';
      const suggestedBio = bio.content || '';

      if (currentBio.trim() !== suggestedBio.trim()) {
        await this.conflictService.createConflict({
          entityId: artistId,
          entityType: 'artist',
          field: 'biography',
          currentValue: currentBio.substring(0, 200) + '...',
          suggestedValue: suggestedBio.substring(0, 200) + '...',
          source: bio.source as any,
          priority: isMusicBrainzSource ? ConflictPriority.HIGH : ConflictPriority.MEDIUM,
          metadata: {
            artistName: artist.name,
            currentSource: artist.biographySource,
            fullBioLength: bio.content.length,
          },
        });
        this.logger.log(
          `Created conflict for artist "${artist.name}": existing bio vs ${bio.source} suggestion`
        );
      }
      return false;
    }
  }

  /**
   * Enrich artist images
   */
  private async enrichImages(
    artistId: string,
    artist: any,
    forceRefresh: boolean,
    startTime: number,
    errors: string[]
  ): Promise<boolean> {
    const needsImages =
      forceRefresh ||
      !artist.externalProfilePath ||
      !artist.externalBackgroundPath ||
      !artist.externalBannerPath ||
      !artist.externalLogoPath;

    if (!needsImages) return false;

    const images = await this.getArtistImages(artist.mbzArtistId, artist.name, forceRefresh, artistId);
    if (!images) return false;

    const localPaths = await this.downloadArtistImages(artistId, images);

    const updateData: any = {};
    const now = new Date();

    if (forceRefresh || !artist.externalProfilePath) {
      if (localPaths.profileUrl) {
        updateData.externalProfilePath = localPaths.profileUrl;
        updateData.externalProfileSource = images.source;
        updateData.externalProfileUpdatedAt = now;
      }
    }
    if (forceRefresh || !artist.externalBackgroundPath) {
      if (localPaths.backgroundUrl) {
        updateData.externalBackgroundPath = localPaths.backgroundUrl;
        updateData.externalBackgroundSource = images.source;
        updateData.externalBackgroundUpdatedAt = now;
      }
    }
    if (forceRefresh || !artist.externalBannerPath) {
      if (localPaths.bannerUrl) {
        updateData.externalBannerPath = localPaths.bannerUrl;
        updateData.externalBannerSource = images.source;
        updateData.externalBannerUpdatedAt = now;
      }
    }
    if (forceRefresh || !artist.externalLogoPath) {
      if (localPaths.logoUrl) {
        updateData.externalLogoPath = localPaths.logoUrl;
        updateData.externalLogoSource = images.source;
        updateData.externalLogoUpdatedAt = now;
      }
    }

    updateData.metadataStorageSize = localPaths.totalSize;

    if (Object.keys(updateData).length > 0) {
      await this.drizzle.db
        .update(artists)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(artists.id, artistId));

      await this.enrichmentLog.logSuccess(
        artistId,
        'artist',
        artist.name,
        images.source,
        'images',
        Object.keys(updateData).filter(key => key.includes('Path') || key === 'metadataStorageSize'),
        Date.now() - startTime,
        `/api/images/artists/${artistId}/profile`
      );

      this.logger.log(`Updated images for: ${artist.name} (${localPaths.totalSize} bytes)`);
      return true;
    }

    return false;
  }

  /**
   * Get artist biography using agent chain
   */
  private async getArtistBio(
    mbzArtistId: string | null,
    name: string,
    forceRefresh: boolean,
    artistId?: string
  ): Promise<ArtistBio | null> {
    // Check cache first
    if (!forceRefresh && artistId) {
      const cached = await this.cache.get('artist', artistId, 'bio');
      if (cached) {
        return new ArtistBio(cached.content, cached.summary, cached.url, cached.source);
      }
    }

    const agents = this.agentRegistry.getAgentsFor<IArtistBioRetriever>('IArtistBioRetriever');

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for bio: ${name}`);
        const bio = await agent.getArtistBio(mbzArtistId, name);

        if (bio && bio.hasContent()) {
          if (artistId) {
            await this.cache.set('artist', artistId, 'bio', {
              content: bio.content,
              summary: bio.summary,
              url: bio.url,
              source: bio.source,
            });
          }
          return bio;
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for bio ${name}: ${(error as Error).message}`);
      }
    }

    this.logger.debug(`No biography found for: ${name}`);
    return null;
  }

  /**
   * Get artist images using agent chain
   */
  private async getArtistImages(
    mbzArtistId: string | null,
    name: string,
    forceRefresh: boolean,
    artistId?: string
  ): Promise<ArtistImages | null> {
    // Check cache first
    if (!forceRefresh && artistId) {
      const cached = await this.cache.get('artist', artistId, 'images');
      if (cached) {
        return new ArtistImages(
          cached.smallUrl,
          cached.mediumUrl,
          cached.largeUrl,
          cached.backgroundUrl,
          cached.bannerUrl,
          cached.logoUrl,
          cached.source
        );
      }
    }

    const agents = this.agentRegistry.getAgentsFor<IArtistImageRetriever>('IArtistImageRetriever');
    let mergedImages: ArtistImages | null = null;

    for (const agent of agents) {
      try {
        this.logger.debug(`Trying agent "${agent.name}" for images: ${name}`);
        const images = await agent.getArtistImages(mbzArtistId, name);

        if (images) {
          if (!mergedImages) {
            mergedImages = images;
          } else {
            mergedImages = new ArtistImages(
              mergedImages.smallUrl || images.smallUrl,
              mergedImages.mediumUrl || images.mediumUrl,
              mergedImages.largeUrl || images.largeUrl,
              mergedImages.backgroundUrl || images.backgroundUrl,
              mergedImages.bannerUrl || images.bannerUrl,
              mergedImages.logoUrl || images.logoUrl,
              `${mergedImages.source},${images.source}`
            );
          }

          if (mergedImages.hasHeroAssets() && mergedImages.getBestProfileUrl()) {
            break;
          }
        }
      } catch (error) {
        this.logger.warn(`Agent "${agent.name}" failed for images ${name}: ${(error as Error).message}`);
      }
    }

    if (mergedImages && artistId) {
      await this.cache.set('artist', artistId, 'images', {
        smallUrl: mergedImages.smallUrl,
        mediumUrl: mergedImages.mediumUrl,
        largeUrl: mergedImages.largeUrl,
        backgroundUrl: mergedImages.backgroundUrl,
        bannerUrl: mergedImages.bannerUrl,
        logoUrl: mergedImages.logoUrl,
        source: mergedImages.source,
      });
    }

    return mergedImages;
  }

  /**
   * Download artist images and save locally
   */
  private async downloadArtistImages(
    artistId: string,
    images: ArtistImages
  ): Promise<{
    profileUrl: string | null;
    backgroundUrl: string | null;
    bannerUrl: string | null;
    logoUrl: string | null;
    totalSize: number;
  }> {
    const basePath = await this.storage.getArtistMetadataPath(artistId);
    let totalSize = 0;

    const result = {
      profileUrl: null as string | null,
      backgroundUrl: null as string | null,
      bannerUrl: null as string | null,
      logoUrl: null as string | null,
      totalSize: 0,
    };

    const profileUrl = images.largeUrl || images.mediumUrl || images.smallUrl;
    if (profileUrl) {
      try {
        const filePath = path.join(basePath, 'profile.jpg');
        await this.imageDownload.downloadAndSave(profileUrl, filePath);
        result.profileUrl = 'profile.jpg';
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download profile image: ${(error as Error).message}`);
      }
    }

    if (images.backgroundUrl) {
      try {
        const filePath = path.join(basePath, 'background.jpg');
        await this.imageDownload.downloadAndSave(images.backgroundUrl, filePath);
        result.backgroundUrl = 'background.jpg';
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download background image: ${(error as Error).message}`);
      }
    }

    if (images.bannerUrl) {
      try {
        const filePath = path.join(basePath, 'banner.png');
        await this.imageDownload.downloadAndSave(images.bannerUrl, filePath);
        result.bannerUrl = 'banner.png';
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download banner image: ${(error as Error).message}`);
      }
    }

    if (images.logoUrl) {
      try {
        const filePath = path.join(basePath, 'logo.png');
        await this.imageDownload.downloadAndSave(images.logoUrl, filePath);
        result.logoUrl = 'logo.png';
        totalSize += await this.storage.getFileSize(filePath);
      } catch (error) {
        this.logger.warn(`Failed to download logo image: ${(error as Error).message}`);
      }
    }

    result.totalSize = totalSize;
    return result;
  }

  /**
   * Mark MBID as searched
   */
  private async markMbidSearched(artistId: string): Promise<void> {
    await this.drizzle.db
      .update(artists)
      .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
      .where(eq(artists.id, artistId));
  }

  /**
   * Mark artist as processed
   */
  private async markAsProcessed(artistId: string, artistName: string): Promise<void> {
    const artistAfter = await this.drizzle.db
      .select({ mbidSearchedAt: artists.mbidSearchedAt })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artistAfter[0]?.mbidSearchedAt) {
      await this.drizzle.db
        .update(artists)
        .set({ mbidSearchedAt: new Date(), updatedAt: new Date() })
        .where(eq(artists.id, artistId));
      this.logger.debug(`Marked artist "${artistName}" as processed (mbidSearchedAt)`);
    }
  }
}
