import { Injectable } from '@nestjs/common';
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

// Descarga imágenes desde URLs externas y las guarda en local
@Injectable()
export class ImageDownloadService {
  // Timeout de descarga (30 s)
  private readonly DOWNLOAD_TIMEOUT = 30000;

  // Tamaño máximo de imagen (10 MB)
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  constructor(
    @InjectPinoLogger(ImageDownloadService.name)
    private readonly logger: PinoLogger,
    private readonly storage: StorageService
  ) {}

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

      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        throw new ImageProcessingError('INVALID_CONTENT_TYPE', contentType || 'unknown');
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.MAX_IMAGE_SIZE) {
        throw new ImageProcessingError('FILE_TOO_LARGE', `${contentLength} bytes`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > this.MAX_IMAGE_SIZE) {
        throw new ImageProcessingError('FILE_TOO_LARGE', `${buffer.length} bytes`);
      }

      // Comprueba que de verdad es una imagen
      if (!this.isValidImageBuffer(buffer)) {
        throw new ImageProcessingError('INVALID_IMAGE');
      }

      this.logger.debug(`Downloaded image: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      this.logger.error(
        `Error downloading image from ${url}: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

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

  // Descarga varias imágenes en paralelo (de 3 en 3)
  async downloadMultiple(urls: string[]): Promise<Map<string, Buffer>> {
    const results = new Map<string, Buffer>();

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

  // Descarga y guarda las distintas tallas (small/medium/large) con el prefijo dado
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

    if (urls.small) {
      try {
        const path = `${basePath}/${prefix}-small.jpg`;
        await this.downloadAndSave(urls.small, path);
        result.smallPath = path;
      } catch (error) {
        this.logger.warn(`Failed to download small image: ${(error as Error).message}`);
      }
    }

    if (urls.medium) {
      try {
        const path = `${basePath}/${prefix}-medium.jpg`;
        await this.downloadAndSave(urls.medium, path);
        result.mediumPath = path;
      } catch (error) {
        this.logger.warn(`Failed to download medium image: ${(error as Error).message}`);
      }
    }

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

  // Dimensiones de una imagen local (null si no existe o no es válida)
  async getImageDimensionsFromFile(filePath: string): Promise<ImageDimensions | null> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        this.logger.warn(`Path is not a file: ${filePath}`);
        return null;
      }

      const stream = await fs.open(filePath, 'r');
      const fileStream = stream.createReadStream();

      const result = await probe(fileStream);
      await stream.close();

      this.logger.info(
        `Got dimensions from file: ${result.width}×${result.height} (${result.type}) - ${filePath.substring(filePath.lastIndexOf('/') + 1)}`
      );

      return {
        width: result.width,
        height: result.height,
        type: result.type,
      };
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode === 'ENOENT') {
        this.logger.warn(`File not found: ${filePath}`);
      } else {
        this.logger.warn(
          `Failed to get dimensions from file ${filePath}: ${(error as Error).message}`
        );
      }
      return null;
    }
  }

  // Dimensiones de una imagen por URL (null si falla)
  async getImageDimensionsFromUrl(url: string): Promise<ImageDimensions | null> {
    try {
      this.logger.debug(`Probing image dimensions from: ${url}`);

      const result = await probe(url, {
        timeout: 20000, // 20 s (subido por servidores lentos)
        headers: {
          'User-Agent': 'Echo-Music-Server/1.0.0',
          Accept: 'image/*',
        },
      });

      this.logger.info(
        `Got dimensions from URL: ${result.width}×${result.height} (${result.type}) - ${url.substring(0, 80)}...`
      );

      return {
        width: result.width,
        height: result.height,
        type: result.type,
      };
    } catch (error) {
      this.logger.warn(
        `Direct probe failed: ${(error as Error).message} - trying buffer probe fallback...`
      );

      // Fallback 1: descarga ~50KB y analiza el buffer (mejor con redirecciones)
      try {
        this.logger.debug(`Fetching partial content from: ${url.substring(0, 80)}...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Echo-Music-Server/1.0.0',
            Accept: 'image/*',
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new ExternalApiError('ImageDownload', response.status, response.statusText);
        }

        // Primeros 50KB (bastan para detectar dimensiones)
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

        // Cancela el resto de la descarga
        reader.cancel();

        const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

        const { Readable } = await import('stream');
        const bufferStream = Readable.from(buffer);

        const result = await probe(bufferStream);

        this.logger.info(
          `Got dimensions from buffer probe: ${result.width}×${result.height} (${result.type}) - ${url.substring(0, 80)}...`
        );

        return {
          width: result.width,
          height: result.height,
          type: result.type,
        };
      } catch (bufferError) {
        this.logger.error(`Buffer probe also failed: ${(bufferError as Error).message}`);

        // Fallback 2: un HEAD para al menos confirmar que la imagen existe
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Echo-Music-Server/1.0.0',
            },
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            this.logger.warn(
              `Image exists (${contentType}) but couldn't probe dimensions - ${url.substring(0, 80)}...`
            );
          }
        } catch (fetchError) {
          this.logger.error(`Image URL not accessible: ${(fetchError as Error).message}`);
        }

        return null;
      }
    }
  }

  // "Alta calidad" = supera la resolución mínima (por defecto 1000x1000)
  isHighQuality(dimensions: ImageDimensions, minWidth = 1000, minHeight = 1000): boolean {
    return dimensions.width >= minWidth && dimensions.height >= minHeight;
  }

  // ¿La imagen nueva es bastante mejor? (por defecto, 50% más píxeles)
  isSignificantImprovement(
    currentDimensions: ImageDimensions,
    newDimensions: ImageDimensions,
    improvementThreshold = 0.5 // 50% larger
  ): boolean {
    if (!currentDimensions || !newDimensions) return false;

    const currentPixels = currentDimensions.width * currentDimensions.height;
    const newPixels = newDimensions.width * newDimensions.height;

    const improvement = (newPixels - currentPixels) / currentPixels;
    return improvement >= improvementThreshold;
  }

  // Valida que el buffer sea una imagen por sus magic bytes
  private isValidImageBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
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
      if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return true;
      }
    }

    return false;
  }

  // Formato de la imagen según sus magic bytes (jpg/png/gif/webp) o null
  getImageFormat(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) {
      return null;
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpg';
    }

    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
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
