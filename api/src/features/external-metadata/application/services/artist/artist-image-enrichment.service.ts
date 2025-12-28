import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists } from '@infrastructure/database/schema';
import { IArtistImageRetriever } from '../../../domain/interfaces';
import { ArtistImages } from '../../../domain/entities';
import { AgentRegistryService } from '../../../infrastructure/services/agent-registry.service';
import { MetadataCacheService } from '../../../infrastructure/services/metadata-cache.service';
import { StorageService } from '../../../infrastructure/services/storage.service';
import { ImageDownloadService } from '../../../infrastructure/services/image-download.service';
import { EnrichmentLogService } from '../enrichment-log.service';

export interface ImageDownloadResult {
  profileUrl: string | null;
  backgroundUrl: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  totalSize: number;
}

export interface ImageEnrichmentResult {
  updated: boolean;
  totalSize: number;
  source?: string;
}

/**
 * Service for enriching artist images
 * Handles image retrieval from agents, downloading, and storage
 */
@Injectable()
export class ArtistImageEnrichmentService {
  constructor(
    @InjectPinoLogger(ArtistImageEnrichmentService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly cache: MetadataCacheService,
    private readonly storage: StorageService,
    private readonly imageDownload: ImageDownloadService,
    private readonly enrichmentLog: EnrichmentLogService,
  ) {}

  /**
   * Enrich artist images
   */
  async enrichImages(
    artistId: string,
    artist: {
      name: string;
      mbzArtistId: string | null;
      externalProfilePath?: string | null;
      externalBackgroundPath?: string | null;
      externalBannerPath?: string | null;
      externalLogoPath?: string | null;
    },
    forceRefresh: boolean,
    startTime: number,
  ): Promise<ImageEnrichmentResult> {
    const needsImages =
      forceRefresh ||
      !artist.externalProfilePath ||
      !artist.externalBackgroundPath ||
      !artist.externalBannerPath ||
      !artist.externalLogoPath;

    if (!needsImages) return { updated: false, totalSize: 0 };

    const images = await this.getArtistImages(artist.mbzArtistId, artist.name, forceRefresh, artistId);
    if (!images) return { updated: false, totalSize: 0 };

    const localPaths = await this.downloadArtistImages(artistId, images);

    const updateData = this.buildUpdateData(artist, localPaths, images.source, forceRefresh);

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

      this.logger.info(`Updated images for: ${artist.name} (${localPaths.totalSize} bytes)`);
      return { updated: true, totalSize: localPaths.totalSize, source: images.source };
    }

    return { updated: false, totalSize: 0 };
  }

  /**
   * Get artist images using agent chain
   */
  async getArtistImages(
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
          mergedImages = this.mergeImages(mergedImages, images);

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
   * Merge images from multiple sources
   */
  private mergeImages(current: ArtistImages | null, incoming: ArtistImages): ArtistImages {
    if (!current) return incoming;

    return new ArtistImages(
      current.smallUrl || incoming.smallUrl,
      current.mediumUrl || incoming.mediumUrl,
      current.largeUrl || incoming.largeUrl,
      current.backgroundUrl || incoming.backgroundUrl,
      current.bannerUrl || incoming.bannerUrl,
      current.logoUrl || incoming.logoUrl,
      `${current.source},${incoming.source}`
    );
  }

  /**
   * Download artist images and save locally
   */
  async downloadArtistImages(artistId: string, images: ArtistImages): Promise<ImageDownloadResult> {
    const basePath = await this.storage.getArtistMetadataPath(artistId);
    let totalSize = 0;

    const result: ImageDownloadResult = {
      profileUrl: null,
      backgroundUrl: null,
      bannerUrl: null,
      logoUrl: null,
      totalSize: 0,
    };

    // Download profile image
    const profileUrl = images.largeUrl || images.mediumUrl || images.smallUrl;
    if (profileUrl) {
      const downloaded = await this.downloadImage(profileUrl, basePath, 'profile.jpg');
      if (downloaded) {
        result.profileUrl = 'profile.jpg';
        totalSize += downloaded.size;
      }
    }

    // Download background image
    if (images.backgroundUrl) {
      const downloaded = await this.downloadImage(images.backgroundUrl, basePath, 'background.jpg');
      if (downloaded) {
        result.backgroundUrl = 'background.jpg';
        totalSize += downloaded.size;
      }
    }

    // Download banner image
    if (images.bannerUrl) {
      const downloaded = await this.downloadImage(images.bannerUrl, basePath, 'banner.png');
      if (downloaded) {
        result.bannerUrl = 'banner.png';
        totalSize += downloaded.size;
      }
    }

    // Download logo image
    if (images.logoUrl) {
      const downloaded = await this.downloadImage(images.logoUrl, basePath, 'logo.png');
      if (downloaded) {
        result.logoUrl = 'logo.png';
        totalSize += downloaded.size;
      }
    }

    result.totalSize = totalSize;
    return result;
  }

  /**
   * Download a single image
   */
  private async downloadImage(
    url: string,
    basePath: string,
    filename: string
  ): Promise<{ size: number } | null> {
    try {
      const filePath = path.join(basePath, filename);
      await this.imageDownload.downloadAndSave(url, filePath);
      const size = await this.storage.getFileSize(filePath);
      return { size };
    } catch (error) {
      this.logger.warn(`Failed to download ${filename}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Build update data for database
   */
  private buildUpdateData(
    artist: {
      externalProfilePath?: string | null;
      externalBackgroundPath?: string | null;
      externalBannerPath?: string | null;
      externalLogoPath?: string | null;
    },
    localPaths: ImageDownloadResult,
    source: string,
    forceRefresh: boolean
  ): Record<string, any> {
    const updateData: Record<string, any> = {};
    const now = new Date();

    if ((forceRefresh || !artist.externalProfilePath) && localPaths.profileUrl) {
      updateData.externalProfilePath = localPaths.profileUrl;
      updateData.externalProfileSource = source;
      updateData.externalProfileUpdatedAt = now;
    }

    if ((forceRefresh || !artist.externalBackgroundPath) && localPaths.backgroundUrl) {
      updateData.externalBackgroundPath = localPaths.backgroundUrl;
      updateData.externalBackgroundSource = source;
      updateData.externalBackgroundUpdatedAt = now;
    }

    if ((forceRefresh || !artist.externalBannerPath) && localPaths.bannerUrl) {
      updateData.externalBannerPath = localPaths.bannerUrl;
      updateData.externalBannerSource = source;
      updateData.externalBannerUpdatedAt = now;
    }

    if ((forceRefresh || !artist.externalLogoPath) && localPaths.logoUrl) {
      updateData.externalLogoPath = localPaths.logoUrl;
      updateData.externalLogoSource = source;
      updateData.externalLogoUpdatedAt = now;
    }

    if (localPaths.totalSize > 0) {
      updateData.metadataStorageSize = localPaths.totalSize;
    }

    return updateData;
  }
}
