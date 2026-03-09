import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists } from '@infrastructure/database/schema';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEventsService } from '@features/external-metadata/infrastructure/services/metadata-events.service';
import { getArtistImageTypeConfig } from '../../../domain/config/artist-image-type.config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ApplyArtistAvatarInput, ApplyArtistAvatarOutput } from './apply-artist-avatar.dto';

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
    private readonly metadataGateway: MetadataEventsService
  ) {}

  async execute(input: ApplyArtistAvatarInput): Promise<ApplyArtistAvatarOutput> {
    const artistResult = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
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
      `Applying ${input.type} image for artist: ${artist.name} from ${input.provider}`
    );

    const basePath = await this.storage.getArtistMetadataPath(input.artistId);
    const typeConfig = getArtistImageTypeConfig(input.type);
    const filename = typeConfig.filename;
    const imagePath = path.join(basePath, filename);

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

    try {
      await this.imageDownload.downloadAndSave(input.avatarUrl, imagePath);
      this.logger.info(`Downloaded image to: ${imagePath}`);
    } catch (error) {
      this.logger.error(`Failed to download image: ${(error as Error).message}`);
      throw error;
    }

    const updateData: Record<string, unknown> = {
      [typeConfig.externalPathField]: filename,
      [typeConfig.externalSourceField]: input.provider,
      [typeConfig.externalUpdatedField]: new Date(),
    };

    if (input.replaceLocal !== false) {
      updateData[typeConfig.localPathField] = null;
      updateData[typeConfig.localUpdatedField] = null;
      this.logger.debug(
        `Clearing local ${input.type} reference (replaceLocal=${input.replaceLocal ?? true})`
      );
    }

    this.logger.debug(
      `Updating artist ${input.artistId} with ${input.type} data:`,
      JSON.stringify(updateData, null, 2)
    );

    await this.drizzle.db.update(artists).set(updateData).where(eq(artists.id, input.artistId));

    this.logger.debug(`Artist updated. ${typeConfig.externalUpdatedField} is now set`);

    this.imageService.invalidateArtistCache(input.artistId);
    await this.redis.del(`artist:${input.artistId}`);

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

    const updatedAt =
      (finalArtist?.[typeConfig.externalUpdatedField as keyof typeof finalArtist] as Date) ||
      new Date();
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
