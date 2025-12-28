import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists } from '@infrastructure/database/schema';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import { getArtistImageTypeConfig } from '../../../domain/config/artist-image-type.config';
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
  constructor(
    @InjectPinoLogger(ApplyArtistAvatarUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: ApplyArtistAvatarInput): Promise<ApplyArtistAvatarOutput> {
    // Get artist from database
    const artistResult = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
        // Old external paths (for deletion)
        externalProfilePath: artists.externalProfilePath,
        externalBackgroundPath: artists.externalBackgroundPath,
        externalBannerPath: artists.externalBannerPath,
        externalLogoPath: artists.externalLogoPath,
      })
      .from(artists)
      .where(eq(artists.id, input.artistId))
      .limit(1);

    const artist = artistResult[0];

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    this.logger.info(
      `Applying ${input.type} image for artist: ${artist.name} from ${input.provider}`,
    );

    // Get storage path for artist
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);

    // Determine filename and fields based on type
    const typeConfig = getArtistImageTypeConfig(input.type);
    const filename = typeConfig.filename;
    const imagePath = path.join(basePath, filename);

    // Delete old EXTERNAL image if exists
    const oldPath = artist[typeConfig.oldPathField as keyof typeof artist] as string | null;
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
      this.logger.info(`Downloaded image to: ${imagePath}`);
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
      this.logger.debug(`Clearing local ${input.type} reference (replaceLocal=${input.replaceLocal ?? true})`);
    }

    this.logger.debug(
      `Updating artist ${input.artistId} with ${input.type} data:`,
      JSON.stringify(updateData, null, 2)
    );

    await this.drizzle.db
      .update(artists)
      .set(updateData)
      .where(eq(artists.id, input.artistId));

    this.logger.debug(
      `Artist updated. ${typeConfig.externalUpdatedField} is now set`
    );

    // Invalidate server-side image cache
    this.imageService.invalidateArtistCache(input.artistId);
    this.logger.debug(`Invalidated image cache for artist ${input.artistId}`);

    // Invalidate Redis cache
    const redisCacheKey = `artist:${input.artistId}`;
    await this.redis.del(redisCacheKey);
    this.logger.debug(`Invalidated Redis cache for key: ${redisCacheKey}`);

    // Get updated artist for WebSocket notification
    const finalArtistResult = await this.drizzle.db
      .select({
        externalProfileUpdatedAt: artists.externalProfileUpdatedAt,
        externalBackgroundUpdatedAt: artists.externalBackgroundUpdatedAt,
        externalBannerUpdatedAt: artists.externalBannerUpdatedAt,
        externalLogoUpdatedAt: artists.externalLogoUpdatedAt,
      })
      .from(artists)
      .where(eq(artists.id, input.artistId))
      .limit(1);

    const finalArtist = finalArtistResult[0];

    // Emit WebSocket event
    const updatedAt = (finalArtist?.[typeConfig.externalUpdatedField as keyof typeof finalArtist] as Date) || new Date();
    this.metadataGateway.emitArtistImagesUpdated({
      artistId: input.artistId,
      artistName: artist.name,
      imageType: input.type,
      updatedAt,
    });

    this.logger.info(
      `✅ Successfully applied ${input.type} image for ${artist.name} (tag will change with new timestamp)`
    );

    return {
      success: true,
      message: `${input.type} image successfully applied from ${input.provider}`,
      imagePath,
    };
  }
}
