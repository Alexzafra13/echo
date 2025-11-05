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
import { JwtAuthGuard } from '@features/auth/infrastructure/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { CleanupService } from '../infrastructure/services/cleanup.service';

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

  constructor(private readonly cleanupService: CleanupService) {}

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
      this.logger.error(`Error fetching storage stats: ${error.message}`, error.stack);
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
      this.logger.error(`Error during cleanup: ${error.message}`, error.stack);
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
      this.logger.error(`Error recalculating storage: ${error.message}`, error.stack);
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
      this.logger.error(`Error verifying integrity: ${error.message}`, error.stack);
      throw error;
    }
  }
}
