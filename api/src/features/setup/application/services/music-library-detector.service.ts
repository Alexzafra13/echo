import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Mounted library status
 */
export interface MountedLibraryInfo {
  path: string;
  isMounted: boolean;
  hasContent: boolean;
  fileCount: number;
}

/**
 * Library validation result
 */
export interface LibraryValidationResult {
  valid: boolean;
  message: string;
  fileCount?: number;
}

/**
 * Service for detecting and validating music libraries
 * Handles mounted folder detection and music file counting
 */
@Injectable()
export class MusicLibraryDetectorService {
  private readonly musicExtensions = [
    '.mp3',
    '.flac',
    '.m4a',
    '.ogg',
    '.wav',
    '.aac',
    '.wma',
    '.opus',
  ];
  private readonly mountPoints = ['/music', '/mnt', '/media', '/data'];

  constructor(
    @InjectPinoLogger(MusicLibraryDetectorService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Check available media folders (Jellyfin-style)
   * Looks for mounted folders like /mnt, /media, /music
   */
  async checkMountedLibrary(): Promise<MountedLibraryInfo> {
    // First pass: look for mount points with music files
    for (const mountPath of this.mountPoints) {
      const result = await this.checkMountPoint(mountPath, true);
      if (result) return result;
    }

    // Second pass: look for any available mount point for browsing
    for (const mountPath of this.mountPoints) {
      const result = await this.checkMountPoint(mountPath, false);
      if (result) return result;
    }

    // Nothing mounted
    return {
      path: '/mnt',
      isMounted: false,
      hasContent: false,
      fileCount: 0,
    };
  }

  /**
   * Validate a library path and count music files
   */
  async validateLibraryPath(libraryPath: string): Promise<LibraryValidationResult> {
    // Validate path exists and is readable
    try {
      await fs.access(libraryPath, fs.constants.R_OK);
    } catch {
      return {
        valid: false,
        message: `Path "${libraryPath}" does not exist or is not readable.`,
      };
    }

    // Check if it's a directory
    const stats = await fs.stat(libraryPath);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        message: `Path "${libraryPath}" is not a directory.`,
      };
    }

    // Count music files (quick check, max 3 levels)
    let fileCount = 0;
    try {
      fileCount = await this.countMusicFiles(libraryPath, 3);
    } catch (error) {
      this.logger.warn(`Could not count music files: ${(error as Error).message}`);
    }

    this.logger.info(`Library validation: ${libraryPath} (${fileCount} files found)`);

    return {
      valid: true,
      message:
        fileCount > 0
          ? `Found ${fileCount} music files in the library.`
          : 'Path is valid but no music files were found in the first 3 levels.',
      fileCount,
    };
  }

  /**
   * Count music files in directory (limited depth)
   */
  async countMusicFiles(
    dirPath: string,
    maxDepth: number,
    currentDepth = 0,
  ): Promise<number> {
    if (currentDepth >= maxDepth) return 0;

    let count = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.musicExtensions.includes(ext)) {
            count++;
          }
        } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
          try {
            count += await this.countMusicFiles(
              path.join(dirPath, entry.name),
              maxDepth,
              currentDepth + 1,
            );
          } catch {
            // Skip directories we can't read
          }
        }
      }
    } catch {
      // Directory not readable
    }

    return count;
  }

  /**
   * Check a single mount point for music content
   */
  private async checkMountPoint(
    mountPath: string,
    requireMusic: boolean,
  ): Promise<MountedLibraryInfo | null> {
    try {
      await fs.access(mountPath, fs.constants.R_OK);
      const stats = await fs.stat(mountPath);

      if (!stats.isDirectory()) return null;

      const entries = await fs.readdir(mountPath);
      if (entries.length === 0) return null;

      if (requireMusic) {
        // Count music files (quick scan, 3 levels)
        const fileCount = await this.countMusicFiles(mountPath, 3);

        if (fileCount > 0) {
          return {
            path: mountPath,
            isMounted: true,
            hasContent: true,
            fileCount,
          };
        }
      } else {
        // Just check if it has content for browsing
        return {
          path: mountPath,
          isMounted: true,
          hasContent: true,
          fileCount: 0,
        };
      }
    } catch {
      // Path doesn't exist or not readable
    }

    return null;
  }
}
