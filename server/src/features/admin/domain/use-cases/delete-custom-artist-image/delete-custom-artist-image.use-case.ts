import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  DeleteCustomArtistImageInput,
  DeleteCustomArtistImageOutput,
} from './delete-custom-artist-image.dto';

/**
 * DeleteCustomArtistImageUseCase
 * Deletes a custom artist image from both database and disk
 */
@Injectable()
export class DeleteCustomArtistImageUseCase {
  private readonly logger = new Logger(DeleteCustomArtistImageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly redis: RedisService,
  ) {}

  async execute(input: DeleteCustomArtistImageInput): Promise<DeleteCustomArtistImageOutput> {
    // Find the custom image
    const customImage = await this.prisma.customArtistImage.findUnique({
      where: { id: input.customImageId },
      include: {
        artist: {
          select: { id: true, name: true },
        },
      },
    });

    if (!customImage) {
      throw new NotFoundException(`Custom image not found: ${input.customImageId}`);
    }

    // Validate artist ID matches
    if (customImage.artistId !== input.artistId) {
      throw new BadRequestException('Artist ID mismatch');
    }

    this.logger.log(
      `Deleting custom ${customImage.imageType} image for artist: ${customImage.artist.name} (ID: ${input.customImageId})`,
    );

    // Get full path to the image file
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);
    const fullPath = path.join(basePath, customImage.filePath);

    // Delete the physical file
    try {
      await fs.unlink(fullPath);
      this.logger.debug(`Deleted file: ${fullPath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${fullPath}: ${(error as Error).message}`);
      // Continue even if file deletion fails - might not exist
    }

    // If this was the active image, we need to update the artist record
    if (customImage.isActive) {
      const typeConfig = this.getTypeConfig(customImage.imageType);

      await this.prisma.artist.update({
        where: { id: input.artistId },
        data: {
          [typeConfig.localPathField]: null,
          [typeConfig.localUpdatedField]: null,
        },
      });

      this.logger.debug(`Cleared active ${customImage.imageType} reference from artist`);

      // Invalidate caches
      this.imageService.invalidateArtistCache(input.artistId);
      await this.redis.del(`artist:${input.artistId}`);
    }

    // Delete from database
    await this.prisma.customArtistImage.delete({
      where: { id: input.customImageId },
    });

    this.logger.log(
      `✅ Successfully deleted custom ${customImage.imageType} image for ${customImage.artist.name}`,
    );

    return {
      success: true,
      message: `Custom ${customImage.imageType} image deleted successfully`,
    };
  }

  /**
   * Get field names for each image type
   */
  private getTypeConfig(type: string): {
    localPathField: string;
    localUpdatedField: string;
  } {
    const configs: Record<string, {
      localPathField: string;
      localUpdatedField: string;
    }> = {
      profile: {
        localPathField: 'profileImagePath',
        localUpdatedField: 'profileImageUpdatedAt',
      },
      background: {
        localPathField: 'backgroundImagePath',
        localUpdatedField: 'backgroundUpdatedAt',
      },
      banner: {
        localPathField: 'bannerImagePath',
        localUpdatedField: 'bannerUpdatedAt',
      },
      logo: {
        localPathField: 'logoImagePath',
        localUpdatedField: 'logoUpdatedAt',
      },
    };

    return configs[type] || configs.profile;
  }
}
