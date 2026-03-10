import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { radioStationImages } from '@infrastructure/database/schema';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import {
  validateFileUpload,
  getExtensionFromMimeType,
  FILE_UPLOAD_CONFIGS,
} from '@shared/utils';
import {
  UploadRadioFaviconInput,
  UploadRadioFaviconOutput,
} from './upload-radio-favicon.dto';

@Injectable()
export class UploadRadioFaviconUseCase {
  constructor(
    @InjectPinoLogger(UploadRadioFaviconUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
  ) {}

  async execute(input: UploadRadioFaviconInput): Promise<UploadRadioFaviconOutput> {
    if (!input.stationUuid || !input.stationUuid.trim()) {
      throw new BadRequestException('stationUuid is required');
    }

    validateFileUpload(input.file, FILE_UPLOAD_CONFIGS.image);

    this.logger.info(`Uploading custom favicon for radio station: ${input.stationUuid}`);

    const extension = getExtensionFromMimeType(input.file.mimetype);
    const filePath = await this.storage.getRadioFaviconPath(input.stationUuid, extension);

    // Delete existing file if any
    const existing = await this.drizzle.db
      .select({ id: radioStationImages.id, filePath: radioStationImages.filePath })
      .from(radioStationImages)
      .where(eq(radioStationImages.stationUuid, input.stationUuid))
      .limit(1);

    if (existing[0]) {
      try {
        await this.storage.deleteImage(existing[0].filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete old favicon: ${(error as Error).message}`);
      }
    }

    await this.storage.saveImage(filePath, input.file.buffer);

    // Upsert the database record
    let imageId: string;

    if (existing[0]) {
      await this.drizzle.db
        .update(radioStationImages)
        .set({
          filePath,
          fileName: `favicon.${extension}`,
          fileSize: input.file.size,
          mimeType: input.file.mimetype,
          source: 'manual',
          uploadedBy: input.uploadedBy,
          updatedAt: new Date(),
        })
        .where(eq(radioStationImages.id, existing[0].id));
      imageId = existing[0].id;
    } else {
      const result = await this.drizzle.db
        .insert(radioStationImages)
        .values({
          stationUuid: input.stationUuid,
          filePath,
          fileName: `favicon.${extension}`,
          fileSize: input.file.size,
          mimeType: input.file.mimetype,
          source: 'manual',
          uploadedBy: input.uploadedBy,
        })
        .returning();
      imageId = result[0].id;
    }

    this.imageService.invalidateRadioFaviconCache(input.stationUuid);

    this.logger.info(`Custom favicon uploaded for station ${input.stationUuid}`);

    return {
      success: true,
      message: 'Radio station favicon uploaded successfully',
      imageId,
      url: `/api/images/radio/${input.stationUuid}/favicon`,
    };
  }
}
