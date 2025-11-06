import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { CleanupService } from '../infrastructure/services/cleanup.service';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { StorageService } from '../infrastructure/services/storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Maintenance Controller
 * HTTP endpoints for metadata storage maintenance and cleanup (admin only)
 *
 * Endpoints:
 * - GET /api/maintenance/storage/stats - Get storage statistics
 * - POST /api/maintenance/cleanup/orphaned - Clean orphaned files
 * - POST /api/maintenance/storage/recalculate - Recalculate storage sizes
 * - GET /api/maintenance/verify/integrity - Verify file integrity
 *
 * All endpoints require admin privileges
 */
@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class MaintenanceController {
  private readonly logger = new Logger(MaintenanceController.name);

  constructor(
    private readonly cleanupService: CleanupService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Obtiene estadísticas de uso de almacenamiento
   * GET /api/maintenance/storage/stats
   */
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
      this.logger.log('Fetching storage statistics');

      const stats = await this.cleanupService.getStorageStats();

      return {
        ...stats,
        totalSizeMB: stats.totalSize / 1024 / 1024,
        avgSizePerArtistMB: stats.avgSizePerArtist / 1024 / 1024,
      };
    } catch (error) {
      this.logger.error(`Error fetching storage stats: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Limpia archivos huérfanos
   * POST /api/maintenance/cleanup/orphaned?dryRun=true
   */
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
      this.logger.log(`Starting cleanup (dry run: ${isDryRun})`);

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
      this.logger.error(`Error during cleanup: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Recalcula los tamaños de almacenamiento
   * POST /api/maintenance/storage/recalculate
   */
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
      this.logger.log('Starting storage size recalculation');

      const result = await this.cleanupService.recalculateStorageSizes();

      return {
        success: result.errors.length === 0,
        updated: result.updated,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(`Error recalculating storage: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Verifica la integridad de archivos
   * GET /api/maintenance/verify/integrity
   */
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
      this.logger.log('Starting file integrity check');

      const result = await this.cleanupService.verifyIntegrity();

      return {
        success: result.missing.length === 0 && result.errors.length === 0,
        totalChecked: result.totalChecked,
        missing: result.missing,
        missingCount: result.missing.length,
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error(`Error verifying integrity: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Limpia las URLs de imágenes incorrectas (file:// o /api/...) y permite re-enriquecimiento
   * POST /api/maintenance/clean/artist-image-urls
   */
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
      this.logger.log('Starting artist image URL cleanup');

      // Get all artists with incorrect image URLs
      const artists = await this.prisma.artist.findMany({
        where: {
          OR: [
            { smallImageUrl: { not: null } },
            { mediumImageUrl: { not: null } },
            { largeImageUrl: { not: null } },
            { backgroundImageUrl: { not: null } },
            { bannerImageUrl: { not: null } },
            { logoImageUrl: { not: null } },
          ],
        },
        select: {
          id: true,
          name: true,
          smallImageUrl: true,
          mediumImageUrl: true,
          largeImageUrl: true,
          backgroundImageUrl: true,
          bannerImageUrl: true,
          logoImageUrl: true,
        },
      });

      this.logger.log(`Found ${artists.length} artists with image URLs`);

      // Clean each artist that has incorrect URLs
      for (const artist of artists) {
        try {
          const updates: any = {};
          let needsCleaning = false;

          // Clean URLs that start with file:// or /api/ (these are incorrect - should be file system paths)
          if (artist.smallImageUrl && (artist.smallImageUrl.startsWith('file://') || artist.smallImageUrl.startsWith('/api/'))) {
            updates.smallImageUrl = null;
            needsCleaning = true;
          }

          if (artist.mediumImageUrl && (artist.mediumImageUrl.startsWith('file://') || artist.mediumImageUrl.startsWith('/api/'))) {
            updates.mediumImageUrl = null;
            needsCleaning = true;
          }

          if (artist.largeImageUrl && (artist.largeImageUrl.startsWith('file://') || artist.largeImageUrl.startsWith('/api/'))) {
            updates.largeImageUrl = null;
            needsCleaning = true;
          }

          if (artist.backgroundImageUrl && (artist.backgroundImageUrl.startsWith('file://') || artist.backgroundImageUrl.startsWith('/api/'))) {
            updates.backgroundImageUrl = null;
            needsCleaning = true;
          }

          if (artist.bannerImageUrl && (artist.bannerImageUrl.startsWith('file://') || artist.bannerImageUrl.startsWith('/api/'))) {
            updates.bannerImageUrl = null;
            needsCleaning = true;
          }

          if (artist.logoImageUrl && (artist.logoImageUrl.startsWith('file://') || artist.logoImageUrl.startsWith('/api/'))) {
            updates.logoImageUrl = null;
            needsCleaning = true;
          }

          if (needsCleaning) {
            await this.prisma.artist.update({
              where: { id: artist.id },
              data: updates,
            });
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

      this.logger.log(`Cleanup completed: ${cleaned} artists cleaned, ${errors.length} errors in ${duration}ms`);

      return {
        success: errors.length === 0,
        cleaned,
        errors,
        duration,
      };
    } catch (error) {
      this.logger.error(`Error during artist image URL cleanup: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Sincroniza la base de datos con los archivos físicos existentes en storage
   * POST /api/maintenance/sync/artist-images
   */
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
      this.logger.log('Starting artist image synchronization');

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

      for (const dir of artistDirs) {
        if (!dir.isDirectory()) continue;

        const artistId = dir.name;
        const artistPath = path.join(artistsPath, artistId);

        try {
          // Check if artist exists in database
          const artist = await this.prisma.artist.findUnique({
            where: { id: artistId },
          });

          if (!artist) {
            this.logger.debug(`Artist ${artistId} not found in database, skipping`);
            continue;
          }

          // Check for image files
          const updates: any = {};
          let hasUpdates = false;

          const imageFiles = [
            { file: 'profile-small.jpg', field: 'smallImageUrl' },
            { file: 'profile-medium.jpg', field: 'mediumImageUrl' },
            { file: 'profile-large.jpg', field: 'largeImageUrl' },
            { file: 'background.jpg', field: 'backgroundImageUrl' },
            { file: 'banner.png', field: 'bannerImageUrl' },
            { file: 'logo.png', field: 'logoImageUrl' },
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
            await this.prisma.artist.update({
              where: { id: artistId },
              data: updates,
            });
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

      this.logger.log(
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
      this.logger.error(`Error during image synchronization: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
