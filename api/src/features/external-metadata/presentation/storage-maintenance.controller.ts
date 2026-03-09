import { Controller, Get, Post, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { CleanupService } from '../infrastructure/services/cleanup.service';
import { StorageService } from '../infrastructure/services/storage.service';
import * as path from 'path';

// Almacenamiento: estadísticas, limpieza, integridad, rutas (solo admin)
@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class StorageMaintenanceController {
  constructor(
    @InjectPinoLogger(StorageMaintenanceController.name)
    private readonly logger: PinoLogger,
    private readonly cleanupService: CleanupService,
    private readonly storage: StorageService,
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
