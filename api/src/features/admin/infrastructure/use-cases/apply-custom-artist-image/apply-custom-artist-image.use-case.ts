import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and } from 'drizzle-orm';
import { artists, customArtistImages } from '@infrastructure/database/schema';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import { getArtistImageTypeBasicConfig } from '../../../domain/config/artist-image-type.config';
import {
  ApplyCustomArtistImageInput,
  ApplyCustomArtistImageOutput,
} from './apply-custom-artist-image.dto';

/**
 * ApplyCustomArtistImageUseCase
 * Applies a custom uploaded image as the artist's active image for that type
 */
@Injectable()
export class ApplyCustomArtistImageUseCase {
  constructor(
    @InjectPinoLogger(ApplyCustomArtistImageUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: ApplyCustomArtistImageInput): Promise<ApplyCustomArtistImageOutput> {
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

    this.logger.info(
      `Applying custom ${customImage.imageType} image for artist: ${customImage.artist.name}`,
    );

    const typeConfig = getArtistImageTypeBasicConfig(customImage.imageType);

    // Start a transaction to update both the artist and custom images
    await this.drizzle.db.transaction(async (tx) => {
      // Deactivate all other custom images of this type for this artist
      await tx
        .update(customArtistImages)
        .set({ isActive: false })
        .where(
          and(
            eq(customArtistImages.artistId, input.artistId),
            eq(customArtistImages.imageType, customImage.imageType),
            eq(customArtistImages.isActive, true),
          ),
        );

      // Activate this custom image
      await tx
        .update(customArtistImages)
        .set({ isActive: true })
        .where(eq(customArtistImages.id, input.customImageId));

      // Update artist record to use this custom image (local path)
      const updateData: any = {
        [typeConfig.localPathField]: customImage.filePath,
        [typeConfig.localUpdatedField]: new Date(),
        // Clear external image references (custom takes precedence)
        [typeConfig.externalPathField]: null,
        [typeConfig.externalSourceField]: null,
        [typeConfig.externalUpdatedField]: null,
      };

      await tx
        .update(artists)
        .set(updateData)
        .where(eq(artists.id, input.artistId));
    });

    // Invalidate caches
    this.imageService.invalidateArtistCache(input.artistId);
    await this.redis.del(`artist:${input.artistId}`);

    // Emit WebSocket event
    this.metadataGateway.emitArtistImagesUpdated({
      artistId: input.artistId,
      artistName: customImage.artist.name,
      imageType: customImage.imageType as any,
      updatedAt: new Date(),
    });

    this.logger.info(
      `✅ Successfully applied custom ${customImage.imageType} image for ${customImage.artist.name}`,
    );

    return {
      success: true,
      message: `Custom ${customImage.imageType} image applied successfully`,
      imageType: customImage.imageType,
    };
  }
}
