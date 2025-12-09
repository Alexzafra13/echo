import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and } from 'drizzle-orm';
import { albums, customAlbumCovers } from '@infrastructure/database/schema';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEventsService } from '@features/external-metadata/domain/services/metadata-events.service';
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
    private readonly drizzle: DrizzleService,
    private readonly imageService: ImageService,
    private readonly metadataEvents: MetadataEventsService,
  ) {}

  async execute(input: ApplyCustomAlbumCoverInput): Promise<ApplyCustomAlbumCoverOutput> {
    // Validate album exists
    const albumResult = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
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

    this.logger.log(`Applying custom cover for album: ${album.name}`);

    // Deactivate all other custom covers for this album
    await this.drizzle.db
      .update(customAlbumCovers)
      .set({ isActive: false })
      .where(
        and(
          eq(customAlbumCovers.albumId, input.albumId),
          eq(customAlbumCovers.isActive, true),
        ),
      );

    // Activate the selected custom cover
    await this.drizzle.db
      .update(customAlbumCovers)
      .set({ isActive: true })
      .where(eq(customAlbumCovers.id, input.customCoverId));

    // Invalidate image cache
    this.imageService.invalidateAlbumCache(input.albumId);

    // Notify via SSE (if album has an artist)
    if (album.artistId) {
      this.metadataEvents.emitAlbumCoverUpdated({
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
