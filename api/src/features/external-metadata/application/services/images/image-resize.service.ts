import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * Predefined image sizes for album covers.
 * Each size produces a square image (fit: cover).
 */
export const IMAGE_SIZES = {
  thumb: 200,
  small: 300,
  medium: 500,
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

export interface ResizedImageResult {
  filePath: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class ImageResizeService {
  private readonly thumbsPath: string;

  constructor(
    @InjectPinoLogger(ImageResizeService.name)
    private readonly logger: PinoLogger,
    private readonly config: ConfigService
  ) {
    const dataPath = this.config.get<string>('DATA_PATH');
    if (dataPath) {
      this.thumbsPath = path.join(dataPath, 'uploads', 'thumbnails');
    } else {
      const uploadPath = this.config.get<string>('UPLOAD_PATH', './uploads');
      this.thumbsPath = path.join(uploadPath, 'thumbnails');
    }
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    try {
      if (!existsSync(this.thumbsPath)) {
        await fs.mkdir(this.thumbsPath, { recursive: true });
        this.logger.info(`Thumbnails directory created: ${this.thumbsPath}`);
      }
    } catch (error) {
      this.logger.error('Error creating thumbnails directory:', error);
    }
  }

  /**
   * Get a resized version of an image. Returns cached thumbnail if available,
   * otherwise generates and caches it.
   *
   * @param originalPath - Absolute path to the original image
   * @param cacheKey - Unique key for this image (e.g. albumId or albumId:tag)
   * @param size - Target size preset
   * @param preferWebP - Whether to output WebP (smaller) or JPEG
   */
  async getResized(
    originalPath: string,
    cacheKey: string,
    size: ImageSize,
    preferWebP: boolean
  ): Promise<ResizedImageResult | null> {
    const px = IMAGE_SIZES[size];
    const ext = preferWebP ? 'webp' : 'jpg';
    const fileName = `${cacheKey}_${size}.${ext}`;
    const thumbPath = path.join(this.thumbsPath, fileName);

    // Serve from disk cache
    if (existsSync(thumbPath)) {
      try {
        const stats = await fs.stat(thumbPath);
        return {
          filePath: thumbPath,
          mimeType: preferWebP ? 'image/webp' : 'image/jpeg',
          size: stats.size,
        };
      } catch {
        // File disappeared between check and stat — regenerate
      }
    }

    // Generate thumbnail
    try {
      const pipeline = sharp(originalPath)
        .resize(px, px, { fit: 'cover', position: 'centre' });

      if (preferWebP) {
        pipeline.webp({ quality: 80 });
      } else {
        pipeline.jpeg({ quality: 80, mozjpeg: true });
      }

      await pipeline.toFile(thumbPath);

      const stats = await fs.stat(thumbPath);
      this.logger.debug(
        `Generated ${size} thumbnail (${px}px ${ext}): ${fileName} (${stats.size} bytes)`
      );

      return {
        filePath: thumbPath,
        mimeType: preferWebP ? 'image/webp' : 'image/jpeg',
        size: stats.size,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to generate thumbnail for ${cacheKey}: ${error instanceof Error ? error.message : error}`
      );
      return null;
    }
  }

  /**
   * Invalidate all cached thumbnails for a given cache key (e.g. when cover changes)
   */
  async invalidate(cacheKey: string): Promise<void> {
    try {
      const files = await fs.readdir(this.thumbsPath);
      const toDelete = files.filter((f) => f.startsWith(`${cacheKey}_`));
      await Promise.all(
        toDelete.map((f) => fs.unlink(path.join(this.thumbsPath, f)).catch(() => {}))
      );
      if (toDelete.length > 0) {
        this.logger.debug(`Invalidated ${toDelete.length} thumbnails for ${cacheKey}`);
      }
    } catch {
      // Directory might not exist yet
    }
  }
}
