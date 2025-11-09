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
 * ApplyArtistAvatarUseCase V2
 * Downloads and applies a selected artist image using new architecture
 *
 * Changes in V2:
 * - Uses new schema fields (externalProfilePath, externalBackgroundPath, etc.)
 * - Per-image timestamps (externalProfileUpdatedAt, etc.)
 * - Optional replaceLocal flag to clear local image references
 * - Single profile image (no more small/medium/large variants)
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
      select: {
        id: true,
        name: true,
        // Old external paths (for deletion)
        externalProfilePath: true,
        externalBackgroundPath: true,
        externalBannerPath: true,
        externalLogoPath: true,
      },
    });

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    this.logger.log(
      `Applying ${input.type} image for artist: ${artist.name} from ${input.provider}`,
    );

    // Get storage path for artist
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);

    // Determine filename and fields based on type
    const typeConfig = this.getTypeConfig(input.type);
    const filename = typeConfig.filename;
    const imagePath = path.join(basePath, filename);

    // Delete old EXTERNAL image if exists
    const oldPath = artist[typeConfig.oldPathField];
    if (oldPath) {
      try {
        const fullOldPath = path.join(basePath, oldPath);
        await fs.unlink(fullOldPath);
        this.logger.debug(`Deleted old external image: ${fullOldPath}`);
      } catch (error) {
        this.logger.warn(`Failed to delete old image: ${(error as Error).message}`);
      }
    }

    // Download the new image
    try {
      await this.imageDownload.downloadAndSave(input.avatarUrl, imagePath);
      this.logger.log(`Downloaded image to: ${imagePath}`);
    } catch (error) {
      this.logger.error(`Failed to download image: ${(error as Error).message}`);
      throw error;
    }

    // Build update data for new schema
    const updateData: any = {
      [typeConfig.externalPathField]: filename,
      [typeConfig.externalSourceField]: input.provider,
      [typeConfig.externalUpdatedField]: new Date(),
    };

    // Optional: Clear local image reference (user explicitly wants to replace local with external)
    if (input.replaceLocal !== false) {  // Default to true if not specified
      updateData[typeConfig.localPathField] = null;
      updateData[typeConfig.localUpdatedField] = null;
      this.logger.debug(`Clearing local ${input.type} reference (replaceLocal=${input.replaceLocal !== false})`);
    }

    this.logger.debug(
      `Updating artist ${input.artistId} with ${input.type} data:`,
      JSON.stringify(updateData, null, 2)
    );

    const updatedArtist = await this.prisma.artist.update({
      where: { id: input.artistId },
      data: updateData,
    });

    this.logger.debug(
      `Artist updated. ${typeConfig.externalUpdatedField} is now: ${updatedArtist[typeConfig.externalUpdatedField]}`
    );

    // Invalidate server-side image cache
    this.imageService.invalidateArtistCache(input.artistId);
    this.logger.debug(`Invalidated image cache for artist ${input.artistId}`);

    // Invalidate Redis cache
    const redisCacheKey = `artist:${input.artistId}`;
    await this.redis.del(redisCacheKey);
    this.logger.debug(`Invalidated Redis cache for key: ${redisCacheKey}`);

    // Get updated artist for WebSocket notification
    const finalArtist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
      select: {
        externalProfileUpdatedAt: true,
        externalBackgroundUpdatedAt: true,
        externalBannerUpdatedAt: true,
        externalLogoUpdatedAt: true,
      },
    });

    // Emit WebSocket event
    const updatedAt = finalArtist?.[typeConfig.externalUpdatedField] || new Date();
    this.metadataGateway.emitArtistImagesUpdated({
      artistId: input.artistId,
      artistName: artist.name,
      imageType: input.type,
      updatedAt,
    });

    this.logger.log(
      `✅ Successfully applied ${input.type} image for ${artist.name} (tag will change with new timestamp)`
    );

    return {
      success: true,
      message: `${input.type} image successfully applied from ${input.provider}`,
      imagePath,
    };
  }

  /**
   * Get configuration for each image type (V2 schema fields)
   */
  private getTypeConfig(type: string) {
    const configs = {
      profile: {
        filename: 'profile.jpg',
        localPathField: 'profileImagePath',
        localUpdatedField: 'profileImageUpdatedAt',
        externalPathField: 'externalProfilePath',
        externalSourceField: 'externalProfileSource',
        externalUpdatedField: 'externalProfileUpdatedAt',
        oldPathField: 'externalProfilePath',
      },
      background: {
        filename: 'background.jpg',
        localPathField: 'backgroundImagePath',
        localUpdatedField: 'backgroundUpdatedAt',
        externalPathField: 'externalBackgroundPath',
        externalSourceField: 'externalBackgroundSource',
        externalUpdatedField: 'externalBackgroundUpdatedAt',
        oldPathField: 'externalBackgroundPath',
      },
      banner: {
        filename: 'banner.png',
        localPathField: 'bannerImagePath',
        localUpdatedField: 'bannerUpdatedAt',
        externalPathField: 'externalBannerPath',
        externalSourceField: 'externalBannerSource',
        externalUpdatedField: 'externalBannerUpdatedAt',
        oldPathField: 'externalBannerPath',
      },
      logo: {
        filename: 'logo.png',
        localPathField: 'logoImagePath',
        localUpdatedField: 'logoUpdatedAt',
        externalPathField: 'externalLogoPath',
        externalSourceField: 'externalLogoSource',
        externalUpdatedField: 'externalLogoUpdatedAt',
        oldPathField: 'externalLogoPath',
      },
    };

    const config = configs[type];
    if (!config) {
      throw new BadRequestException(`Invalid image type: ${type}`);
    }

    return config;
  }
}
