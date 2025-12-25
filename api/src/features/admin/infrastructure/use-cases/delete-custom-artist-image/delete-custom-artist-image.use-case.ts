import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists, customArtistImages } from '@infrastructure/database/schema';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { getArtistImageTypeBasicConfig } from '../../../domain/config/artist-image-type.config';
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
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly redis: RedisService,
  ) {}

  async execute(input: DeleteCustomArtistImageInput): Promise<DeleteCustomArtistImageOutput> {
    // Find the custom image
    const customImageResult = await this.drizzle.db
      .select({
        id: customArtistImages.id,
        artistId: customArtistImages.artistId,
        imageType: customArtistImages.imageType,
        filePath: customArtistImages.filePath,
        isActive: customArtistImages.isActive,
        artist: {
          id: artists.id,
          name: artists.name,
        },
      })
      .from(customArtistImages)
      .innerJoin(artists, eq(customArtistImages.artistId, artists.id))
      .where(eq(customArtistImages.id, input.customImageId))
      .limit(1);

    const customImage = customImageResult[0];

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
      const typeConfig = getArtistImageTypeBasicConfig(customImage.imageType);

      await this.drizzle.db
        .update(artists)
        .set({
          [typeConfig.localPathField]: null,
          [typeConfig.localUpdatedField]: null,
        })
        .where(eq(artists.id, input.artistId));

      this.logger.debug(`Cleared active ${customImage.imageType} reference from artist`);

      // Invalidate caches
      this.imageService.invalidateArtistCache(input.artistId);
      await this.redis.del(`artist:${input.artistId}`);
    }

    // Delete from database
    await this.drizzle.db
      .delete(customArtistImages)
      .where(eq(customArtistImages.id, input.customImageId));

    this.logger.log(
      `✅ Successfully deleted custom ${customImage.imageType} image for ${customImage.artist.name}`,
    );

    return {
      success: true,
      message: `Custom ${customImage.imageType} image deleted successfully`,
    };
  }
}
