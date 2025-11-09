import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  ApplyArtistAvatarInput,
  ApplyArtistAvatarOutput,
} from './apply-artist-avatar.dto';

/**
 * ApplyArtistAvatarUseCase
 * Downloads and applies a selected artist image (profile, background, banner, or logo)
 */
@Injectable()
export class ApplyArtistAvatarUseCase {
  private readonly logger = new Logger(ApplyArtistAvatarUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: ApplyArtistAvatarInput): Promise<ApplyArtistAvatarOutput> {
    // Get artist from database
    const artist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
    });

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    this.logger.log(
      `Applying ${input.type} image for artist: ${artist.name} from ${input.provider}`,
    );

    // Get storage path for artist
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);

    // Determine filename and field to update based on type
    let filename: string;
    let dbField: string;
    let oldPath: string | null = null;

    switch (input.type) {
      case 'profile':
        filename = 'profile-large.jpg';
        dbField = 'largeImageUrl';
        oldPath = artist.largeImageUrl;
        break;
      case 'background':
        filename = 'background.jpg';
        dbField = 'backgroundImageUrl';
        oldPath = artist.backgroundImageUrl;
        break;
      case 'banner':
        filename = 'banner.png';
        dbField = 'bannerImageUrl';
        oldPath = artist.bannerImageUrl;
        break;
      case 'logo':
        filename = 'logo.png';
        dbField = 'logoImageUrl';
        oldPath = artist.logoImageUrl;
        break;
      default:
        throw new BadRequestException(`Invalid image type: ${input.type}`);
    }

    const imagePath = path.join(basePath, filename);

    // Delete old image if exists (need to construct full path from DB value)
    if (oldPath) {
      try {
        // If oldPath is just a filename, construct full path
        const fullOldPath = oldPath.includes(path.sep) ? oldPath : path.join(basePath, oldPath);
        await fs.unlink(fullOldPath);
        this.logger.debug(`Deleted old image: ${fullOldPath}`);
      } catch (error) {
        this.logger.warn(
          `Failed to delete old image: ${(error as Error).message}`,
        );
      }
    }

    // Download the new image
    try {
      await this.imageDownload.downloadAndSave(input.avatarUrl, imagePath);
      this.logger.log(`Downloaded image to: ${imagePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to download image: ${(error as Error).message}`,
      );
      throw error;
    }

    // For profile images, also download smaller sizes
    if (input.type === 'profile') {
      try {
        // Download small
        const smallPath = path.join(basePath, 'profile-small.jpg');
        await this.imageDownload.downloadAndSave(input.avatarUrl, smallPath);

        // Download medium
        const mediumPath = path.join(basePath, 'profile-medium.jpg');
        await this.imageDownload.downloadAndSave(input.avatarUrl, mediumPath);

        // Store only filenames in DB (not full paths) - service will construct full path dynamically
        const updateData = {
          smallImageUrl: 'profile-small.jpg',
          mediumImageUrl: 'profile-medium.jpg',
          largeImageUrl: filename,
          externalInfoUpdatedAt: new Date(),
        };
        this.logger.debug(`Updating artist ${input.artistId} with profile data:`, JSON.stringify(updateData));

        const updatedArtist = await this.prisma.artist.update({
          where: { id: input.artistId },
          data: updateData,
        });

        this.logger.debug(`Artist updated. externalInfoUpdatedAt is now: ${updatedArtist.externalInfoUpdatedAt}`);
      } catch (error) {
        this.logger.warn(
          `Failed to download profile variants: ${(error as Error).message}`,
        );
        // Continue anyway with large image
      }
    } else {
      // Store only filename in DB (not full path) - service will construct full path dynamically
      const updateData = {
        [dbField]: filename,
        externalInfoUpdatedAt: new Date(),
      };
      this.logger.debug(`Updating artist ${input.artistId} with data:`, JSON.stringify(updateData));

      const updatedArtist = await this.prisma.artist.update({
        where: { id: input.artistId },
        data: updateData,
      });

      this.logger.debug(`Artist updated. externalInfoUpdatedAt is now: ${updatedArtist.externalInfoUpdatedAt}`);
    }

    // Invalidate server-side image cache to force reload of new images
    this.imageService.invalidateArtistCache(input.artistId);
    this.logger.debug(`Invalidated image cache for artist ${input.artistId}`);

    // CRITICAL: Invalidate Redis cache to ensure GET /artists/:id returns fresh data
    const redisCacheKey = `artist:${input.artistId}`;
    await this.redis.del(redisCacheKey);
    this.logger.debug(`Invalidated Redis cache for key: ${redisCacheKey}`);

    // Get updated artist data to return and for WebSocket notification
    const finalArtist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
    });

    // Emit WebSocket event to notify all connected clients about the update
    this.metadataGateway.emitArtistImagesUpdated({
      artistId: input.artistId,
      artistName: artist.name,
      imageType: input.type,
      updatedAt: finalArtist?.externalInfoUpdatedAt || new Date(),
    });

    return {
      success: true,
      message: `${input.type} image successfully applied from ${input.provider}`,
      imagePath,
    };
  }
}
