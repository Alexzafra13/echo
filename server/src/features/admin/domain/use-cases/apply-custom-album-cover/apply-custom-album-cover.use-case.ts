import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import {
  ApplyCustomAlbumCoverInput,
  ApplyCustomAlbumCoverOutput,
} from './apply-custom-album-cover.dto';

/**
 * ApplyCustomAlbumCoverUseCase
 * Sets a custom cover as the active cover for an album
 */
@Injectable()
export class ApplyCustomAlbumCoverUseCase {
  private readonly logger = new Logger(ApplyCustomAlbumCoverUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: ApplyCustomAlbumCoverInput): Promise<ApplyCustomAlbumCoverOutput> {
    // Validate album exists
    const album = await this.prisma.album.findUnique({
      where: { id: input.albumId },
      select: { id: true, name: true, artistId: true },
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

    this.logger.log(`Applying custom cover for album: ${album.name}`);

    // Deactivate all other custom covers for this album
    await this.prisma.customAlbumCover.updateMany({
      where: {
        albumId: input.albumId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Activate the selected custom cover
    await this.prisma.customAlbumCover.update({
      where: { id: input.customCoverId },
      data: { isActive: true },
    });

    // Invalidate image cache
    this.imageService.invalidateAlbumCache(input.albumId);

    // Notify via WebSocket (if album has an artist)
    if (album.artistId) {
      this.metadataGateway.emitAlbumCoverUpdated({
        albumId: input.albumId,
        albumName: album.name,
        artistId: album.artistId,
        updatedAt: new Date(),
      });
    }

    this.logger.log(`✅ Successfully applied custom cover for ${album.name}`);

    return {
      success: true,
      message: 'Custom cover applied successfully',
    };
  }
}
