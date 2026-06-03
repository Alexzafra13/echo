import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SettingsService } from '@infrastructure/settings';

/**
 * Operaciones de ficheros para los metadatos externos. Dos estrategias:
 * centralizada (/storage/metadata, por defecto) o portable (.echo-metadata en la música).
 */
@Injectable()
export class StorageService {
  private basePath: string = '';
  private initialized = false;

  constructor(
    @InjectPinoLogger(StorageService.name)
    private readonly logger: PinoLogger,
    private readonly config: ConfigService,
    private readonly settings: SettingsService
  ) {}

  // Prioridad de rutas: variables de entorno > settings en BD > valores por defecto
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // En tests, usa un directorio temporal para evitar problemas de permisos
      const isTestEnv = process.env.NODE_ENV === 'test';
      const tempBase = isTestEnv ? path.join(os.tmpdir(), 'echo-test-storage') : null;

      const envStorageMode = this.config.get<string>('METADATA_STORAGE_MODE');
      const storageLocation =
        envStorageMode ||
        (await this.settings.getString('metadata.storage.location', 'centralized'));

      if (storageLocation === 'centralized') {
        const envStoragePath = this.config.get<string>('METADATA_STORAGE_PATH');
        const dataPath = tempBase || this.config.get<string>('DATA_PATH', '/app/data');
        const defaultPath = path.join(dataPath, 'metadata');
        const storagePath =
          envStoragePath || (await this.settings.getString('metadata.storage.path', defaultPath));
        // Ruta absoluta si empieza por /, si no se resuelve respecto al cwd
        this.basePath = storagePath.startsWith('/')
          ? storagePath
          : path.resolve(process.cwd(), storagePath);
        // En tests, fuerza el temporal
        if (isTestEnv && !envStoragePath) {
          this.basePath = path.join(tempBase!, 'metadata');
        }
      } else {
        // Portable: dentro de la biblioteca de música
        const musicPath = this.config.get<string>('MUSIC_LIBRARY_PATH', '/music');
        this.basePath = isTestEnv
          ? path.join(tempBase!, 'metadata')
          : path.join(musicPath, '.echo-metadata');
      }

      // Crea los directorios base
      await this.ensureDirectoryExists(this.basePath);
      await this.ensureDirectoryExists(path.join(this.basePath, 'artists'));
      await this.ensureDirectoryExists(path.join(this.basePath, 'albums'));
      await this.ensureDirectoryExists(path.join(this.basePath, 'defaults'));

      // Almacenamiento de usuarios (aparte de los metadatos)
      const dataPath = tempBase || this.config.get<string>('DATA_PATH', '/app/data');
      const userStoragePath = path.join(dataPath, 'uploads', 'users');
      await this.ensureDirectoryExists(userStoragePath);

      // Imágenes de emisoras de radio
      const radioStoragePath = path.join(dataPath, 'uploads', 'radio');
      await this.ensureDirectoryExists(radioStoragePath);

      // Copia las imágenes por defecto si faltan
      await this.initializeDefaultImages();

