import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '../storage.service';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  artists,
  albums,
  customArtistImages,
  customAlbumCovers,
} from '@infrastructure/database/schema';

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  filesRemoved: number;
  spaceFree: number;
  orphanedFiles: string[];
  errors: string[];
  duration: number;
}

/**
 * Service for detecting and removing orphaned metadata files
 * (files on disk without references in database)
 */
@Injectable()
export class OrphanedFileCleanerService {
  constructor(
    @InjectPinoLogger(OrphanedFileCleanerService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Clean orphaned files for both artists and albums
   */
  async cleanupOrphanedFiles(dryRun = true): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      filesRemoved: 0,
      spaceFree: 0,
      orphanedFiles: [],
      errors: [],
      duration: 0,
    };

    try {
      this.logger.info(`Starting orphaned files cleanup (dry run: ${dryRun})`);

      // 1. Clean orphaned artist files
      const artistCleanup = await this.cleanupArtistFiles(dryRun);
      this.mergeResults(result, artistCleanup);

      // 2. Clean orphaned album files
      const albumCleanup = await this.cleanupAlbumFiles(dryRun);
      this.mergeResults(result, albumCleanup);

      // 3. Clean inactive database records (only in real mode)
      if (!dryRun) {
        await this.cleanupInactiveRecords(result);
      }

      result.duration = Date.now() - startTime;

      this.logger.info(
        `Orphaned files cleanup completed: ${result.filesRemoved} files removed, ` +
          `${(result.spaceFree / 1024 / 1024).toFixed(2)} MB freed in ${result.duration}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Orphaned files cleanup failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      result.errors.push((error as Error).message);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Clean orphaned artist files
   */
  async cleanupArtistFiles(dryRun: boolean): Promise<CleanupResult> {
    const result = this.createEmptyResult();

    try {
      const basePath = await this.storage.getStoragePath();
      const artistsPath = path.join(basePath, 'artists');

      if (!(await this.directoryExists(artistsPath))) {
        return result;
      }

      // Get all artist IDs from database
      const dbArtists = await this.drizzle.db.select({ id: artists.id }).from(artists);
      const dbArtistIds = new Set(dbArtists.map((a) => a.id));

      // List directories in /storage/metadata/artists/
      const artistDirs = await fs.readdir(artistsPath);

      for (const dirName of artistDirs) {
        if (!dbArtistIds.has(dirName)) {
          await this.processOrphanedDirectory(
            path.join(artistsPath, dirName),
            dryRun,
            result,
            'artist',
          );
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup artist files: ${(error as Error).message}`,
        (error as Error).stack,
      );
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Clean orphaned album files
   */
  async cleanupAlbumFiles(dryRun: boolean): Promise<CleanupResult> {
    const result = this.createEmptyResult();

    try {
      const basePath = await this.storage.getStoragePath();
      const albumsPath = path.join(basePath, 'albums');

      if (!(await this.directoryExists(albumsPath))) {
        return result;
      }

      // Get all album IDs from database
      const dbAlbums = await this.drizzle.db.select({ id: albums.id }).from(albums);
      const dbAlbumIds = new Set(dbAlbums.map((a) => a.id));

      // List directories in /storage/metadata/albums/
      const albumDirs = await fs.readdir(albumsPath);

      for (const dirName of albumDirs) {
        if (!dbAlbumIds.has(dirName)) {
          await this.processOrphanedDirectory(
            path.join(albumsPath, dirName),
            dryRun,
            result,
            'album',
          );
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup album files: ${(error as Error).message}`,
        (error as Error).stack,
      );
      result.errors.push((error as Error).message);
      return result;
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private createEmptyResult(): CleanupResult {
    return {
      filesRemoved: 0,
      spaceFree: 0,
      orphanedFiles: [],
      errors: [],
      duration: 0,
    };
  }

  private mergeResults(target: CleanupResult, source: CleanupResult): void {
    target.filesRemoved += source.filesRemoved;
    target.spaceFree += source.spaceFree;
    target.orphanedFiles.push(...source.orphanedFiles);
    target.errors.push(...source.errors);
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      await fs.access(dirPath);
      return true;
    } catch {
      return false;
    }
  }

  private async processOrphanedDirectory(
    dirPath: string,
    dryRun: boolean,
    result: CleanupResult,
    entityType: string,
  ): Promise<void> {
    try {
      const size = await this.storage.getStorageSize(dirPath);
      result.spaceFree += size;

      const files = await this.listAllFiles(dirPath);
      result.filesRemoved += files.length;
      result.orphanedFiles.push(...files);

      if (!dryRun) {
        await fs.rm(dirPath, { recursive: true, force: true });
        this.logger.info(`Removed orphaned ${entityType} directory: ${dirPath}`);
      } else {
        this.logger.debug(`Would remove: ${dirPath} (${files.length} files)`);
      }
    } catch (error) {
      const errorMsg = `Failed to process ${dirPath}: ${(error as Error).message}`;
      this.logger.warn(errorMsg);
      result.errors.push(errorMsg);
    }
  }

  private async cleanupInactiveRecords(result: CleanupResult): Promise<void> {
    try {
      const deletedArtistImages = await this.drizzle.db
        .delete(customArtistImages)
        .where(eq(customArtistImages.isActive, false))
        .returning();

      const deletedAlbumCovers = await this.drizzle.db
        .delete(customAlbumCovers)
        .where(eq(customAlbumCovers.isActive, false))
        .returning();

      this.logger.info(
        `Deleted inactive records: ${deletedArtistImages.length} artist images, ${deletedAlbumCovers.length} album covers`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete inactive records: ${(error as Error).message}`);
      result.errors.push(`Failed to delete inactive records: ${(error as Error).message}`);
    }
  }

  private async listAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to list files in ${dirPath}: ${(error as Error).message}`);
    }

    return files;
  }
}
