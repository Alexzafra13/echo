import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { radioStationImages } from '@infrastructure/database/schema';
import { StorageService } from '@features/external-metadata/infrastructure/services/storage.service';
import { ImageService } from '@features/external-metadata/application/services/image.service';
import {
  DeleteRadioFaviconInput,
  DeleteRadioFaviconOutput,
} from './delete-radio-favicon.dto';

@Injectable()
export class DeleteRadioFaviconUseCase {
  constructor(
    @InjectPinoLogger(DeleteRadioFaviconUseCase.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly imageService: ImageService,
  ) {}

  async execute(input: DeleteRadioFaviconInput): Promise<DeleteRadioFaviconOutput> {
    const imageResult = await this.drizzle.db
      .select({
        id: radioStationImages.id,
        filePath: radioStationImages.filePath,
      })
      .from(radioStationImages)
      .where(eq(radioStationImages.stationUuid, input.stationUuid))
      .limit(1);

    const image = imageResult[0];

    if (!image) {
      throw new NotFoundException(`No custom favicon for station ${input.stationUuid}`);
    }

    // Delete the file
    try {
      await this.storage.deleteImage(image.filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete favicon file: ${(error as Error).message}`);
    }

    // Delete the database record
    await this.drizzle.db
      .delete(radioStationImages)
      .where(eq(radioStationImages.id, image.id));

    this.imageService.invalidateRadioFaviconCache(input.stationUuid);

    this.logger.info(`Deleted custom favicon for station ${input.stationUuid}`);

    return {
      success: true,
      message: 'Radio station favicon deleted successfully',
    };
  }
}
