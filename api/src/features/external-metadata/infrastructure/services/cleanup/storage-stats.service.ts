import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { StorageService } from '../storage.service';
import { eq, or, isNotNull, count, sum } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { artists, albums } from '@infrastructure/database/schema';

/**
 * Storage statistics
 */
export interface StorageStats {
  totalSize: number;
  artistsWithMetadata: number;
  albumsWithCovers: number;
  totalFiles: number;
  orphanedFiles: number;
  avgSizePerArtist: number;
}

/**
 * Integrity check result
 */
export interface IntegrityResult {
  totalChecked: number;
  missing: string[];
  errors: string[];
}

/**
 * Service for storage statistics and integrity verification
 */
@Injectable()
export class StorageStatsService {
  private readonly logger = new Logger(StorageStatsService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Generate storage usage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      // Count artists with metadata
      const artistsCountResult = await this.drizzle.db
        .select({ count: count() })
        .from(artists)
        .where(
          or(
            isNotNull(artists.externalProfilePath),
            isNotNull(artists.externalBackgroundPath),
            isNotNull(artists.externalBannerPath),
            isNotNull(artists.externalLogoPath),
          ),
        );
      const artistsWithMetadata = artistsCountResult[0]?.count || 0;

      // Count albums with external covers
      const albumsCountResult = await this.drizzle.db
        .select({ count: count() })
        .from(albums)
        .where(isNotNull(albums.externalCoverPath));
      const albumsWithCovers = albumsCountResult[0]?.count || 0;

      // Calculate total size
      const sizeSumResult = await this.drizzle.db
        .select({ sum: sum(artists.metadataStorageSize) })
        .from(artists)
        .where(isNotNull(artists.metadataStorageSize));

      const totalSize = Number(sizeSumResult[0]?.sum || 0);

      // Count files on disk
      const basePath = await this.storage.getStoragePath();
      const totalFiles = await this.countFilesInDirectory(path.join(basePath, 'artists'));

      // Calculate average
      const avgSizePerArtist =
        artistsWithMetadata > 0 ? totalSize / artistsWithMetadata : 0;

      return {
        totalSize,
        artistsWithMetadata,
        albumsWithCovers,
        totalFiles,
        orphanedFiles: 0, // Calculated in cleanup
        avgSizePerArtist,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get storage stats: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Recalculate storage sizes for all artists with metadata
   */
  async recalculateStorageSizes(): Promise<{ updated: number; errors: string[] }> {
    const result: { updated: number; errors: string[] } = {
      updated: 0,
      errors: [],
    };

    try {
      this.logger.log('Recalculating storage sizes...');

      // Get all artists with external metadata
      const artistsWithMetadata = await this.drizzle.db
        .select({
          id: artists.id,
          name: artists.name,
        })
        .from(artists)
        .where(
          or(
            isNotNull(artists.externalProfilePath),
            isNotNull(artists.externalBackgroundPath),
            isNotNull(artists.externalBannerPath),
            isNotNull(artists.externalLogoPath),
          ),
        );

      for (const artist of artistsWithMetadata) {
        try {
          const metadataPath = await this.storage.getArtistMetadataPath(artist.id);
          const size = await this.storage.getStorageSize(metadataPath);

          await this.drizzle.db
            .update(artists)
            .set({ metadataStorageSize: Number(size) })
            .where(eq(artists.id, artist.id));

          result.updated++;
        } catch (error) {
          const errorMsg = `Failed to update size for artist ${artist.name}: ${(error as Error).message}`;
          this.logger.warn(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      this.logger.log(`Storage sizes recalculated for ${result.updated} artists`);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to recalculate storage sizes: ${(error as Error).message}`,
        (error as Error).stack,
      );
      result.errors.push((error as Error).message);
      return result;
    }
  }

  /**
   * Verify integrity of files referenced in database
   */
  async verifyIntegrity(): Promise<IntegrityResult> {
    const result: IntegrityResult = {
      totalChecked: 0,
      missing: [],
      errors: [],
    };

    try {
      this.logger.log('Verifying file integrity...');

      // Verify artist images
      await this.verifyArtistImages(result);

      // Verify album covers
      await this.verifyAlbumCovers(result);

      this.logger.log(
        `Integrity check completed: ${result.totalChecked} files checked, ${result.missing.length} missing`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to verify integrity: ${(error as Error).message}`,
        (error as Error).stack,
      );
      result.errors.push((error as Error).message);
      return result;
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async verifyArtistImages(result: IntegrityResult): Promise<void> {
    const artistsWithPaths = await this.drizzle.db
      .select({
        id: artists.id,
        name: artists.name,
        externalProfilePath: artists.externalProfilePath,
        externalBackgroundPath: artists.externalBackgroundPath,
        externalBannerPath: artists.externalBannerPath,
        externalLogoPath: artists.externalLogoPath,
      })
      .from(artists)
      .where(
        or(
          isNotNull(artists.externalProfilePath),
          isNotNull(artists.externalBackgroundPath),
          isNotNull(artists.externalBannerPath),
          isNotNull(artists.externalLogoPath),
        ),
      );

    for (const artist of artistsWithPaths) {
      const paths = [
        artist.externalProfilePath,
        artist.externalBackgroundPath,
        artist.externalBannerPath,
        artist.externalLogoPath,
      ].filter((p) => p !== null);

      for (const filePath of paths) {
        result.totalChecked++;
        try {
          await fs.access(filePath);
        } catch {
          result.missing.push(`Artist ${artist.name}: ${filePath}`);
        }
      }
    }
  }

  private async verifyAlbumCovers(result: IntegrityResult): Promise<void> {
    const albumsWithCovers = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        externalCoverPath: albums.externalCoverPath,
      })
      .from(albums)
      .where(isNotNull(albums.externalCoverPath));

    for (const album of albumsWithCovers) {
      if (!album.externalCoverPath) continue;

      result.totalChecked++;
      try {
        await fs.access(album.externalCoverPath);
      } catch {
        result.missing.push(`Album ${album.name}: ${album.externalCoverPath}`);
      }
    }
  }

  private async countFilesInDirectory(dirPath: string): Promise<number> {
    try {
      const files = await this.listAllFiles(dirPath);
      return files.length;
    } catch {
      return 0;
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
    } catch {
      // Directory doesn't exist or not readable
    }

    return files;
  }
}
