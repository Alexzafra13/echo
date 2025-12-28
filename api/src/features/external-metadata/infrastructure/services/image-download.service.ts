import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { StorageService } from './storage.service';
import probe from 'probe-image-size';
import * as fs from 'fs/promises';
import { ExternalApiError, ImageProcessingError } from '@shared/errors';

export interface ImageDimensions {
  width: number;
  height: number;
  type: string;
}

/**
 * Image Download Service
 * Handles downloading images from external URLs and saving them locally
 */
@Injectable()
export class ImageDownloadService {
  // HTTP timeout for downloads (30 seconds)
  private readonly DOWNLOAD_TIMEOUT = 30000;

  // Max image size (10 MB)
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  constructor(@InjectPinoLogger(ImageDownloadService.name)
    private readonly logger: PinoLogger,
    private readonly storage: StorageService) {}

  /**
   * Download an image from a URL
   * @param url Image URL
   * @returns Image buffer
   */
  async downloadImage(url: string): Promise<Buffer> {
    try {
      this.logger.debug(`Downloading image from: ${url}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.DOWNLOAD_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Echo-Music-Server/1.0.0',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new ExternalApiError('ImageDownload', response.status, response.statusText);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        throw new ImageProcessingError('INVALID_CONTENT_TYPE', contentType || 'unknown');
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.MAX_IMAGE_SIZE) {
        throw new ImageProcessingError('FILE_TOO_LARGE', `${contentLength} bytes`);
      }

      // Download as buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate buffer size
      if (buffer.length > this.MAX_IMAGE_SIZE) {
        throw new ImageProcessingError('FILE_TOO_LARGE', `${buffer.length} bytes`);
      }

      // Validate it's actually an image
      if (!this.isValidImageBuffer(buffer)) {
        throw new ImageProcessingError('INVALID_IMAGE');
      }

      this.logger.debug(`Downloaded image: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      this.logger.error(`Error downloading image from ${url}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Download and save an image directly to a path
   * @param url Image URL
   * @param destinationPath Full path where to save
   */
  async downloadAndSave(url: string, destinationPath: string): Promise<void> {
    try {
      const buffer = await this.downloadImage(url);
      await this.storage.saveImage(destinationPath, buffer);
      this.logger.info(`Downloaded and saved: ${destinationPath}`);
    } catch (error) {
      this.logger.error(
        `Error downloading and saving image from ${url} to ${destinationPath}: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  /**
   * Download multiple images in parallel
   * @param urls Array of URLs to download
   * @returns Map of URL to buffer
   */
  async downloadMultiple(urls: string[]): Promise<Map<string, Buffer>> {
    const results = new Map<string, Buffer>();

    // Download in parallel but limit concurrency to 3
    const chunkSize = 3;
    for (let i = 0; i < urls.length; i += chunkSize) {
      const chunk = urls.slice(i, i + chunkSize);
      const promises = chunk.map(async (url) => {
        try {
          const buffer = await this.downloadImage(url);
          return { url, buffer };
        } catch (error) {
          this.logger.warn(`Failed to download ${url}: ${(error as Error).message}`);
          return { url, buffer: null };
        }
      });

      const chunkResults = await Promise.all(promises);

      for (const result of chunkResults) {
        if (result.buffer) {
          results.set(result.url, result.buffer);
        }
      }
    }

    return results;
  }

  /**
   * Download multiple sizes of an image and save them
   * @param urls Object with small, medium, large URLs
   * @param basePath Base path (e.g., /storage/metadata/artists/123/)
   * @param prefix Filename prefix (e.g., "profile" or "cover")
   * @returns Object with local paths
   */
  async downloadMultipleSizes(
    urls: { small?: string; medium?: string; large?: string },
    basePath: string,
    prefix: string
  ): Promise<{
    smallPath: string | null;
    mediumPath: string | null;
    largePath: string | null;
  }> {
    const result = {
      smallPath: null as string | null,
      mediumPath: null as string | null,
      largePath: null as string | null,
    };

    // Download small
    if (urls.small) {
      try {
        const path = `${basePath}/${prefix}-small.jpg`;
        await this.downloadAndSave(urls.small, path);
        result.smallPath = path;
      } catch (error) {
        this.logger.warn(`Failed to download small image: ${(error as Error).message}`);
      }
    }

    // Download medium
    if (urls.medium) {
      try {
        const path = `${basePath}/${prefix}-medium.jpg`;
        await this.downloadAndSave(urls.medium, path);
        result.mediumPath = path;
      } catch (error) {
        this.logger.warn(`Failed to download medium image: ${(error as Error).message}`);
      }
    }

    // Download large
    if (urls.large) {
      try {
        const path = `${basePath}/${prefix}-large.jpg`;
        await this.downloadAndSave(urls.large, path);
        result.largePath = path;
      } catch (error) {
        this.logger.warn(`Failed to download large image: ${(error as Error).message}`);
      }
    }

    return result;
  }

  /**
   * Get image dimensions from a local file
   * @param filePath Path to image file
   * @returns Image dimensions or null if file doesn't exist/invalid
   */
  async getImageDimensionsFromFile(filePath: string): Promise<ImageDimensions | null> {
    try {
      // First, check if file exists
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        this.logger.warn(`Path is not a file: ${filePath}`);
        return null;
      }

      const stream = await fs.open(filePath, 'r');
      const fileStream = stream.createReadStream();

      const result = await probe(fileStream);
      await stream.close();

      this.logger.info(`✓ Got dimensions from file: ${result.width}×${result.height} (${result.type}) - ${filePath.substring(filePath.lastIndexOf('/') + 1)}`);

      return {
        width: result.width,
        height: result.height,
        type: result.type,
      };
    } catch (error) {
      const errorCode = (error as any).code;
      if (errorCode === 'ENOENT') {
        this.logger.warn(`✗ File not found: ${filePath}`);
      } else {
        this.logger.warn(`✗ Failed to get dimensions from file ${filePath}: ${(error as Error).message}`);
      }
      return null;
    }
  }

  /**
   * Get image dimensions from a URL
   * @param url Image URL
   * @returns Image dimensions or null if failed
   */
  async getImageDimensionsFromUrl(url: string): Promise<ImageDimensions | null> {
    try {
      this.logger.debug(`Probing image dimensions from: ${url}`);

      const result = await probe(url, {
        timeout: 20000, // 20 second timeout (increased for slow servers)
        headers: {
          'User-Agent': 'Echo-Music-Server/1.0.0',
          'Accept': 'image/*',
        },
      });

      this.logger.info(`✓ Got dimensions from URL: ${result.width}×${result.height} (${result.type}) - ${url.substring(0, 80)}...`);

      return {
        width: result.width,
        height: result.height,
        type: result.type,
      };
    } catch (error) {
      this.logger.warn(`⚠️ Direct probe failed: ${(error as Error).message} - trying buffer probe fallback...`);

      // Fallback 1: Download first ~50KB and probe the buffer
      // This works better for URLs with redirects or special handling
      try {
        this.logger.debug(`Fetching partial content from: ${url.substring(0, 80)}...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Echo-Music-Server/1.0.0',
            'Accept': 'image/*',
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new ExternalApiError('ImageDownload', response.status, response.statusText);
        }

        // Read first 50KB (enough for dimension detection)
        const reader = response.body?.getReader();
        if (!reader) {
          throw new ImageProcessingError('DOWNLOAD_FAILED', 'No response body');
        }

        const chunks: Uint8Array[] = [];
        let totalLength = 0;
        const maxBytes = 50 * 1024; // 50KB

        while (totalLength < maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            totalLength += value.length;
          }
        }

        // Cancel the rest of the download
        reader.cancel();

        // Combine chunks into single buffer
        const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));

        // Create a stream from the buffer
        const { Readable } = await import('stream');
        const bufferStream = Readable.from(buffer);

        // Probe the buffer stream
        const result = await probe(bufferStream);

        this.logger.info(`✓ Got dimensions from buffer probe: ${result.width}×${result.height} (${result.type}) - ${url.substring(0, 80)}...`);

        return {
          width: result.width,
          height: result.height,
          type: result.type,
        };
      } catch (bufferError) {
        this.logger.error(`✗ Buffer probe also failed: ${(bufferError as Error).message}`);

        // Fallback 2: make a HEAD request to at least confirm the image exists
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Echo-Music-Server/1.0.0',
            },
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            this.logger.warn(`✗ Image exists (${contentType}) but couldn't probe dimensions - ${url.substring(0, 80)}...`);
          }
        } catch (fetchError) {
          this.logger.error(`✗ Image URL not accessible: ${(fetchError as Error).message}`);
        }

        return null;
      }
    }
  }

  /**
   * Check if an image should be considered "high quality"
   * Based on minimum resolution threshold
   * @param dimensions Image dimensions
   * @param minWidth Minimum width (default 1000px)
   * @param minHeight Minimum height (default 1000px)
   * @returns true if high quality
   */
  isHighQuality(
    dimensions: ImageDimensions,
    minWidth = 1000,
    minHeight = 1000
  ): boolean {
    return dimensions.width >= minWidth && dimensions.height >= minHeight;
  }

  /**
   * Compare two images and determine if the new one is significantly better
   * @param currentDimensions Current image dimensions
   * @param newDimensions New image dimensions
   * @param improvementThreshold Minimum improvement percentage (default 50%)
   * @returns true if new image is significantly better
   */
  isSignificantImprovement(
    currentDimensions: ImageDimensions,
    newDimensions: ImageDimensions,
    improvementThreshold = 0.5 // 50% larger
  ): boolean {
    if (!currentDimensions || !newDimensions) return false;

    const currentPixels = currentDimensions.width * currentDimensions.height;
    const newPixels = newDimensions.width * newDimensions.height;

    // New image has 50% more pixels
    const improvement = (newPixels - currentPixels) / currentPixels;
    return improvement >= improvementThreshold;
  }

  /**
   * Validate if a buffer contains a valid image
   * Checks magic bytes for common image formats
   * @param buffer Buffer to validate
   * @returns true if valid image
   */
  private isValidImageBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }

    // Check magic bytes for common image formats
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }

    // GIF: 47 49 46
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return true;
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length >= 12
    ) {
      if (
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get image format from buffer
   * @param buffer Image buffer
   * @returns Format string (jpg, png, gif, webp) or null
   */
  getImageFormat(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) {
      return null;
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpg';
    }

    // PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'png';
    }

    // GIF
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'gif';
    }

    // WebP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'webp';
    }

    return null;
  }
}
