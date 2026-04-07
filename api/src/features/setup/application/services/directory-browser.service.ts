import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Directory browse result
 */
export interface DirectoryInfo {
  name: string;
  path: string;
  readable: boolean;
  hasMusic: boolean;
}

export interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryInfo[];
  canGoUp: boolean;
}

/**
 * Service for browsing directories in the filesystem
 * Handles security restrictions and Windows/Linux compatibility
 */
@Injectable()
export class DirectoryBrowserService {
  private readonly musicExtensions = ['.mp3', '.flac', '.m4a', '.ogg', '.wav'];

  constructor(
    @InjectPinoLogger(DirectoryBrowserService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Browse directories for music library selection
   */
  async browseDirectories(targetPath: string): Promise<BrowseResult> {
    const isDev = process.env.NODE_ENV === 'development';
    const isWindows = process.platform === 'win32';

    // Handle Windows root path in development
    const normalizedPath = path.normalize(targetPath).replace(/\\/g, '/');

    // In development on Windows, if requesting "/", show common locations
    if (isDev && isWindows && (targetPath === '/' || targetPath === '')) {
      return this.getWindowsRootDirectories();
    }

    // Security: prevent browsing outside allowed paths (only in production)
    if (!isDev) {
      this.validatePathSecurity(normalizedPath);
    }

    // Check if path exists
    try {
      await fs.access(normalizedPath);
    } catch {
      throw new BadRequestException(`Path does not exist: ${normalizedPath}`);
    }

    // Read directory
    const entries = await fs.readdir(normalizedPath, { withFileTypes: true });

    // Filter directories and check permissions
    const directories = await this.processDirectoryEntries(entries, normalizedPath);

    // Sort: directories with music first, then alphabetically
    this.sortDirectories(directories);

    // Calculate parent path
    const { parentPath, canGoUp } = this.calculateParentPath(normalizedPath, isWindows);

    return {
      currentPath: normalizedPath,
      parentPath,
      directories,
      canGoUp,
    };
  }

  /**
   * Get Windows root directories for development
   */
  private async getWindowsRootDirectories(): Promise<BrowseResult> {
    const homeDir = process.env.USERPROFILE || process.env.HOME || 'C:/Users';
    const musicDir = path.join(homeDir, 'Music').replace(/\\/g, '/');
    const desktopDir = path.join(homeDir, 'Desktop').replace(/\\/g, '/');

    const directories: DirectoryInfo[] = [];

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
      directories,
      canGoUp: false,
    };
  }

  /**
   * Validate path security in production
   */
  private validatePathSecurity(normalizedPath: string): void {
    const allowedRoots = ['/', '/mnt', '/media', '/home', '/music', '/data'];
    const isAllowed = allowedRoots.some(
      (root) => normalizedPath === root || normalizedPath.startsWith(root + '/'),
    );

    if (!isAllowed && normalizedPath !== '/') {
      throw new BadRequestException(`Access denied to path: ${normalizedPath}`);
    }
  }

  /**
   * Process directory entries and check permissions
   */
  private async processDirectoryEntries(
    entries: import('fs').Dirent[],
    basePath: string,
  ): Promise<DirectoryInfo[]> {
    const directories: DirectoryInfo[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue; // Skip hidden dirs

      const dirPath = path.join(basePath, entry.name);
      let readable = false;
      let hasMusic = false;

      try {
        await fs.access(dirPath, fs.constants.R_OK);
        readable = true;

        // Quick check for music files
        const files = await fs.readdir(dirPath);
        hasMusic = files.some((f) =>
          this.musicExtensions.some((ext) => f.toLowerCase().endsWith(ext)),
        );
      } catch {
        readable = false;
      }

      directories.push({
        name: entry.name,
        path: dirPath.replace(/\\/g, '/'),
        readable,
        hasMusic,
      });
    }

    return directories;
  }

  /**
   * Sort directories: music first, then alphabetically
   */
  private sortDirectories(directories: DirectoryInfo[]): void {
    directories.sort((a, b) => {
      if (a.hasMusic && !b.hasMusic) return -1;
      if (!a.hasMusic && b.hasMusic) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Calculate parent path handling Windows drive roots
   */
  private calculateParentPath(
    normalizedPath: string,
    isWindows: boolean,
  ): { parentPath: string | null; canGoUp: boolean } {
    if (normalizedPath === '/') {
      return { parentPath: null, canGoUp: false };
    }

    if (isWindows && /^[A-Za-z]:\/?$/.test(normalizedPath)) {
      // At Windows drive root (C:/), go back to virtual root
      return { parentPath: '/', canGoUp: true };
    }

    const parent = path.dirname(normalizedPath).replace(/\\/g, '/');
    const parentPath = parent !== normalizedPath ? parent : null;

    return { parentPath, canGoUp: parentPath !== null };
  }
}
