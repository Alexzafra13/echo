import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { albums } from '@infrastructure/database/schema';
import { RedisService } from '@infrastructure/cache/redis.service';
import { ImageDownloadService } from '@features/external-metadata/infrastructure/services/image-download.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEventsService } from '@features/external-metadata/infrastructure/services/metadata-events.service';
import { ImageProcessingError } from '@shared/errors';
import { safeDeleteFile, fileExists } from '@shared/utils';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  ApplyAlbumCoverInput,
  ApplyAlbumCoverOutput,
} from './apply-album-cover.dto';

@Injectable()
export class ApplyAlbumCoverUseCase {
  constructor(
    @InjectPinoLogger(ApplyAlbumCoverUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEventsService,
  ) {}

  async execute(input: ApplyAlbumCoverInput): Promise<ApplyAlbumCoverOutput> {
    const albumResult = await this.drizzle.db
      .select()
      .from(albums)
      .where(eq(albums.id, input.albumId))
      .limit(1);

    const album = albumResult[0];

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    this.logger.info(
      `Applying cover for album: ${album.name} from ${input.provider}`,
    );

    await safeDeleteFile(album.externalCoverPath, 'old cover');

    // Se guarda en metadata storage para no modificar la carpeta de música
    const targetFolder = await this.storage.getAlbumMetadataPath(input.albumId);
    const tempPath = path.join(targetFolder, `cover-temp-${Date.now()}.jpg`);
    let finalCoverPath: string;

    try {
      await this.imageDownload.downloadAndSave(input.coverUrl, tempPath);
      this.logger.debug(`Downloaded cover to temp path: ${tempPath}`);

      const dimensions = await this.imageDownload.getImageDimensionsFromFile(tempPath);

      if (!dimensions) {
        throw new ImageProcessingError('INVALID_DIMENSIONS');
      }

      const width = dimensions.width;
      const height = dimensions.height;

      this.logger.info(
        `Cover dimensions: ${width}x${height}`,
      );

      const finalFilename = `cover-${width}x${height}.jpg`;
      const coverPath = path.join(targetFolder, finalFilename);

      if (await fileExists(coverPath)) {
        await safeDeleteFile(coverPath, 'existing cover with same dimensions');
      }

      await fs.rename(tempPath, coverPath);
      this.logger.info(`Saved cover to: ${coverPath} (${width}x${height})`);

      finalCoverPath = coverPath;
    } catch (error) {
      await safeDeleteFile(tempPath, 'temp file cleanup');

      this.logger.error(
        `Failed to download or process cover: ${(error as Error).message}`,
      );
      throw error;
    }

    await this.drizzle.db
      .update(albums)
      .set({
        externalCoverPath: finalCoverPath,
        externalCoverSource: input.provider,
        externalInfoUpdatedAt: new Date(),
      })
      .where(eq(albums.id, input.albumId));

    this.imageService.invalidateAlbumCache(input.albumId);

    const albumCacheKey = `album:${input.albumId}`;
    await this.redis.del(albumCacheKey);

    if (album.artistId) {
      await this.redis.del(`artist:${album.artistId}`);
    }

    const finalAlbumResult = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        externalInfoUpdatedAt: albums.externalInfoUpdatedAt,
      })
      .from(albums)
      .where(eq(albums.id, input.albumId))
      .limit(1);

    const finalAlbum = finalAlbumResult[0];

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
