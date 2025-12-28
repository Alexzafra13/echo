import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and } from 'drizzle-orm';
import { albums, customAlbumCovers } from '@infrastructure/database/schema';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DeleteCustomAlbumCoverInput,
  DeleteCustomAlbumCoverOutput,
} from './delete-custom-album-cover.dto';

/**
 * DeleteCustomAlbumCoverUseCase
 * Deletes a custom album cover (file and database record)
 */
@Injectable()
export class DeleteCustomAlbumCoverUseCase {
  constructor(
    @InjectPinoLogger(DeleteCustomAlbumCoverUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
  ) {}

  async execute(input: DeleteCustomAlbumCoverInput): Promise<DeleteCustomAlbumCoverOutput> {
    // Validate album exists
    const albumResult = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
      })
      .from(albums)
      .where(eq(albums.id, input.albumId))
      .limit(1);

    const album = albumResult[0];

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    // Validate custom cover exists
    const customCoverResult = await this.drizzle.db
      .select()
      .from(customAlbumCovers)
      .where(
        and(
          eq(customAlbumCovers.id, input.customCoverId),
          eq(customAlbumCovers.albumId, input.albumId),
        ),
      )
      .limit(1);

    const customCover = customCoverResult[0];

    if (!customCover) {
      throw new NotFoundException(
        `Custom cover ${input.customCoverId} not found for album ${input.albumId}`,
      );
    }

    this.logger.info(`Deleting custom cover for album: ${album.name}`);

    // Delete file from disk
    try {
      const basePath = path.join(
        await this.storage.getStoragePath(),
        'metadata',
        'albums',
        input.albumId
      );
      const absolutePath = path.join(basePath, customCover.filePath);

      await fs.unlink(absolutePath);
      this.logger.debug(`Deleted file: ${absolutePath}`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete file ${customCover.filePath}: ${(error as Error).message}`,
      );
      // Continue with database deletion even if file deletion fails
    }

    // Delete database record
    await this.drizzle.db
      .delete(customAlbumCovers)
      .where(eq(customAlbumCovers.id, input.customCoverId));

    // Invalidate image cache
    this.imageService.invalidateAlbumCache(input.albumId);

    this.logger.info(`✅ Successfully deleted custom cover for ${album.name}`);

    return {
      success: true,
      message: 'Custom cover deleted successfully',
    };
  }
}
