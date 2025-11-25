import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Setting key for music library path
const LIBRARY_PATH_KEY = 'library.music.path';

class UpdateLibraryPathDto {
  @IsString()
  path!: string;
}

class BrowseDirectoriesDto {
  @IsString()
  path!: string;
}

/**
 * Admin Library Controller
 * Manages music library path configuration
 */
@ApiTags('admin/library')
@ApiBearerAuth('JWT-auth')
@Controller('admin/library')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminLibraryController {
  private readonly logger = new Logger(AdminLibraryController.name);

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get current library configuration
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get music library configuration',
    description: 'Returns current music library path and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Library configuration retrieved',
  })
  async getLibrary() {
    // Get path from settings, fallback to env, then default
    const savedPath = await this.settingsService.getString(
      LIBRARY_PATH_KEY,
      process.env.MUSIC_LIBRARY_PATH || '/music',
    );

    // Validate the path exists and get stats
    let exists = false;
    let readable = false;
    let fileCount = 0;

    try {
      await fs.access(savedPath);
      exists = true;

      const stats = await fs.stat(savedPath);
      if (stats.isDirectory()) {
        readable = true;
        fileCount = await this.countMusicFiles(savedPath);
      }
    } catch {
      // Path doesn't exist or isn't accessible
    }

    return {
      path: savedPath,
      exists,
      readable,
      fileCount,
      mountedPaths: await this.getAvailableMountPoints(),
    };
  }

  /**
   * Update library path
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update music library path',
    description: 'Set a new path for the music library',
  })
  @ApiBody({ type: UpdateLibraryPathDto })
  @ApiResponse({
    status: 200,
    description: 'Library path updated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid path',
  })
  async updateLibrary(@Body() dto: UpdateLibraryPathDto) {
    const normalizedPath = path.normalize(dto.path).replace(/\\/g, '/');

    // Validate path exists and is readable
    try {
      await fs.access(normalizedPath);
      const stats = await fs.stat(normalizedPath);

      if (!stats.isDirectory()) {
        return {
          success: false,
          message: 'Path is not a directory',
        };
      }
    } catch {
      return {
        success: false,
        message: 'Path does not exist or is not accessible',
      };
    }

    // Save to settings
    await this.settingsService.set(LIBRARY_PATH_KEY, normalizedPath);

    this.logger.log(`Music library path updated to: ${normalizedPath}`);

    // Count music files
    const fileCount = await this.countMusicFiles(normalizedPath);

    return {
      success: true,
      message: 'Library path updated successfully',
      path: normalizedPath,
      fileCount,
    };
  }

  /**
   * Browse directories
   */
  @Post('browse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Browse server directories',
    description: 'List directories for selecting music library path',
  })
  @ApiBody({ type: BrowseDirectoriesDto })
  @ApiResponse({
    status: 200,
    description: 'Directory listing',
  })
  async browseDirectories(@Body() dto: BrowseDirectoriesDto) {
    const targetPath = dto.path || '/';
    const normalizedPath = path.normalize(targetPath).replace(/\\/g, '/');

    try {
      await fs.access(normalizedPath);
      const stats = await fs.stat(normalizedPath);

      if (!stats.isDirectory()) {
        return {
          currentPath: normalizedPath,
          parentPath: path.dirname(normalizedPath),
          canGoUp: normalizedPath !== '/',
          directories: [],
          error: 'Not a directory',
        };
      }

      const entries = await fs.readdir(normalizedPath, { withFileTypes: true });
      const directories: Array<{
        name: string;
        path: string;
        readable: boolean;
        hasMusic: boolean;
      }> = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const dirPath = path.join(normalizedPath, entry.name).replace(/\\/g, '/');
          let readable = false;
          let hasMusic = false;

          try {
            await fs.access(dirPath);
            readable = true;

            // Quick check for music files (just first level)
            const subEntries = await fs.readdir(dirPath);
            hasMusic = subEntries.some((f) =>
              /\.(mp3|flac|m4a|ogg|wav|aac|opus|wma)$/i.test(f),
            );
          } catch {
            readable = false;
          }

          directories.push({
            name: entry.name,
            path: dirPath,
            readable,
            hasMusic,
          });
        }
      }

      // Sort alphabetically
      directories.sort((a, b) => a.name.localeCompare(b.name));

      const parentPath = path.dirname(normalizedPath).replace(/\\/g, '/');

      return {
        currentPath: normalizedPath,
        parentPath: parentPath !== normalizedPath ? parentPath : null,
        canGoUp: normalizedPath !== '/',
        directories,
      };
    } catch (error) {
      this.logger.error(`Error browsing ${normalizedPath}: ${(error as Error).message}`);
      return {
        currentPath: normalizedPath,
        parentPath: path.dirname(normalizedPath),
        canGoUp: true,
        directories: [],
        error: 'Cannot access directory',
      };
    }
  }

  /**
   * Count music files in a directory (recursive, limited depth)
   */
  private async countMusicFiles(dirPath: string, depth = 0): Promise<number> {
    if (depth > 5) return 0; // Limit recursion depth

    const musicExtensions = /\.(mp3|flac|m4a|ogg|wav|aac|opus|wma)$/i;
    let count = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isFile() && musicExtensions.test(entry.name)) {
          count++;
        } else if (entry.isDirectory() && depth < 3) {
          // Only go 3 levels deep for counting
          count += await this.countMusicFiles(fullPath, depth + 1);
        }
      }
    } catch {
      // Ignore errors for inaccessible directories
    }

    return count;
  }

  /**
   * Get available mount points for browsing
   */
  private async getAvailableMountPoints(): Promise<string[]> {
    const commonPaths = ['/mnt', '/media', '/music', '/data', '/home'];
    const available: string[] = [];

    for (const p of commonPaths) {
      try {
        await fs.access(p);
        const stats = await fs.stat(p);
        if (stats.isDirectory()) {
          available.push(p);
        }
      } catch {
        // Path not available
      }
    }

    return available;
  }
}
