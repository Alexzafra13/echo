import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
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

    let coverPath: string;

    if (saveInFolder && album.tracks.length > 0) {
      // Save in album folder
      const albumFolder = path.dirname(album.tracks[0].path);
      coverPath = path.join(albumFolder, 'cover.jpg');
    } else {
      // Save to metadata storage
      const metadataPath = await this.storage.getAlbumMetadataPath(
        input.albumId,
      );
      coverPath = path.join(metadataPath, 'cover.jpg');
    }

    // Download the cover
    try {
      await this.imageDownload.downloadAndSave(input.coverUrl, coverPath);
      this.logger.log(`Downloaded cover to: ${coverPath}`);
    } catch (error) {
      this.logger.error(
        `Failed to download cover: ${(error as Error).message}`,
      );
      throw error;
    }

    // Update database (updatedAt will be automatically updated by Prisma)
    await this.prisma.album.update({
      where: { id: input.albumId },
      data: {
        externalCoverPath: coverPath,
        externalCoverSource: input.provider,
        externalInfoUpdatedAt: new Date(),
      },
    });

    // Invalidate server-side image cache to force reload of new cover
    this.imageService.invalidateAlbumCache(input.albumId);
    this.logger.debug(`Invalidated image cache for album ${input.albumId}`);

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
      coverPath,
    };
  }
}
