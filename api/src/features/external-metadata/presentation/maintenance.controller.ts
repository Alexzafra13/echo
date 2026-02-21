import { Controller, Get, Post, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { CleanupService } from '../infrastructure/services/cleanup.service';
import {
  EnrichmentQueueService,
  EnrichmentQueueStats,
} from '../infrastructure/services/enrichment-queue.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums } from '@infrastructure/database/schema';
import { eq, or, isNotNull, isNull } from 'drizzle-orm';
import { StorageService } from '../infrastructure/services/storage.service';
import { normalizeForSorting } from '@shared/utils';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mantenimiento de almacenamiento: limpieza, estadísticas, integridad (solo admin)
@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MaintenanceController {
  constructor(
    @InjectPinoLogger(MaintenanceController.name)
    private readonly logger: PinoLogger,
    private readonly cleanupService: CleanupService,
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly enrichmentQueue: EnrichmentQueueService,
    private readonly config: ConfigService
  ) {}

  @Get('storage/stats')
  @ApiOperation({
    summary: 'Get storage statistics',
    description:
      'Returns statistics about metadata storage usage, including total size, file counts, and averages (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage statistics',
    schema: {
      type: 'object',
      properties: {
        totalSize: { type: 'number', description: 'Total size in bytes' },
        totalSizeMB: { type: 'number', description: 'Total size in MB' },
        artistsWithMetadata: { type: 'number' },
        albumsWithCovers: { type: 'number' },
        totalFiles: { type: 'number' },
        orphanedFiles: { type: 'number' },
        avgSizePerArtist: { type: 'number', description: 'Average size in bytes' },
        avgSizePerArtistMB: { type: 'number', description: 'Average size in MB' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getStorageStats() {
    try {
      this.logger.info('Fetching storage statistics');

      const stats = await this.cleanupService.getStorageStats();

      return {
        ...stats,
        totalSizeMB: stats.totalSize / 1024 / 1024,
        avgSizePerArtistMB: stats.avgSizePerArtist / 1024 / 1024,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching storage stats: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Post('cleanup/orphaned')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean orphaned files',
    description:
      'Detects and removes files that are not referenced in the database. ' +
      'Use dryRun=true to preview without deleting (admin only)',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'Preview mode - show what would be deleted without actually deleting',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        filesRemoved: { type: 'number' },
        spaceFree: { type: 'number', description: 'Space freed in bytes' },
        spaceFreeMB: { type: 'number', description: 'Space freed in MB' },
        orphanedFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of orphaned file paths',
        },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number', description: 'Duration in ms' },
        dryRun: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async cleanupOrphanedFiles(@Query('dryRun') dryRun?: string) {
    const isDryRun = dryRun === 'true' || dryRun === '1' || dryRun === undefined;

    try {
      this.logger.info(`Starting cleanup (dry run: ${isDryRun})`);

      const result = await this.cleanupService.cleanupOrphanedFiles(isDryRun);

      return {
        success: result.errors.length === 0,
        filesRemoved: result.filesRemoved,
        spaceFree: result.spaceFree,
        spaceFreeMB: result.spaceFree / 1024 / 1024,
        orphanedFiles: result.orphanedFiles,
        errors: result.errors,
        duration: result.duration,
        dryRun: isDryRun,
      };
    } catch (error) {
      this.logger.error(
        `Error during cleanup: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Post('cleanup/full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run full cleanup (orphaned files + expired cache)',
    description:
      'Performs complete cleanup: removes orphaned files AND expired cache entries. ' +
      'Use dryRun=true to preview file deletions without actually deleting (admin only). ' +
      'Note: Cache cleanup always runs (no dry-run for cache entries)',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description:
      'Preview mode for file deletion - show what would be deleted without actually deleting',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Full cleanup result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        files: {
          type: 'object',
          properties: {
            filesRemoved: { type: 'number' },
            spaceFree: { type: 'number' },
            spaceFreeMB: { type: 'number' },
            orphanedFiles: { type: 'array', items: { type: 'string' } },
            errors: { type: 'array', items: { type: 'string' } },
            duration: { type: 'number' },
          },
        },
        cache: {
          type: 'object',
          properties: {
            entriesRemoved: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
        dryRun: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async runFullCleanup(@Query('dryRun') dryRun?: string) {
    const isDryRun = dryRun === 'true' || dryRun === '1' || dryRun === undefined;

    try {
      this.logger.info(`Starting full cleanup (dry run: ${isDryRun})`);

      const result = await this.cleanupService.runFullCleanup(isDryRun);

      return {
        success: result.files.errors.length === 0 && result.cache.errors.length === 0,
        files: {
          filesRemoved: result.files.filesRemoved,
          spaceFree: result.files.spaceFree,
          spaceFreeMB: result.files.spaceFree / 1024 / 1024,
          orphanedFiles: result.files.orphanedFiles,
          errors: result.files.errors,
          duration: result.files.duration,
        },
        cache: result.cache,
        dryRun: isDryRun,
      };
    } catch (error) {
      this.logger.error(
        `Error during full cleanup: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Post('storage/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recalculate storage sizes',
    description:
      'Recalculates and updates storage size for all artists with external metadata (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recalculation result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        updated: { type: 'number', description: 'Number of artists updated' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async recalculateStorageSizes() {
    try {
      this.logger.info('Starting storage size recalculation');

      const result = await this.cleanupService.recalculateStorageSizes();

      return {
        success: result.errors.length === 0,
        updated: result.updated,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(
        `Error recalculating storage: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Get('verify/integrity')
  @ApiOperation({
    summary: 'Verify file integrity',
    description:
      'Checks if all files referenced in the database actually exist on disk (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Integrity check result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        totalChecked: { type: 'number' },
        missing: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of missing files',
        },
        missingCount: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async verifyIntegrity() {
    try {
      this.logger.info('Starting file integrity check');

      const result = await this.cleanupService.verifyIntegrity();

      return {
        success: result.missing.length === 0 && result.errors.length === 0,
        totalChecked: result.totalChecked,
        missing: result.missing,
        missingCount: result.missing.length,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(
        `Error verifying integrity: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  // Limpia URLs incorrectas (file://, /api/) para permitir re-enriquecimiento
  @Post('clean/artist-image-urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean incorrect artist image URLs',
    description:
      'Removes incorrect image URLs (file:// paths or API URLs) from the database. ' +
      'After cleaning, artists can be re-enriched to download images correctly (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaning result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        cleaned: { type: 'number', description: 'Number of artists cleaned' },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number', description: 'Duration in ms' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async cleanArtistImageUrls() {
    const startTime = Date.now();
    const errors: string[] = [];
    let cleaned = 0;

    try {
      this.logger.info('Starting artist image URL cleanup');

      // Get all artists with incorrect image URLs
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
            isNotNull(artists.externalLogoPath)
          )
        );

      this.logger.info(`Found ${artistsWithPaths.length} artists with image URLs`);

      // Clean each artist that has incorrect URLs
      for (const artist of artistsWithPaths) {
        try {
          const updates: Partial<typeof artists.$inferInsert> = {};
          let needsCleaning = false;

          // Clean URLs that start with file:// or /api/ (these are incorrect - should be file system paths)
          if (
            artist.externalProfilePath &&
            (artist.externalProfilePath.startsWith('file://') ||
              artist.externalProfilePath.startsWith('/api/'))
          ) {
            updates.externalProfilePath = null;
            needsCleaning = true;
          }

          if (
            artist.externalBackgroundPath &&
            (artist.externalBackgroundPath.startsWith('file://') ||
              artist.externalBackgroundPath.startsWith('/api/'))
          ) {
            updates.externalBackgroundPath = null;
            needsCleaning = true;
          }

          if (
            artist.externalBannerPath &&
            (artist.externalBannerPath.startsWith('file://') ||
              artist.externalBannerPath.startsWith('/api/'))
          ) {
            updates.externalBannerPath = null;
            needsCleaning = true;
          }

          if (
            artist.externalLogoPath &&
            (artist.externalLogoPath.startsWith('file://') ||
              artist.externalLogoPath.startsWith('/api/'))
          ) {
            updates.externalLogoPath = null;
            needsCleaning = true;
          }

          if (needsCleaning) {
            await this.drizzle.db.update(artists).set(updates).where(eq(artists.id, artist.id));
            cleaned++;
            this.logger.debug(`Cleaned: ${artist.name}`);
          }
        } catch (error) {
          const errorMsg = `Failed to clean artist ${artist.name}: ${(error as Error).message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(
        `Cleanup completed: ${cleaned} artists cleaned, ${errors.length} errors in ${duration}ms`
      );

      return {
        success: errors.length === 0,
        cleaned,
        errors,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Error during artist image URL cleanup: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  // Sincroniza DB con archivos físicos existentes en storage
  @Post('sync/artist-images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync database with physical image files',
    description:
      'Scans the storage directory for existing image files and updates database with correct file paths. ' +
      'Use this after cleaning to restore references to physically existing files (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        synced: { type: 'number', description: 'Number of artists synced' },
        filesFound: { type: 'number', description: 'Total image files found' },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number', description: 'Duration in ms' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async syncArtistImages() {
    const startTime = Date.now();
    const errors: string[] = [];
    let synced = 0;
    let filesFound = 0;

    try {
      this.logger.info('Starting artist image synchronization');

      // Get base storage path
      const basePath = await this.storage.getBasePath();
      const artistsPath = path.join(basePath, 'artists');

      // Check if artists directory exists
      const artistsDirExists = await this.storage.directoryExists(artistsPath);
      if (!artistsDirExists) {
        this.logger.warn('Artists directory does not exist in storage');
        return {
          success: true,
          synced: 0,
          filesFound: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Get all artist directories
      const artistDirs = await fs.readdir(artistsPath, { withFileTypes: true });

      // OPTIMIZATION: Batch load all artists to avoid N+1 query
      const artistIds = artistDirs.filter((dir) => dir.isDirectory()).map((dir) => dir.name);

      const { inArray } = await import('drizzle-orm');
      const artistsData = await this.drizzle.db
        .select({
          id: artists.id,
          name: artists.name,
          externalProfilePath: artists.externalProfilePath,
          externalBackgroundPath: artists.externalBackgroundPath,
          externalBannerPath: artists.externalBannerPath,
          externalLogoPath: artists.externalLogoPath,
        })
        .from(artists)
        .where(inArray(artists.id, artistIds));

      // Create map for O(1) lookups
      const artistMap = new Map(artistsData.map((a) => [a.id, a]));

      for (const dir of artistDirs) {
        if (!dir.isDirectory()) continue;

        const artistId = dir.name;
        const artistPath = path.join(artistsPath, artistId);

        try {
          // Check if artist exists in database using map
          const artist = artistMap.get(artistId);

          if (!artist) {
            this.logger.debug(`Artist ${artistId} not found in database, skipping`);
            continue;
          }

          // Check for image files
          const updates: Partial<typeof artists.$inferInsert> = {};
          let hasUpdates = false;

          const imageFiles = [
            { file: 'profile.jpg', field: 'externalProfilePath' as const },
            { file: 'background.jpg', field: 'externalBackgroundPath' as const },
            { file: 'banner.png', field: 'externalBannerPath' as const },
            { file: 'logo.png', field: 'externalLogoPath' as const },
          ];

          for (const { file, field } of imageFiles) {
            const filePath = path.join(artistPath, file);
            const exists = await this.storage.fileExists(filePath);

            if (exists) {
              filesFound++;
              // Only update if database field is null or empty
              if (!artist[field]) {
                updates[field] = filePath;
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates) {
            await this.drizzle.db.update(artists).set(updates).where(eq(artists.id, artistId));
            synced++;
            this.logger.debug(`Synced: ${artist.name} (${Object.keys(updates).length} images)`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync artist ${artistId}: ${(error as Error).message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(
        `Synchronization completed: ${synced} artists synced, ${filesFound} files found, ${errors.length} errors in ${duration}ms`
      );

      return {
        success: errors.length === 0,
        synced,
        filesFound,
        errors,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Error during image synchronization: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  // Genera campos de ordenación para registros existentes (migración)
  @Post('populate-sort-names')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Populate sorting names for existing albums and artists',
    description:
      'Auto-generates orderAlbumName and orderArtistName for existing records. ' +
      'This is needed once after migration to enable alphabetical sorting (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Population result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        albumsUpdated: { type: 'number' },
        artistsUpdated: { type: 'number' },
        duration: { type: 'number', description: 'Duration in ms' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async populateSortNames() {
    const startTime = Date.now();

    try {
      this.logger.info('Starting population of sort names');

      // Get all albums without orderAlbumName
      const albumsToUpdate = await this.drizzle.db
        .select({ id: albums.id, name: albums.name })
        .from(albums)
        .where(or(isNull(albums.orderAlbumName), eq(albums.orderAlbumName, '')));

      // Get all artists without orderArtistName
      const artistsToUpdate = await this.drizzle.db
        .select({ id: artists.id, name: artists.name })
        .from(artists)
        .where(or(isNull(artists.orderArtistName), eq(artists.orderArtistName, '')));

      this.logger.info(
        `Found ${albumsToUpdate.length} albums and ${artistsToUpdate.length} artists to update`
      );

      // Update albums in batches
      let albumsUpdated = 0;
      for (const album of albumsToUpdate) {
        try {
          await this.drizzle.db
            .update(albums)
            .set({ orderAlbumName: normalizeForSorting(album.name) })
            .where(eq(albums.id, album.id));
          albumsUpdated++;
        } catch (error) {
          this.logger.error(`Failed to update album ${album.id}: ${(error as Error).message}`);
        }
      }

      // Update artists in batches
      let artistsUpdated = 0;
      for (const artist of artistsToUpdate) {
        try {
          await this.drizzle.db
            .update(artists)
            .set({ orderArtistName: normalizeForSorting(artist.name) })
            .where(eq(artists.id, artist.id));
          artistsUpdated++;
        } catch (error) {
          this.logger.error(`Failed to update artist ${artist.id}: ${(error as Error).message}`);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(
        `Sort names populated: ${albumsUpdated} albums, ${artistsUpdated} artists in ${duration}ms`
      );

      return {
        success: true,
        albumsUpdated,
        artistsUpdated,
        duration,
      };
    } catch (error) {
      this.logger.error(
        `Error populating sort names: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Get('enrichment-queue/stats')
  @ApiOperation({
    summary: 'Get enrichment queue statistics',
    description:
      'Returns current status of the enrichment queue including pending items, progress, and estimated time (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    schema: {
      type: 'object',
      properties: {
        isRunning: { type: 'boolean', description: 'Whether the queue is currently processing' },
        pendingArtists: { type: 'number', description: 'Number of artists pending enrichment' },
        pendingAlbums: { type: 'number', description: 'Number of albums pending enrichment' },
        totalPending: { type: 'number', description: 'Total items pending' },
        processedInSession: { type: 'number', description: 'Items processed in current session' },
        currentItem: { type: 'string', nullable: true, description: 'Currently processing item' },
        startedAt: { type: 'string', nullable: true, description: 'Session start time' },
        estimatedTimeRemaining: {
          type: 'string',
          nullable: true,
          description: 'Estimated time remaining',
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getEnrichmentQueueStats(): Promise<EnrichmentQueueStats> {
    try {
      const stats = await this.enrichmentQueue.getQueueStats();
      return stats;
    } catch (error) {
      this.logger.error(
        `Error fetching queue stats: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Post('enrichment-queue/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start enrichment queue',
    description:
      'Starts the background enrichment queue. Processes artists first (to get MBIDs), then albums. ' +
      'Items are processed one at a time with rate limiting delays (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Start result',
    schema: {
      type: 'object',
      properties: {
        started: { type: 'boolean', description: 'Whether the queue was started' },
        pending: { type: 'number', description: 'Number of items pending' },
        message: { type: 'string', description: 'Status message' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async startEnrichmentQueue() {
    try {
      this.logger.info('Manual request to start enrichment queue');
      const result = await this.enrichmentQueue.startEnrichmentQueue();
      return result;
    } catch (error) {
      this.logger.error(
        `Error starting queue: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Post('enrichment-queue/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stop enrichment queue',
    description:
      'Stops the background enrichment queue. Current processing will complete but no new items will be started (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Stop result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async stopEnrichmentQueue() {
    try {
      this.logger.info('Manual request to stop enrichment queue');
      await this.enrichmentQueue.stopEnrichmentQueue();
      return {
        success: true,
        message: 'Enrichment queue stopped',
      };
    } catch (error) {
      this.logger.error(
        `Error stopping queue: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  @Get('storage/paths')
  @ApiOperation({
    summary: 'Get storage paths',
    description: 'Returns configured storage paths for data, music, metadata, etc. (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage paths configuration',
    schema: {
      type: 'object',
      properties: {
        dataPath: { type: 'string', description: 'Base data directory' },
        musicPath: { type: 'string', description: 'Music library path (read-only)' },
        metadataPath: { type: 'string', description: 'External metadata storage' },
        albumCoversPath: { type: 'string', description: 'Album covers directory' },
        artistImagesPath: { type: 'string', description: 'Artist images directory' },
        userUploadsPath: { type: 'string', description: 'User uploads directory' },
        isReadOnlyMusic: { type: 'boolean', description: 'Whether music folder is read-only' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getStoragePaths() {
    try {
      const dataPath = this.config.get<string>('DATA_PATH', '/app/data');
      const musicPath = this.config.get<string>('MUSIC_LIBRARY_PATH', '/music');
      const metadataBasePath = await this.storage.getBasePath();

      return {
        dataPath,
        musicPath,
        metadataPath: metadataBasePath,
        albumCoversPath: path.join(metadataBasePath, 'albums'),
        artistImagesPath: path.join(metadataBasePath, 'artists'),
        userUploadsPath: path.join(dataPath, 'uploads', 'users'),
        isReadOnlyMusic: true, // By design, music folder should be read-only
      };
    } catch (error) {
      this.logger.error(
        `Error getting storage paths: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }
}