      this.initialized = true;
      this.logger.info(
        `Storage initialized at: ${this.basePath} (mode: ${storageLocation}${isTestEnv ? ', test' : ''})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize storage: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  async getBasePath(): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.basePath;
  }

  // Alias de getBasePath() por compatibilidad
  async getStoragePath(): Promise<string> {
    return this.getBasePath();
  }

  // Metadatos del artista: /storage/metadata/artists/{id}/
  async getArtistMetadataPath(artistId: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const artistPath = path.join(this.basePath, 'artists', artistId);
    await this.ensureDirectoryExists(artistPath);
    return artistPath;
  }

  // Metadatos del álbum: /storage/metadata/albums/{id}/
  async getAlbumMetadataPath(albumId: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const albumPath = path.join(this.basePath, 'albums', albumId);
    await this.ensureDirectoryExists(albumPath);
    return albumPath;
  }

  // Carpeta donde están los archivos del álbum (ahí se guarda cover.jpg).
  // albumPath suele apuntar a un track, así que devolvemos su carpeta.
  async getAlbumFolderPath(albumPath: string): Promise<string> {
    return path.dirname(albumPath);
  }

  // Almacenamiento del usuario (aparte de los metadatos): {DATA_PATH}/uploads/users/{id}/
  async getUserStoragePath(userId: string): Promise<string> {
    const dataPath = this.config.get<string>('DATA_PATH', '/app/data');
    const userStorageBase = path.join(dataPath, 'uploads', 'users');
    const userPath = path.join(userStorageBase, userId);
    await this.ensureDirectoryExists(userPath);
    return userPath;
  }

  async getUserAvatarPath(userId: string, extension: string): Promise<string> {
    const userPath = await this.getUserStoragePath(userId);
    return path.join(userPath, `avatar.${extension}`);
  }

  async getRadioFaviconPath(stationUuid: string, extension: string): Promise<string> {
    const dataPath = this.config.get<string>('DATA_PATH', '/app/data');
    const radioStorageBase = path.join(dataPath, 'uploads', 'radio');
    const stationPath = path.join(radioStorageBase, stationUuid);
    await this.ensureDirectoryExists(stationPath);
    return path.join(stationPath, `favicon.${extension}`);
  }

  /**
   * Guarda una imagen con escritura atómica (temp + rename) para evitar
   * bloqueos de fichero en Windows; reintenta y usa fallbacks si hace falta.
   */
  async saveImage(filePath: string, buffer: Buffer): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDirectoryExists(dir);

      // Si el destino ya existe y es idéntico, no reescribe
      const destExists = await this.fileExists(filePath);
      if (destExists) {
        try {
          const existingBuffer = await fs.readFile(filePath);
          if (existingBuffer.equals(buffer)) {
            this.logger.debug(`Skipping save: ${filePath} is already identical`);
            return;
          }
        } catch (readError) {
          // Puede estar bloqueado; sigue con el intento de escritura
          this.logger.debug(
            `Could not read existing file for comparison: ${(readError as Error).message}`
          );
        }
      }

      // Escribe primero en un temporal (evita conflictos de bloqueo)
      const tempPath = `${filePath}.tmp.${Date.now()}`;

      try {
        await fs.writeFile(tempPath, buffer);

        // Rename atómico con reintentos para Windows
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            await fs.rename(tempPath, filePath);
            this.logger.debug(`Saved image: ${filePath} (${buffer.length} bytes)`);
            return;
          } catch (renameError) {
            lastError = renameError as Error;
            const isEperm = (renameError as NodeJS.ErrnoException).code === 'EPERM';

            if (isEperm && attempt < maxRetries) {
              // Bloqueo de Windows: espera y reintenta
              const waitMs = attempt * 100; // 100ms, 200ms, 300ms
              this.logger.debug(
                `Rename failed (EPERM), retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})`
              );
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            } else if (isEperm && attempt === maxRetries) {
              // Último intento: fallback de Windows (borrar + rename)
              this.logger.debug('Trying Windows fallback: delete + rename');
              try {
                if (destExists) {
                  await fs.unlink(filePath);
                  // pequeña pausa tras borrar
                  await new Promise((resolve) => setTimeout(resolve, 50));
                }
                await fs.rename(tempPath, filePath);
                this.logger.debug(
                  `Saved image using fallback: ${filePath} (${buffer.length} bytes)`
                );
                return;
              } catch (fallbackError) {
                lastError = fallbackError as Error;
                break;
              }
            } else {
              // Error que no es EPERM
              throw renameError;
            }
          }
        }

        throw lastError || new Error('Failed to save image after retries');
      } catch (writeError) {
        // Limpia el temporal si algo falló
        try {
          await fs.unlink(tempPath);
        } catch (unlinkError) {
          this.logger.warn(unlinkError, `Failed to clean up temp file: ${tempPath}`);
        }
        throw writeError;
      }
    } catch (error) {
      this.logger.error(
        `Error saving image ${filePath}: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  async readImage(filePath: string): Promise<Buffer | null> {
    try {
      const exists = await this.fileExists(filePath);
      if (!exists) {
        return null;
      }

      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(
        `Error reading image ${filePath}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  async deleteImage(filePath: string): Promise<void> {
    try {
      const exists = await this.fileExists(filePath);
      if (exists) {
        await fs.unlink(filePath);
        this.logger.debug(`Deleted image: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting image ${filePath}: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  // Tamaño total (bytes) de un directorio, recursivo
  async getStorageSize(dirPath: string): Promise<number> {
    try {
      const exists = await this.directoryExists(dirPath);
      if (!exists) {
        return 0;
      }

      let totalSize = 0;
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          totalSize += await this.getStorageSize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      this.logger.error(
        `Error calculating storage size for ${dirPath}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return 0;
    }
  }

  // ¿El directorio supera el límite de almacenamiento configurado?
  async exceedsStorageLimit(dirPath: string): Promise<boolean> {
    try {
      const maxSizeMB = await this.settings.getNumber('metadata.storage.max_size_mb', 500);
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      const currentSize = await this.getStorageSize(dirPath);

      return currentSize > maxSizeBytes;
    } catch (error) {
      this.logger.error(
        `Error checking storage limit: ${(error as Error).message}`,
        (error as Error).stack
      );
      return false;
    }
  }

  // Crea el directorio si no existe
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Created directory: ${dirPath}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  // Borra un directorio y todo su contenido
  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      const exists = await this.directoryExists(dirPath);
      if (exists) {
        await fs.rm(dirPath, { recursive: true, force: true });
        this.logger.debug(`Deleted directory: ${dirPath}`);
      }
    } catch (error) {
      this.logger.error(
        `Error deleting directory ${dirPath}: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    try {
      const exists = await this.directoryExists(dirPath);
      if (!exists) {
        return [];
      }

      const files = await fs.readdir(dirPath);
      return files.filter(async (file) => {
        const fullPath = path.join(dirPath, file);
        const stats = await fs.stat(fullPath);
        return stats.isFile();
      });
    } catch (error) {
      this.logger.error(
        `Error listing files in ${dirPath}: ${(error as Error).message}`,
        (error as Error).stack
      );
      return [];
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  // Copia las imágenes por defecto desde los assets del frontend (para que existan también en producción)
  private async initializeDefaultImages(): Promise<void> {
    try {
      const defaultCoverDest = path.join(this.basePath, 'defaults', 'album-cover-default.png');

      const exists = await this.fileExists(defaultCoverDest);
      if (exists) {
        this.logger.debug('Default album cover already exists');
        return;
      }

      // Prueba varias rutas de origen (dev vs producción en Docker)
      const candidatePaths = [
        // Dev: web/public/ junto a api/
        path.resolve(
          process.cwd(),
          '..',
          'web',
          'public',
          'images',
          'empy_cover',
          'empy_cover_default.png'
        ),
        // Producción Docker: assets compilados en web/dist/
        path.resolve(
          process.cwd(),
          '..',
          'web',
          'dist',
          'images',
          'empy_cover',
          'empy_cover_default.png'
        ),
        // Producción Docker (estructura plana): /app/web/dist/
        path.resolve(
          process.cwd(),
          'web',
          'dist',
          'images',
          'empy_cover',
          'empy_cover_default.png'
        ),
      ];

      let defaultCoverSrc: string | null = null;
      for (const candidate of candidatePaths) {
        if (await this.fileExists(candidate)) {
          defaultCoverSrc = candidate;
          break;
        }
      }

      if (!defaultCoverSrc) {
        // Genera un PNG mínimo de relleno
        this.logger.warn(
          `Default cover source not found in any candidate path. Generating placeholder.`
        );
        await this.generatePlaceholderCover(defaultCoverDest);
        return;
      }

      await fs.copyFile(defaultCoverSrc, defaultCoverDest);
      this.logger.info('Default album cover initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize default images: ${(error as Error).message}. Default images may not be available.`
      );
      // No relanza: no es crítico para arrancar
    }
  }

  // Genera un PNG de 1x1 como relleno cuando no se encuentra la portada por defecto
  private async generatePlaceholderCover(destPath: string): Promise<void> {
    // PNG válido mínimo: 1x1, gris (#808080)
    const pngHeader = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52, // IHDR chunk
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01, // 1x1
      0x08,
      0x02,
      0x00,
      0x00,
      0x00,
      0x90,
      0x77,
      0x53, // 8-bit RGB
      0xde,
      0x00,
      0x00,
      0x00,
      0x0c,
      0x49,
      0x44,
      0x41, // IDAT chunk
      0x54,
      0x08,
      0xd7,
      0x63,
      0xd8,
      0xd0,
      0xd0,
      0x00, // compressed data
      0x00,
      0x00,
      0x04,
      0x00,
      0x01,
      0xa3,
      0x1c,
      0xac, // ...
      0x34,
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e, // IEND chunk
      0x44,
      0xae,
      0x42,
      0x60,
      0x82,
    ]);
    await fs.writeFile(destPath, pngHeader);
    this.logger.info('Generated placeholder cover image');
  }
}
