import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, customArtistImages } from '@infrastructure/database/schema';
import { eq, desc, and } from 'drizzle-orm';
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

  constructor(private readonly drizzle: DrizzleService) {}

  async execute(input: ListCustomArtistImagesInput): Promise<ListCustomArtistImagesOutput> {
    // Validate artist exists
    const artistResult = await this.drizzle.db
      .select({ id: artists.id, name: artists.name })
      .from(artists)
      .where(eq(artists.id, input.artistId))
      .limit(1);

    const artist = artistResult[0];

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    // Build where clause
    const whereConditions = [eq(customArtistImages.artistId, input.artistId)];

    if (input.imageType) {
      whereConditions.push(eq(customArtistImages.imageType, input.imageType));
    }

    // Fetch custom images
    const images = await this.drizzle.db
      .select()
      .from(customArtistImages)
      .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
      .orderBy(desc(customArtistImages.isActive), desc(customArtistImages.createdAt));

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
