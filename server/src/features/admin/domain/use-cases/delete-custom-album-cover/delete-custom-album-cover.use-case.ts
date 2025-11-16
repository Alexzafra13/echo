import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
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
  private readonly logger = new Logger(DeleteCustomAlbumCoverUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
  ) {}

  async execute(input: DeleteCustomAlbumCoverInput): Promise<DeleteCustomAlbumCoverOutput> {
    // Validate album exists
    const album = await this.prisma.album.findUnique({
      where: { id: input.albumId },
      select: { id: true, name: true },
    });

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    // Validate custom cover exists
    const customCover = await this.prisma.customAlbumCover.findFirst({
      where: {
        id: input.customCoverId,
        albumId: input.albumId,
      },
    });

    if (!customCover) {
      throw new NotFoundException(
        `Custom cover ${input.customCoverId} not found for album ${input.albumId}`,
      );
    }

    this.logger.log(`Deleting custom cover for album: ${album.name}`);

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
    await this.prisma.customAlbumCover.delete({
      where: { id: input.customCoverId },
    });

    // Invalidate image cache
    this.imageService.invalidateAlbumCache(input.albumId);

    this.logger.log(`✅ Successfully deleted custom cover for ${album.name}`);

    return {
      success: true,
      message: 'Custom cover deleted successfully',
    };
  }
}
