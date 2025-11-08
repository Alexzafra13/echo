import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
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
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
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

    // Delete old image if exists
    if (oldPath) {
      try {
        await fs.unlink(oldPath);
        this.logger.debug(`Deleted old image: ${oldPath}`);
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

        // Update all profile image fields
        await this.prisma.artist.update({
          where: { id: input.artistId },
          data: {
            smallImageUrl: smallPath,
            mediumImageUrl: mediumPath,
            largeImageUrl: imagePath,
            externalInfoUpdatedAt: new Date(),
            imagesUpdatedAt: new Date(), // Update version timestamp for cache busting
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to download profile variants: ${(error as Error).message}`,
        );
        // Continue anyway with large image
      }
    } else {
      // Update single field for other types
      await this.prisma.artist.update({
        where: { id: input.artistId },
        data: {
          [dbField]: imagePath,
          externalInfoUpdatedAt: new Date(),
          imagesUpdatedAt: new Date(), // Update version timestamp for cache busting
        },
      });
    }

    return {
      success: true,
      message: `${input.type} image successfully applied from ${input.provider}`,
      imagePath,
    };
  }
}
