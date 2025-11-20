import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import {
  ListCustomArtistImagesInput,
  ListCustomArtistImagesOutput,
  CustomArtistImageItem,
} from './list-custom-artist-images.dto';

/**
 * ListCustomArtistImagesUseCase
 * Lists all custom images uploaded for an artist
 */
@Injectable()
export class ListCustomArtistImagesUseCase {
  private readonly logger = new Logger(ListCustomArtistImagesUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: ListCustomArtistImagesInput): Promise<ListCustomArtistImagesOutput> {
    // Validate artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
      select: { id: true, name: true },
    });

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    // Build where clause
    const where: any = {
      artistId: input.artistId,
    };

    if (input.imageType) {
      where.imageType = input.imageType;
    }

    // Fetch custom images
    const images = await this.prisma.customArtistImage.findMany({
      where,
      orderBy: [
        { isActive: 'desc' }, // Active images first
        { createdAt: 'desc' }, // Then most recent
      ],
    });

    // Map to output format
    const imageItems: CustomArtistImageItem[] = images.map((img) => ({
      id: img.id,
      artistId: img.artistId,
      imageType: img.imageType,
      filePath: img.filePath,
      fileName: img.fileName,
      fileSize: String(img.fileSize),
      mimeType: img.mimeType,
      isActive: img.isActive,
      uploadedBy: img.uploadedBy,
      createdAt: img.createdAt,
      updatedAt: img.updatedAt,
      url: `/api/artists/${input.artistId}/images/custom/${img.id}`,
    }));

    this.logger.debug(
      `Found ${images.length} custom images for artist ${artist.name}${input.imageType ? ` (type: ${input.imageType})` : ''}`,
    );

    return {
      customImages: imageItems,
      total: images.length,
    };
  }
}
