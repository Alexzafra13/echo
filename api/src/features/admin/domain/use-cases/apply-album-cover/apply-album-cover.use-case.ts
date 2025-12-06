import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { albums } from '@infrastructure/database/schema';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import { ImageProcessingError } from '@shared/errors';
import { safeDeleteFile, fileExists } from '@shared/utils';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  ApplyAlbumCoverInput,
  ApplyAlbumCoverOutput,
} from './apply-album-cover.dto';

/**
 * ApplyAlbumCoverUseCase
 * Downloads and applies a selected album cover from a provider
 */
@Injectable()
export class ApplyAlbumCoverUseCase {
  private readonly logger = new Logger(ApplyAlbumCoverUseCase.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: ApplyAlbumCoverInput): Promise<ApplyAlbumCoverOutput> {
    // Get album from database
    const albumResult = await this.drizzle.db
      .select()
      .from(albums)
      .where(eq(albums.id, input.albumId))
      .limit(1);

    const album = albumResult[0];

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    this.logger.log(
      `Applying cover for album: ${album.name} from ${input.provider}`,
    );

    // Delete old external cover if exists
    await safeDeleteFile(album.externalCoverPath, 'old cover');

    // Always save to metadata storage (not music folder) for security
    // Music folder should remain read-only to prevent accidental modifications
    const targetFolder = await this.storage.getAlbumMetadataPath(input.albumId);

    // Download to temporary path first
    const tempPath = path.join(targetFolder, `cover-temp-${Date.now()}.jpg`);
    let finalCoverPath: string;

    try {
      await this.imageDownload.downloadAndSave(input.coverUrl, tempPath);
      this.logger.debug(`Downloaded cover to temp path: ${tempPath}`);

      // Get image dimensions using probe-image-size
      const dimensions = await this.imageDownload.getImageDimensionsFromFile(tempPath);

      if (!dimensions) {
        throw new ImageProcessingError('INVALID_DIMENSIONS');
      }

      const width = dimensions.width;
      const height = dimensions.height;

      this.logger.log(
        `Cover dimensions: ${width}x${height}`,
      );

      // Generate final filename with dimensions
      const finalFilename = `cover-${width}x${height}.jpg`;
      const coverPath = path.join(targetFolder, finalFilename);

      // If a cover with these exact dimensions already exists, delete it
      if (await fileExists(coverPath)) {
        await safeDeleteFile(coverPath, 'existing cover with same dimensions');
      }

      // Rename temp file to final name
      await fs.rename(tempPath, coverPath);
      this.logger.log(`Saved cover to: ${coverPath} (${width}x${height})`);

      // Store the final path for database update
      finalCoverPath = coverPath;
    } catch (error) {
      // Clean up temp file on error
      await safeDeleteFile(tempPath, 'temp file cleanup');

      this.logger.error(
        `Failed to download or process cover: ${(error as Error).message}`,
      );
      throw error;
    }

    // Update database
    await this.drizzle.db
      .update(albums)
      .set({
        externalCoverPath: finalCoverPath,
        externalCoverSource: input.provider,
        externalInfoUpdatedAt: new Date(),
      })
      .where(eq(albums.id, input.albumId));

    // Invalidate server-side image cache to force reload of new cover
    this.imageService.invalidateAlbumCache(input.albumId);
    this.logger.debug(`Invalidated image cache for album ${input.albumId}`);

    // CRITICAL: Invalidate Redis cache to ensure GET requests return fresh data
    const albumCacheKey = `album:${input.albumId}`;
    await this.redis.del(albumCacheKey);
    this.logger.debug(`Invalidated Redis cache for key: ${albumCacheKey}`);

    // Also invalidate artist cache if album has artistId (artist queries may reference album data)
    if (album.artistId) {
      const artistCacheKey = `artist:${album.artistId}`;
      await this.redis.del(artistCacheKey);
      this.logger.debug(`Invalidated Redis cache for key: ${artistCacheKey}`);
    }

    // Get updated album data for WebSocket notification
    const finalAlbumResult = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        externalInfoUpdatedAt: albums.externalInfoUpdatedAt,
      })
      .from(albums)
      .where(eq(albums.id, input.albumId))
      .limit(1);

    const finalAlbum = finalAlbumResult[0];

    // Emit WebSocket event to notify all connected clients about the update
    if (finalAlbum && finalAlbum.artistId) {
      this.metadataGateway.emitAlbumCoverUpdated({
        albumId: input.albumId,
        albumName: album.name,
        artistId: finalAlbum.artistId,
        updatedAt: finalAlbum.externalInfoUpdatedAt || new Date(),
      });
    }

    return {
      success: true,
      message: `Cover successfully applied from ${input.provider}`,
      coverPath: finalCoverPath,
    };
  }
}
