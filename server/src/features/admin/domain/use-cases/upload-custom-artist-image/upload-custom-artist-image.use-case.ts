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
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
    private readonly metadataGateway: MetadataEnrichmentGateway,
  ) {}

  async execute(input: UploadCustomArtistImageInput): Promise<UploadCustomArtistImageOutput> {
    // Validate artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: input.artistId },
      select: { id: true, name: true },
    });

    if (!artist) {
      throw new NotFoundException(`Artist not found: ${input.artistId}`);
    }

    // Validate image type
    const validTypes = ['profile', 'background', 'banner', 'logo'];
    if (!validTypes.includes(input.imageType)) {
      throw new BadRequestException(`Invalid image type: ${input.imageType}`);
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
      `Uploading custom ${input.imageType} image for artist: ${artist.name}`,
    );

    // Get storage path for artist
    const basePath = await this.storage.getArtistMetadataPath(input.artistId);
    const customPath = path.join(basePath, 'custom', input.imageType);

    // Ensure custom directory exists
    await fs.mkdir(customPath, { recursive: true });

    // Generate unique filename
    const fileHash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(input.file.originalname);
    const fileName = `${input.imageType}_${Date.now()}_${fileHash}${ext}`;
    const filePath = path.join(customPath, fileName);

    // Write file to disk
    try {
      await fs.writeFile(filePath, input.file.buffer);
      this.logger.log(`Custom image saved to: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save custom image: ${(error as Error).message}`);
      throw new BadRequestException('Failed to save image file');
    }

    // Create database record
    // IMPORTANT: Normalize path separators to Unix-style (/) for cross-platform compatibility
    // Windows path.relative() returns backslashes (\) which don't work on Unix systems
    const relativePath = path.relative(basePath, filePath).replace(/\\/g, '/');

    const customImage = await this.prisma.customArtistImage.create({
      data: {
        artistId: input.artistId,
        imageType: input.imageType,
        filePath: relativePath,
        fileName,
        fileSize: BigInt(input.file.size),
        mimeType: input.file.mimetype,
        isActive: false, // Not active by default, user must apply it
        uploadedBy: input.uploadedBy,
      },
    });

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
