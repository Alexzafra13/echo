import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
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
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
    private readonly settings: SettingsService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: ApplyAlbumCoverInput): Promise<ApplyAlbumCoverOutput> {
    // Get album from database
    const album = await this.prisma.album.findUnique({
      where: { id: input.albumId },
      include: {
        tracks: {
          take: 1,
          select: { path: true },
        },
      },
    });

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    this.logger.log(
      `Applying cover for album: ${album.name} from ${input.provider}`,
    );

    // Delete old external cover if exists
    if (album.externalCoverPath) {
      try {
        await fs.unlink(album.externalCoverPath);
        this.logger.debug(`Deleted old cover: ${album.externalCoverPath}`);
      } catch (error) {
        this.logger.warn(
          `Failed to delete old cover: ${(error as Error).message}`,
        );
      }
    }

    // Determine where to save the cover
    const saveInFolder = await this.settings.getBoolean(
      'metadata.download.save_in_album_folder',
      true,
    );

    let targetFolder: string;

    if (saveInFolder && album.tracks.length > 0) {
      // Save in album folder
      targetFolder = path.dirname(album.tracks[0].path);
    } else {
      // Save to metadata storage
      targetFolder = await this.storage.getAlbumMetadataPath(input.albumId);
    }

    // Download to temporary path first
    const tempPath = path.join(targetFolder, `cover-temp-${Date.now()}.jpg`);

    try {
      await this.imageDownload.downloadAndSave(input.coverUrl, tempPath);
      this.logger.debug(`Downloaded cover to temp path: ${tempPath}`);

      // Get image dimensions using probe-image-size
      const dimensions = await this.imageDownload.getImageDimensionsFromFile(tempPath);

      if (!dimensions) {
        throw new Error('Failed to detect image dimensions');
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
      try {
        await fs.access(coverPath);
        await fs.unlink(coverPath);
        this.logger.debug(`Deleted existing cover with same dimensions: ${coverPath}`);
      } catch (error) {
        // File doesn't exist, which is fine
      }

      // Rename temp file to final name
      await fs.rename(tempPath, coverPath);
      this.logger.log(`Saved cover to: ${coverPath} (${width}x${height})`);

      // Store the final path for database update
      const finalCoverPath = coverPath;
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      this.logger.error(
        `Failed to download or process cover: ${(error as Error).message}`,
      );
      throw error;
    }

    // Update database (updatedAt will be automatically updated by Prisma)
    await this.prisma.album.update({
      where: { id: input.albumId },
      data: {
        externalCoverPath: finalCoverPath,
        externalCoverSource: input.provider,
        externalInfoUpdatedAt: new Date(),
      },
    });

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
    const finalAlbum = await this.prisma.album.findUnique({
      where: { id: input.albumId },
      select: {
        id: true,
        name: true,
        artistId: true,
        externalInfoUpdatedAt: true,
      },
    });

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
