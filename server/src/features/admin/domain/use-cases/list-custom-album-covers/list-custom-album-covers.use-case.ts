import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListCustomAlbumCoversInput): Promise<ListCustomAlbumCoversOutput> {
    // Validate album exists
    const album = await this.prisma.album.findUnique({
      where: { id: input.albumId },
      select: { id: true, name: true },
    });

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    // Get all custom covers for this album
    const customCovers = await this.prisma.customAlbumCover.findMany({
      where: { albumId: input.albumId },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug(`Found ${customCovers.length} custom covers for album ${album.name}`);

    return {
      albumId: input.albumId,
      albumName: album.name,
      customCovers,
    };
  }
}
