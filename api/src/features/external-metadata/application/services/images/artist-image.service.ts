import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '../../../infrastructure/services/storage.service';
import { getMimeType } from '@shared/utils';
import { isFileNotFoundError } from '@shared/types/error.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { eq, and, desc } from 'drizzle-orm';
import { artists, customArtistImages } from '@infrastructure/database/schema';
import { ImageCacheService, CachedImageResult } from './image-cache.service';

export type ArtistImageType = 'profile' | 'background' | 'banner' | 'logo';

/**
 * Service for retrieving artist images
 * Handles priority: Custom > Local > External
 */
@Injectable()
export class ArtistImageService {
  constructor(
    @InjectPinoLogger(ArtistImageService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly cache: ImageCacheService
  ) {}

  /**
   * Get artist image with priority Custom > Local > External
   */
  async getArtistImage(artistId: string, imageType: ArtistImageType): Promise<CachedImageResult> {
    const cacheKey = `artist:${artistId}:${imageType}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // PRIORITY 0: Custom uploaded image
    const customResult = await this.tryCustomImage(artistId, imageType);
    if (customResult) {
      this.cache.set(cacheKey, customResult);
      return customResult;
    }

    // Get artist from database
    const artist = await this.getArtist(artistId);
    if (!artist) {
      throw new NotFoundException(`Artist with ID ${artistId} not found`);
    }

    // PRIORITY 1: Local image (from artist's disk)
    const localResult = await this.tryLocalImage(artist, artistId, imageType);
    if (localResult) {
      this.cache.set(cacheKey, localResult);
      return localResult;
    }

    // PRIORITY 2: External image (downloaded from providers)
    const externalResult = await this.tryExternalImage(artist, artistId, imageType);
    if (externalResult) {
      this.cache.set(cacheKey, externalResult);
      return externalResult;
    }

    throw new NotFoundException(`No ${imageType} image for artist ${artistId}`);
  }

  /**
   * Get custom artist image by ID
   */
  async getCustomArtistImage(artistId: string, customImageId: string): Promise<CachedImageResult> {
    const cacheKey = `custom:${artistId}:${customImageId}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const imageResult = await this.drizzle.db
      .select()
      .from(customArtistImages)
      .where(
        and(eq(customArtistImages.id, customImageId), eq(customArtistImages.artistId, artistId))
      )
      .limit(1);

    const customImage = imageResult[0];
    if (!customImage) {
      throw new NotFoundException(`Custom image ${customImageId} not found for artist ${artistId}`);
    }

    try {
      const basePath = await this.storage.getArtistMetadataPath(artistId);
      const absolutePath = path.join(basePath, customImage.filePath);

      await fs.access(absolutePath);
      const stats = await fs.stat(absolutePath);
      const result: CachedImageResult = {
        filePath: absolutePath,
        mimeType: customImage.mimeType,
        size: Number(customImage.fileSize),
        lastModified: stats.mtime,
        source: 'local',
        tag: this.cache.generateTag(absolutePath, stats.mtime),
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if (isFileNotFoundError(error)) {
        throw new NotFoundException(`Custom image file not found: ${customImage.filePath}`);
      }
      throw error;
    }
  }

  /**
   * Get all available images for an artist
   */
  async getArtistImages(artistId: string): Promise<{
    profile?: CachedImageResult;
    background?: CachedImageResult;
    banner?: CachedImageResult;
    logo?: CachedImageResult;
  }> {
    const imageTypes: ArtistImageType[] = ['profile', 'background', 'banner', 'logo'];
    const results: Partial<Record<ArtistImageType, CachedImageResult>> = {};

    for (const imageType of imageTypes) {
      try {
        results[imageType] = await this.getArtistImage(artistId, imageType);
      } catch {
        this.logger.debug(`Image ${imageType} not available for artist ${artistId}`);
      }
    }

    return results;
  }

  /**
   * Check if artist has a specific image
   */
  async hasArtistImage(artistId: string, imageType: ArtistImageType): Promise<boolean> {
    try {
      await this.getArtistImage(artistId, imageType);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Try to get custom uploaded image
   */
  private async tryCustomImage(
    artistId: string,
    imageType: ArtistImageType
  ): Promise<CachedImageResult | null> {
    const result = await this.drizzle.db
      .select()
      .from(customArtistImages)
      .where(
        and(
          eq(customArtistImages.artistId, artistId),
          eq(customArtistImages.imageType, imageType),
          eq(customArtistImages.isActive, true)
        )
      )
      .orderBy(desc(customArtistImages.updatedAt))
      .limit(1);

    const customImage = result[0];
    if (!customImage) return null;

    try {
      const basePath = await this.storage.getArtistMetadataPath(artistId);
      const normalizedPath = customImage.filePath.replace(/\\/g, '/');
      const absolutePath = path.join(basePath, normalizedPath);

      await fs.access(absolutePath);
      const stats = await fs.stat(absolutePath);

      this.logger.debug(`Serving CUSTOM image: ${imageType} from ${absolutePath}`);
      return {
        filePath: absolutePath,
        mimeType: customImage.mimeType,
        size: Number(customImage.fileSize),
        lastModified: stats.mtime,
        source: 'local',
        tag: this.cache.generateTag(absolutePath, stats.mtime),
      };
    } catch {
      // Custom file no longer exists, deactivate in DB
      this.logger.warn(
        `Custom ${imageType} image not found, deactivating: ${customImage.filePath}`
      );
      await this.drizzle.db
        .update(customArtistImages)
        .set({ isActive: false })
        .where(eq(customArtistImages.id, customImage.id));
      return null;
    }
  }

  /**
   * Try to get local image from artist's disk
   */
  private async tryLocalImage(
    artist: typeof artists.$inferSelect,
    artistId: string,
    imageType: ArtistImageType
  ): Promise<CachedImageResult | null> {
    const localPath = artist[`${imageType}ImagePath`];
    if (!localPath) return null;

    try {
      await fs.access(localPath);
      const stats = await fs.stat(localPath);

      this.logger.debug(`Serving LOCAL image: ${imageType} from ${localPath}`);
      return {
        filePath: localPath,
        mimeType: getMimeType(path.extname(localPath)),
        size: stats.size,
        lastModified: stats.mtime,
        source: 'local',
        tag: this.cache.generateTag(localPath, stats.mtime),
      };
    } catch {
      this.logger.warn(`Local ${imageType} image not found, cleaning DB: ${localPath}`);
      await this.clearLocalImage(artistId, imageType);
      return null;
    }
  }

  /**
   * Try to get external image downloaded from providers
   */
  private async tryExternalImage(
    artist: typeof artists.$inferSelect,
    artistId: string,
    imageType: ArtistImageType
  ): Promise<CachedImageResult | null> {
    const capitalizedType = imageType.charAt(0).toUpperCase() + imageType.slice(1);
    const externalFilename = artist[`external${capitalizedType}Path` as keyof typeof artist] as
      | string
      | null;

    if (!externalFilename) return null;

    const fullPath = path.join(
      await this.storage.getArtistMetadataPath(artistId),
      externalFilename
    );

    try {
      await fs.access(fullPath);
      const stats = await fs.stat(fullPath);

      this.logger.debug(`Serving EXTERNAL image: ${imageType} from ${fullPath}`);
      return {
        filePath: fullPath,
        mimeType: getMimeType(path.extname(fullPath)),
        size: stats.size,
        lastModified: stats.mtime,
        source: 'external',
        tag: this.cache.generateTag(fullPath, stats.mtime),
      };
    } catch {
      this.logger.warn(`External ${imageType} image not found, cleaning DB: ${fullPath}`);
      await this.clearExternalImage(artistId, imageType);
      return null;
    }
  }

  /**
   * Get artist from database
   */
  private async getArtist(artistId: string): Promise<typeof artists.$inferSelect | null> {
    const result = await this.drizzle.db
      .select({
        id: artists.id,
        profileImagePath: artists.profileImagePath,
        backgroundImagePath: artists.backgroundImagePath,
        bannerImagePath: artists.bannerImagePath,
        logoImagePath: artists.logoImagePath,
        externalProfilePath: artists.externalProfilePath,
        externalBackgroundPath: artists.externalBackgroundPath,
        externalBannerPath: artists.externalBannerPath,
        externalLogoPath: artists.externalLogoPath,
      })
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Clear local image reference when file doesn't exist
   */
  private async clearLocalImage(artistId: string, imageType: ArtistImageType): Promise<void> {
    try {
      const fieldMappings: Record<ArtistImageType, { path: string; updatedAt: string }> = {
        profile: { path: 'profileImagePath', updatedAt: 'profileImageUpdatedAt' },
        background: { path: 'backgroundImagePath', updatedAt: 'backgroundUpdatedAt' },
        banner: { path: 'bannerImagePath', updatedAt: 'bannerUpdatedAt' },
        logo: { path: 'logoImagePath', updatedAt: 'logoUpdatedAt' },
      };

      const fields = fieldMappings[imageType];
      await this.drizzle.db
        .update(artists)
        .set({ [fields.path]: null, [fields.updatedAt]: null })
        .where(eq(artists.id, artistId));
    } catch (error) {
      this.logger.error(
        `Failed to clear local ${imageType} for ${artistId}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Clear external image reference when file doesn't exist
   */
  private async clearExternalImage(artistId: string, imageType: ArtistImageType): Promise<void> {
    try {
      const capitalizedType = imageType.charAt(0).toUpperCase() + imageType.slice(1);
      await this.drizzle.db
        .update(artists)
        .set({
          [`external${capitalizedType}Path`]: null,
          [`external${capitalizedType}Source`]: null,
          [`external${capitalizedType}UpdatedAt`]: null,
        })
        .where(eq(artists.id, artistId));
    } catch (error) {
      this.logger.error(
        `Failed to clear external ${imageType} for ${artistId}: ${(error as Error).message}`
      );
    }
  }
}
