import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { albums, customAlbumCovers } from '@infrastructure/database/schema';
import { eq, desc } from 'drizzle-orm';
import {
  ListCustomAlbumCoversInput,
  ListCustomAlbumCoversOutput,
} from './list-custom-album-covers.dto';

/**
 * ListCustomAlbumCoversUseCase
 * Lists all custom covers uploaded for an album
 */
@Injectable()
export class ListCustomAlbumCoversUseCase {
  private readonly logger = new Logger(ListCustomAlbumCoversUseCase.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async execute(input: ListCustomAlbumCoversInput): Promise<ListCustomAlbumCoversOutput> {
    // Validate album exists
    const albumResult = await this.drizzle.db
      .select({ id: albums.id, name: albums.name })
      .from(albums)
      .where(eq(albums.id, input.albumId))
      .limit(1);

    const album = albumResult[0];

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    // Get all custom covers for this album
    const customCoversRaw = await this.drizzle.db
      .select()
      .from(customAlbumCovers)
      .where(eq(customAlbumCovers.albumId, input.albumId))
      .orderBy(desc(customAlbumCovers.createdAt));

    // Map to ensure fileSize is a string for JSON serialization
    const customCovers = customCoversRaw.map((cover) => ({
      ...cover,
      fileSize: String(cover.fileSize),
    }));

    this.logger.debug(`Found ${customCovers.length} custom covers for album ${album.name}`);

    return {
      albumId: input.albumId,
      albumName: album.name,
      customCovers,
    };
  }
}
