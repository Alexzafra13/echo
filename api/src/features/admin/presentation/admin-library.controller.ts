import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Setting key for music library path
const LIBRARY_PATH_KEY = 'library.music.path';

// Allowed root paths for security (prevent path traversal)
const ALLOWED_ROOTS = ['/mnt', '/media', '/music', '/data', '/home'];

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
  constructor(
    @InjectPinoLogger(AdminLibraryController.name)
    private readonly logger: PinoLogger,
    private readonly settingsService: SettingsService,
  ) {}

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
    const isDev = process.env.NODE_ENV === 'development';

    // Security: validate path is within allowed roots (only in production)
    if (!isDev) {
      this.validatePathAccess(normalizedPath);
    }

    // Validate path exists and is readable
    try {
      await fs.access(normalizedPath);
      const stats = await fs.stat(normalizedPath);

      if (!stats.isDirectory()) {
        throw new BadRequestException('Path is not a directory');
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Path does not exist or is not accessible');
    }

    // Save to settings
    await this.settingsService.set(LIBRARY_PATH_KEY, normalizedPath);

    this.logger.info(`Music library path updated to: ${normalizedPath}`);

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
    const isDev = process.env.NODE_ENV === 'development';
    const isWindows = process.platform === 'win32';

    // In development on Windows, if requesting "/", show common locations
    if (isDev && isWindows && (targetPath === '/' || targetPath === '')) {
      const homeDir = process.env.USERPROFILE || process.env.HOME || 'C:/Users';
      const musicDir = path.join(homeDir, 'Music').replace(/\\/g, '/');
      const desktopDir = path.join(homeDir, 'Desktop').replace(/\\/g, '/');

      const directories: Array<{ name: string; path: string; readable: boolean; hasMusic: boolean }> = [];

      for (const dir of [musicDir, desktopDir, 'C:/', 'D:/']) {
        try {
          await fs.access(dir);
          directories.push({
            name: dir.includes('/') ? path.basename(dir) || dir : dir,
            path: dir,
            readable: true,
            hasMusic: dir.toLowerCase().includes('music'),
          });
        } catch {
          // Skip non-existent paths
        }
      }

      return {
        currentPath: '/',
        parentPath: null,
        canGoUp: false,
        directories,
      };
    }

    // Security: validate path is within allowed roots (only in production)
    if (!isDev && normalizedPath !== '/') {
      this.validatePathAccess(normalizedPath);
    }

    // If browsing root (Linux/production), return only allowed roots
    if (normalizedPath === '/') {
      const availableRoots = await this.getAvailableMountPoints();
      return {
        currentPath: '/',
        parentPath: null,
        canGoUp: false,
        directories: availableRoots.map((p) => ({
          name: p.replace('/', ''),
          path: p,
          readable: true,
          hasMusic: false,
        })),
      };
    }

    try {
      await fs.access(normalizedPath);
      const stats = await fs.stat(normalizedPath);

      if (!stats.isDirectory()) {
        throw new BadRequestException('Not a directory');
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
      const isDev = process.env.NODE_ENV === 'development';
      const isWindows = process.platform === 'win32';

      // In development, allow going up anywhere. In production, check allowed roots
      let canGoUp: boolean;
      let effectiveParentPath: string | null;

      if (isDev) {
        // On Windows, if we're at a drive root (e.g., C:/), parent should be /
        if (isWindows && /^[A-Za-z]:\/?$/.test(normalizedPath)) {
          canGoUp = true;
          effectiveParentPath = '/';
        } else if (parentPath === normalizedPath) {
          // We're at root
          canGoUp = false;
          effectiveParentPath = null;
        } else {
          canGoUp = true;
          effectiveParentPath = parentPath;
        }
      } else {
        // Production: check if parent is within allowed roots
        canGoUp = this.isPathAllowed(parentPath) || parentPath === '/';
        effectiveParentPath = canGoUp ? (parentPath !== normalizedPath ? parentPath : '/') : '/';
      }

      return {
        currentPath: normalizedPath,
        parentPath: effectiveParentPath,
        canGoUp,
        directories,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Error browsing ${normalizedPath}: ${(error as Error).message}`);
      throw new BadRequestException('Cannot access directory');
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
    const available: string[] = [];

    for (const p of ALLOWED_ROOTS) {
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

  /**
   * Check if a path is within allowed roots
   */
  private isPathAllowed(targetPath: string): boolean {
    const normalized = path.normalize(targetPath).replace(/\\/g, '/');
    return ALLOWED_ROOTS.some(
      (root) => normalized === root || normalized.startsWith(root + '/'),
    );
  }

  /**
   * Validate path access - throws if not allowed
   */
  private validatePathAccess(targetPath: string): void {
    if (!this.isPathAllowed(targetPath)) {
      throw new ForbiddenException(
        `Access denied: path must be within ${ALLOWED_ROOTS.join(', ')}`,
      );
    }
  }
}
