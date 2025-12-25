import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { albums, customAlbumCovers } from '@infrastructure/database/schema';
import { RedisService } from '@infrastructure/cache/redis.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
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
  UploadCustomAlbumCoverInput,
  UploadCustomAlbumCoverOutput,
} from './upload-custom-album-cover.dto';

/**
 * UploadCustomAlbumCoverUseCase
 * Uploads a custom album cover provided by the user
 * and stores it in the custom covers collection
 */
@Injectable()
export class UploadCustomAlbumCoverUseCase {
  private readonly logger = new Logger(UploadCustomAlbumCoverUseCase.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: UploadCustomAlbumCoverInput): Promise<UploadCustomAlbumCoverOutput> {
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

    // Validate file using shared utility
    validateFileUpload(input.file, FILE_UPLOAD_CONFIGS.image);

    this.logger.log(`Uploading custom cover for album: ${album.name}`);

    // Get storage path for album (using metadata directory)
    const basePath = path.join(
      await this.storage.getStoragePath(),
      'metadata',
      'albums',
      input.albumId,
    );
    const customPath = path.join(basePath, 'custom', 'covers');

    // Ensure custom directory exists
    await ensureDirectory(customPath);

    // Generate unique filename and save file
    const fileName = generateUniqueFilename(input.file.originalname, 'cover');
    const filePath = path.join(customPath, fileName);

    try {
      await writeFileSafe(filePath, input.file.buffer);
      this.logger.log(`Custom cover saved to: ${filePath}`);
    } catch {
      throw new BadRequestException('Failed to save cover file');
    }

    // Normalize path for cross-platform compatibility
    const relativePath = normalizePathSeparators(path.relative(basePath, filePath));

    const customCoverResult = await this.drizzle.db
      .insert(customAlbumCovers)
      .values({
        albumId: input.albumId,
        filePath: relativePath,
        fileName,
        fileSize: Number(input.file.size),
        mimeType: input.file.mimetype,
        isActive: false, // Not active by default, user must apply it
        uploadedBy: input.uploadedBy,
      })
      .returning();

    const customCover = customCoverResult[0];

    this.logger.log(
      `✅ Successfully uploaded custom cover for ${album.name} (ID: ${customCover.id})`,
    );

    // Generate URL for the uploaded cover
    const url = `/api/images/albums/${input.albumId}/custom/${customCover.id}`;

    return {
      success: true,
      message: `Custom cover uploaded successfully`,
      customCoverId: customCover.id,
      filePath: customCover.filePath,
      url,
    };
  }
}
