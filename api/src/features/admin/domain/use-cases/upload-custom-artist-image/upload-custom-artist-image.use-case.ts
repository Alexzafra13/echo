import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists, customArtistImages } from '@infrastructure/database/schema';
import { RedisService } from '@infrastructure/cache/redis.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEventsService } from '@features/external-metadata/domain/services/metadata-events.service';
import * as path from 'path';
import {
  validateFileUpload,
  generateUniqueFilename,
  normalizePathSeparators,
  FILE_UPLOAD_CONFIGS,
  ensureDirectory,
  writeFileSafe,
} from '@shared/utils';
import {
  UploadCustomArtistImageInput,
  UploadCustomArtistImageOutput,
} from './upload-custom-artist-image.dto';

/**
 * UploadCustomArtistImageUseCase
 * Uploads a custom artist image provided by the user
 * and stores it in the custom images collection
 */
@Injectable()
export class UploadCustomArtistImageUseCase {
  private readonly logger = new Logger(UploadCustomArtistImageUseCase.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataEvents: MetadataEventsService,
  ) {}

  async execute(input: UploadCustomArtistImageInput): Promise<UploadCustomArtistImageOutput> {
    // Validate artist exists
    const artistResult = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
      })
      .from(artists)
      .where(eq(artists.id, input.artistId))
      .limit(1);

    const artist = artistResult[0];

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    // Validate image type
    const validTypes = ['profile', 'background', 'banner', 'logo'];
    if (!validTypes.includes(input.imageType)) {
      throw new BadRequestException(`Invalid image type: ${input.imageType}`);
    }

    // Validate file using shared utility
    validateFileUpload(input.file, FILE_UPLOAD_CONFIGS.image);

    this.logger.log(`Uploading custom ${input.imageType} image for artist: ${artist.name}`);

    // Get storage path for artist
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);
    const customPath = path.join(basePath, 'custom', input.imageType);

    // Ensure custom directory exists
    await ensureDirectory(customPath);

    // Generate unique filename and save file
    const fileName = generateUniqueFilename(input.file.originalname, input.imageType);
    const filePath = path.join(customPath, fileName);

    try {
      await writeFileSafe(filePath, input.file.buffer);
      this.logger.log(`Custom image saved to: ${filePath}`);
    } catch {
      throw new BadRequestException('Failed to save image file');
    }

    // Normalize path for cross-platform compatibility
    const relativePath = normalizePathSeparators(path.relative(basePath, filePath));

    const customImageResult = await this.drizzle.db
      .insert(customArtistImages)
      .values({
        artistId: input.artistId,
        imageType: input.imageType,
        filePath: relativePath,
        fileName,
        fileSize: Number(input.file.size),
        mimeType: input.file.mimetype,
        isActive: false, // Not active by default, user must apply it
        uploadedBy: input.uploadedBy,
      })
      .returning();

    const customImage = customImageResult[0];

    this.logger.log(
      `✅ Successfully uploaded custom ${input.imageType} image for ${artist.name} (ID: ${customImage.id})`,
    );

    // Generate URL for the uploaded image
    const url = `/api/artists/${input.artistId}/images/custom/${customImage.id}`;

    return {
      success: true,
      message: `Custom ${input.imageType} image uploaded successfully`,
      customImageId: customImage.id,
      filePath: customImage.filePath,
      url,
    };
  }
}
