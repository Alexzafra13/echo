import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { RedisService } from '@infrastructure/cache/redis.service';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import { MetadataEnrichmentGateway } from '@features/external-metadata/presentation/metadata-enrichment.gateway';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
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
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: UploadCustomAlbumCoverInput): Promise<UploadCustomAlbumCoverOutput> {
    // Validate album exists
    const album = await this.prisma.album.findUnique({
      where: { id: input.albumId },
      select: { id: true, name: true },
    });

    if (!album) {
      throw new NotFoundException(`Album not found: ${input.albumId}`);
    }

    // Validate file
    if (!input.file) {
      throw new BadRequestException('No file provided');
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(input.file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP are allowed');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (input.file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    this.logger.log(
      `Uploading custom cover for album: ${album.name}`,
    );

    // Get storage path for album (using metadata directory)
    const basePath = path.join(
      await this.storage.getStoragePath(),
      'metadata',
      'albums',
      input.albumId
    );
    const customPath = path.join(basePath, 'custom', 'covers');

    // Ensure custom directory exists
    await fs.mkdir(customPath, { recursive: true });

    // Generate unique filename
    const fileHash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(input.file.originalname);
    const fileName = `cover_${Date.now()}_${fileHash}${ext}`;
    const filePath = path.join(customPath, fileName);

    // Write file to disk
    try {
      await fs.writeFile(filePath, input.file.buffer);
      this.logger.log(`Custom cover saved to: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save custom cover: ${(error as Error).message}`);
      throw new BadRequestException('Failed to save cover file');
    }

    // Create database record
    const customCover = await this.prisma.customAlbumCover.create({
      data: {
        albumId: input.albumId,
        filePath: path.relative(basePath, filePath),
        fileName,
        fileSize: BigInt(input.file.size),
        mimeType: input.file.mimetype,
        isActive: false, // Not active by default, user must apply it
        uploadedBy: input.uploadedBy,
      },
    });

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
