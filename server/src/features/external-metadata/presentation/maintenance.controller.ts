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
   * Migra las URLs de imágenes de artistas de rutas de archivo locales a URLs del API
   * POST /api/maintenance/migrate/image-urls
   */
  @Post('migrate/image-urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Migrate artist image URLs',
    description:
      'Converts artist image URLs from local file paths (file://...) to API URLs (/api/images/...). ' +
      'This is a one-time migration needed after updating the metadata service (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Migration result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        updated: { type: 'number', description: 'Number of artists updated' },
        skipped: { type: 'number', description: 'Number of artists skipped (already using API URLs)' },
        errors: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number', description: 'Duration in ms' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async migrateImageUrls() {
    const startTime = Date.now();
    const errors: string[] = [];
    let updated = 0;
    let skipped = 0;

    try {
      this.logger.log('Starting image URL migration');

      // Get all artists with image URLs
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

      this.logger.log(`Found ${artists.length} artists with images`);

      // Migrate each artist
      for (const artist of artists) {
        try {
          const updates: any = {};
          let needsUpdate = false;

          // Check and convert each image URL
          if (artist.smallImageUrl && !artist.smallImageUrl.startsWith('/api/')) {
            updates.smallImageUrl = `/api/images/artists/${artist.id}/profile-small`;
            needsUpdate = true;
          }

          if (artist.mediumImageUrl && !artist.mediumImageUrl.startsWith('/api/')) {
            updates.mediumImageUrl = `/api/images/artists/${artist.id}/profile-medium`;
            needsUpdate = true;
          }

          if (artist.largeImageUrl && !artist.largeImageUrl.startsWith('/api/')) {
            updates.largeImageUrl = `/api/images/artists/${artist.id}/profile-large`;
            needsUpdate = true;
          }

          if (artist.backgroundImageUrl && !artist.backgroundImageUrl.startsWith('/api/')) {
            updates.backgroundImageUrl = `/api/images/artists/${artist.id}/background`;
            needsUpdate = true;
          }

          if (artist.bannerImageUrl && !artist.bannerImageUrl.startsWith('/api/')) {
            updates.bannerImageUrl = `/api/images/artists/${artist.id}/banner`;
            needsUpdate = true;
          }

          if (artist.logoImageUrl && !artist.logoImageUrl.startsWith('/api/')) {
            updates.logoImageUrl = `/api/images/artists/${artist.id}/logo`;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await this.prisma.artist.update({
              where: { id: artist.id },
              data: updates,
            });
            updated++;
            this.logger.debug(`Updated: ${artist.name}`);
          } else {
            skipped++;
          }
        } catch (error) {
          const errorMsg = `Failed to migrate artist ${artist.name}: ${(error as Error).message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(`Migration completed: ${updated} updated, ${skipped} skipped, ${errors.length} errors in ${duration}ms`);

      return {
        success: errors.length === 0,
        updated,
        skipped,
        errors,
        duration,
      };
    } catch (error) {
      this.logger.error(`Error during image URL migration: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
