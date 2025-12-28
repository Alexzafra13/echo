import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { parseFile } from 'music-metadata';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * CoverArtService - Manages album cover extraction and caching
 *
 * Inspired by Navidrome:
 * 1. Search for external covers (cover.jpg, folder.jpg, etc.)
 * 2. Extract embedded covers from audio files
 * 3. Cache images to disk
 * 4. Return relative paths for serving
 */
@Injectable()
export class CoverArtService {
  private readonly coversPath: string;

  // Common cover file names (ordered by priority)
  private readonly COVER_FILENAMES = [
    'cover.jpg',
    'cover.png',
    'folder.jpg',
    'folder.png',
    'album.jpg',
    'album.png',
    'front.jpg',
    'front.png',
    'Cover.jpg',
    'Folder.jpg',
    'Album.jpg',
  ];

  constructor(
    @InjectPinoLogger(CoverArtService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    // Directory where covers will be cached
    // Priority: COVERS_PATH > DATA_PATH/uploads/covers > UPLOAD_PATH/covers > ./uploads/covers
    const coversPath = this.configService.get<string>('COVERS_PATH');
    if (coversPath) {
      this.coversPath = coversPath;
    } else {
      const dataPath = this.configService.get<string>('DATA_PATH');
      if (dataPath) {
        this.coversPath = path.join(dataPath, 'uploads', 'covers');
      } else {
        const uploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
        this.coversPath = path.join(uploadPath, 'covers');
      }
    }
    this.logger.info(`Covers cache directory: ${this.coversPath}`);
    this.ensureCoversDirectory();
  }

  /**
   * Ensures covers directory exists
   */
  private async ensureCoversDirectory(): Promise<void> {
    try {
      if (!existsSync(this.coversPath)) {
        await fs.mkdir(this.coversPath, { recursive: true });
        this.logger.info(`Covers directory created: ${this.coversPath}`);
      }
    } catch (error) {
      this.logger.error(`Error creating covers directory:`, error);
    }
  }

  /**
   * Extracts and caches album cover
   *
   * @param albumId - Album ID (used for file naming)
   * @param trackPath - Path to first track of the album
   * @returns Relative path to cached cover or undefined
   */
  async extractAndCacheCover(
    albumId: string,
    trackPath: string,
  ): Promise<string | undefined> {
    try {
      // 1. Search for external cover in track directory
      const trackDir = path.dirname(trackPath);
      const externalCover = await this.findExternalCover(trackDir);

      if (externalCover) {
        return await this.cacheCover(albumId, externalCover);
      }

      // 2. Extract embedded cover from audio file
      const embeddedCover = await this.extractEmbeddedCover(trackPath);

      if (embeddedCover) {
        return await this.cacheCoverFromBuffer(
          albumId,
          embeddedCover.data,
          embeddedCover.format,
        );
      }

      this.logger.warn(`Cover not found for album ${albumId}`);
      return undefined;
    } catch (error) {
      this.logger.error(`Error extracting cover for album ${albumId}:`, error);
      return undefined;
    }
  }

  /**
   * Searches for external cover file in directory
   */
  private async findExternalCover(directory: string): Promise<string | undefined> {
    for (const filename of this.COVER_FILENAMES) {
      const coverPath = path.join(directory, filename);
      if (existsSync(coverPath)) {
        this.logger.debug(`External cover found: ${filename}`);
        return coverPath;
      }
    }
    return undefined;
  }

  /**
   * Extracts embedded cover from audio file
   */
  private async extractEmbeddedCover(
    trackPath: string,
  ): Promise<{ data: Buffer; format: string } | undefined> {
    try {
      const metadata = await parseFile(trackPath);
      const picture = metadata.common.picture?.[0];

      if (picture && picture.data) {
        this.logger.debug(`Embedded cover found in: ${path.basename(trackPath)}`);
        return {
          data: Buffer.from(picture.data),
          format: picture.format || 'image/jpeg',
        };
      }

      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Error extracting cover from ${trackPath}:`, errorMessage);
      return undefined;
    }
  }

  /**
   * Caches cover from external file
   */
  private async cacheCover(albumId: string, sourcePath: string): Promise<string> {
    const ext = path.extname(sourcePath);
    const destFileName = `${albumId}${ext}`;
    const destPath = path.join(this.coversPath, destFileName);

    // Copy file with retry (for Windows EPERM errors)
    await this.copyFileWithRetry(sourcePath, destPath);

    this.logger.debug(`Cover cached: ${destFileName}`);
    return destFileName;
  }

  /**
   * Copies file with retry mechanism to handle Windows EPERM errors
   */
  private async copyFileWithRetry(
    source: string,
    dest: string,
    maxRetries = 3,
    delay = 100,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.copyFile(source, dest);
        return; // Success
      } catch (error: any) {
        // If it's a permission error (EPERM) on Windows, retry
        if (error.code === 'EPERM' && attempt < maxRetries) {
          this.logger.warn(
            `EPERM error copying ${path.basename(source)}, retrying (${attempt}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
          continue;
        }
        // If we get here, it failed after all retries or it's another error
        throw error;
      }
    }
  }

  /**
   * Caches cover from buffer (embedded cover)
   */
  private async cacheCoverFromBuffer(
    albumId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    // Determine extension from MIME type
    const ext = this.mimeTypeToExtension(mimeType);
    const destFileName = `${albumId}${ext}`;
    const destPath = path.join(this.coversPath, destFileName);

    // Save buffer
    await fs.writeFile(destPath, buffer);

    this.logger.debug(`Cover cached: ${destFileName}`);
    return destFileName;
  }

  /**
   * Converts MIME type to file extension
   */
  private mimeTypeToExtension(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return mimeMap[mimeType.toLowerCase()] || '.jpg';
  }

  /**
   * Gets absolute path of cached cover
   */
  getCoverPath(fileName: string | undefined | null): string | undefined {
    if (!fileName) return undefined;
    const coverPath = path.join(this.coversPath, fileName);
    return existsSync(coverPath) ? coverPath : undefined;
  }

  /**
   * Checks if cover exists in cache
   */
  async coverExists(fileName: string | undefined | null): Promise<boolean> {
    if (!fileName) return false;
    const coverPath = path.join(this.coversPath, fileName);
    return existsSync(coverPath);
  }

  /**
   * Deletes cover from cache
   */
  async deleteCover(fileName: string): Promise<void> {
    try {
      const coverPath = path.join(this.coversPath, fileName);
      if (existsSync(coverPath)) {
        await fs.unlink(coverPath);
        this.logger.debug(`Cover deleted: ${fileName}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting cover ${fileName}:`, error);
    }
  }
}
