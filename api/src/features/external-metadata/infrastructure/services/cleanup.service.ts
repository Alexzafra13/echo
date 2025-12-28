import { Injectable} from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { MetadataCacheService } from './metadata-cache.service';
import {
  OrphanedFileCleanerService,
  StorageStatsService,
  CleanupResult,
  StorageStats,
  IntegrityResult,
} from './cleanup';

// Re-export types for backwards compatibility
export type { CleanupResult, StorageStats } from './cleanup';

/**
 * CleanupService - Orchestrator for metadata file maintenance
 *
 * Responsibilities:
 * - Coordinate cleanup operations
 * - Manage cache cleanup
 * - Provide unified interface for maintenance tasks
 *
 * Delegates to:
 * - OrphanedFileCleanerService: file cleanup operations
 * - StorageStatsService: statistics and integrity verification
 * - MetadataCacheService: cache cleanup
 */
@Injectable()
export class CleanupService {
  constructor(
    @InjectPinoLogger(CleanupService.name)
    private readonly logger: PinoLogger,
    private readonly metadataCache: MetadataCacheService,
    private readonly orphanedFileCleaner: OrphanedFileCleanerService,
    private readonly storageStats: StorageStatsService,
  ) {}

  /**
   * Detect and remove orphaned files
   * (files on disk without references in database)
   */
  async cleanupOrphanedFiles(dryRun = true): Promise<CleanupResult> {
    return this.orphanedFileCleaner.cleanupOrphanedFiles(dryRun);
  }

  /**
   * Recalculate storage sizes for all artists
   */
  async recalculateStorageSizes(): Promise<{ updated: number; errors: string[] }> {
    return this.storageStats.recalculateStorageSizes();
  }

  /**
   * Generate storage usage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    return this.storageStats.getStorageStats();
  }

  /**
   * Verify integrity of files referenced in database
   */
  async verifyIntegrity(): Promise<IntegrityResult> {
    return this.storageStats.verifyIntegrity();
  }

  /**
   * Clean expired metadata cache entries
   * Should run periodically (e.g., daily) to prevent accumulation
   */
  async cleanupExpiredCache(): Promise<{
    entriesRemoved: number;
    errors: string[];
  }> {
    const result = {
      entriesRemoved: 0,
      errors: [] as string[],
    };

    try {
      this.logger.info('Starting metadata cache cleanup...');

      const removed = await this.metadataCache.clearExpired();
      result.entriesRemoved = removed;

      if (removed > 0) {
        this.logger.info(`Metadata cache cleanup: removed ${removed} expired entries`);
      } else {
        this.logger.info('Metadata cache cleanup: no expired entries found');
      }

      return result;
    } catch (error) {
      const errorMsg = `Failed to cleanup metadata cache: ${(error as Error).message}`;
      this.logger.error(errorMsg, (error as Error).stack);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Run full cleanup: orphaned files + expired cache
   */
  async runFullCleanup(dryRun = true): Promise<{
    files: CleanupResult;
    cache: { entriesRemoved: number; errors: string[] };
  }> {
    this.logger.info(`Starting full cleanup (dry run: ${dryRun})`);

    const [filesResult, cacheResult] = await Promise.all([
      this.cleanupOrphanedFiles(dryRun),
      this.cleanupExpiredCache(),
    ]);

    this.logger.info(
      `Full cleanup completed: ${filesResult.filesRemoved} files, ${cacheResult.entriesRemoved} cache entries`,
    );

    return {
      files: filesResult,
      cache: cacheResult,
    };
  }
}
