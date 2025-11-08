import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SettingsService } from './settings.service';

/**
 * Storage Service
 * Manages file system operations for external metadata
 *
 * Handles two storage strategies:
 * - Centralized: /storage/metadata (default)
 * - Portable: /music/.echo-metadata (in music library)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private basePath: string = '';
  private initialized = false;

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService
  ) {}

  /**
   * Initialize storage paths
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const storageLocation = await this.settings.getString(
        'metadata.storage.location',
        'centralized'
      );

      if (storageLocation === 'centralized') {
        const storagePath = await this.settings.getString(
          'metadata.storage.path',
          '/storage/metadata'
        );
        this.basePath = path.resolve(process.cwd(), storagePath.replace(/^\//, ''));
      } else {
        // Portable: use music library path
        const musicPath = this.config.get<string>('MUSIC_PATH', '/music');
        this.basePath = path.join(musicPath, '.echo-metadata');
      }

      // Ensure base directories exist
      await this.ensureDirectoryExists(this.basePath);
      await this.ensureDirectoryExists(path.join(this.basePath, 'artists'));
      await this.ensureDirectoryExists(path.join(this.basePath, 'albums'));
      await this.ensureDirectoryExists(path.join(this.basePath, 'defaults'));

      // User storage (separate from metadata)
      const userStoragePath = path.resolve(process.cwd(), 'storage', 'users');
      await this.ensureDirectoryExists(userStoragePath);

      // Copy default images if they don't exist
      await this.initializeDefaultImages();

      this.initialized = true;
      this.logger.log(`Storage initialized at: ${this.basePath}`);
    } catch (error) {
      this.logger.error(`Failed to initialize storage: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Get base storage path
   */
  async getBasePath(): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.basePath;
  }

  /**
   * Alias for getBasePath() - for compatibility
   */
  async getStoragePath(): Promise<string> {
    return this.getBasePath();
  }

  /**
   * Get metadata path for an artist
   * Returns: /storage/metadata/artists/{artist-id}/
   */
  async getArtistMetadataPath(artistId: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const artistPath = path.join(this.basePath, 'artists', artistId);
    await this.ensureDirectoryExists(artistPath);
    return artistPath;
  }

  /**
   * Get metadata path for an album
   * Returns: /storage/metadata/albums/{album-id}/
   */
  async getAlbumMetadataPath(albumId: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const albumPath = path.join(this.basePath, 'albums', albumId);
    await this.ensureDirectoryExists(albumPath);
    return albumPath;
  }

  /**
   * Get the folder path where an album's music files are located
   * This is where we'll save cover.jpg
   */
  async getAlbumFolderPath(albumPath: string): Promise<string> {
    // albumPath should be the path field from the album record
    // It typically points to a track, so we get its directory
    return path.dirname(albumPath);
  }

  /**
   * Get storage path for a user
   * Returns: /storage/users/{user-id}/
   * This is separate from metadata storage
   */
  async getUserStoragePath(userId: string): Promise<string> {
    const userStorageBase = path.resolve(process.cwd(), 'storage', 'users');
    const userPath = path.join(userStorageBase, userId);
    await this.ensureDirectoryExists(userPath);
    return userPath;
  }

  /**
   * Get avatar path for a user
   * Returns: /storage/users/{user-id}/avatar.{ext}
   */
  async getUserAvatarPath(userId: string, extension: string): Promise<string> {
    const userPath = await this.getUserStoragePath(userId);
    return path.join(userPath, `avatar.${extension}`);
  }

  /**
   * Save an image file
   * @param filePath Full path where to save
   * @param buffer Image buffer
   */
  async saveImage(filePath: string, buffer: Buffer): Promise<void> {
    try {
      // Ensure parent directory exists
      await this.ensureDirectoryExists(path.dirname(filePath));

      // Write file
      await fs.writeFile(filePath, buffer);

      this.logger.debug(`Saved image: ${filePath} (${buffer.length} bytes)`);
    } catch (error) {
      this.logger.error(`Error saving image ${filePath}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Read an image file
   * @param filePath Full path to read
   * @returns Image buffer or null if not found
   */
  async readImage(filePath: string): Promise<Buffer | null> {
    try {
      const exists = await this.fileExists(filePath);
      if (!exists) {
        return null;
      }

      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Error reading image ${filePath}: ${(error as Error).message}`, (error as Error).stack);
      return null;
    }
  }

  /**
   * Delete an image file
   * @param filePath Full path to delete
   */
  async deleteImage(filePath: string): Promise<void> {
    try {
      const exists = await this.fileExists(filePath);
      if (exists) {
        await fs.unlink(filePath);
        this.logger.debug(`Deleted image: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting image ${filePath}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Get total storage size for a directory
   * @param dirPath Directory path
   * @returns Size in bytes
   */
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
      this.logger.error(`Error calculating storage size for ${dirPath}: ${(error as Error).message}`, (error as Error).stack);
      return 0;
    }
  }

  /**
   * Check if storage size exceeds limit
   * @param dirPath Directory to check
   * @returns true if exceeds limit
   */
  async exceedsStorageLimit(dirPath: string): Promise<boolean> {
    try {
      const maxSizeMB = await this.settings.getNumber('metadata.storage.max_size_mb', 500);
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      const currentSize = await this.getStorageSize(dirPath);

      return currentSize > maxSizeBytes;
    } catch (error) {
      this.logger.error(`Error checking storage limit: ${(error as Error).message}`, (error as Error).stack);
      return false;
    }
  }

  /**
   * Clean up orphaned files (files without corresponding DB entries)
   * Returns number of deleted directories
   */
  async cleanupOrphanedFiles(): Promise<number> {
    // This will be implemented when we integrate with the database
    // For now, return 0
    this.logger.warn('cleanupOrphanedFiles not fully implemented yet');
    return 0;
  }

  /**
   * Ensure a directory exists, create if it doesn't
   * @param dirPath Directory path
   */
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Check if a file exists
   * @param filePath File path
   * @returns true if exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   * @param dirPath Directory path
   * @returns true if exists
   */
  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Delete a directory and all its contents
   * @param dirPath Directory path
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      const exists = await this.directoryExists(dirPath);
      if (exists) {
        await fs.rm(dirPath, { recursive: true, force: true });
        this.logger.debug(`Deleted directory: ${dirPath}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting directory ${dirPath}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * List files in a directory
   * @param dirPath Directory path
   * @returns Array of file names
   */
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
      this.logger.error(`Error listing files in ${dirPath}: ${(error as Error).message}`, (error as Error).stack);
      return [];
    }
  }

  /**
   * Get file size
   * @param filePath File path
   * @returns Size in bytes or 0 if not found
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Initialize default images (copy from frontend assets)
   * This ensures default images are available even in production
   */
  private async initializeDefaultImages(): Promise<void> {
    try {
      const defaultCoverDest = path.join(this.basePath, 'defaults', 'album-cover-default.png');

      // Check if default cover already exists
      const exists = await this.fileExists(defaultCoverDest);
      if (exists) {
        this.logger.debug('Default album cover already exists');
        return;
      }

      // Source path: frontend public images
      const defaultCoverSrc = path.resolve(
        process.cwd(),
        '../frontend/public/images/empy_cover/empy_cover_default.png'
      );

      // Check if source exists
      const srcExists = await this.fileExists(defaultCoverSrc);
      if (!srcExists) {
        this.logger.warn(
          `Default cover source not found at ${defaultCoverSrc}. Default images will not be available.`
        );
        return;
      }

      // Copy default cover
      await fs.copyFile(defaultCoverSrc, defaultCoverDest);
      this.logger.log('Default album cover initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize default images: ${(error as Error).message}. Default images may not be available.`
      );
      // Don't throw - this is not critical for app startup
    }
  }
}
