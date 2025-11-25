import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Setup state stored in /app/data/setup.json
 */
interface SetupState {
  completed: boolean;
  completedAt?: string;
  version: number;
  musicLibraryPath?: string;
}

/**
 * Setup status response
 */
export interface SetupStatus {
  needsSetup: boolean;
  hasAdmin: boolean;
  hasMusicLibrary: boolean;
  musicLibraryPath: string | null;
  setupCompleted: boolean;
  // New: Info about mounted music folder
  mountedLibrary: {
    path: string;
    isMounted: boolean;
    hasContent: boolean;
    fileCount: number;
  };
}

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
 * Setup Service
 *
 * Handles first-run setup wizard:
 * - Detects if setup is needed (no users in DB)
 * - Creates admin account
 * - Configures music library path
 * - Stores setup state in /app/data/setup.json
 */
@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);
  private readonly dataPath = process.env.DATA_PATH || '/app/data';
  private readonly setupFilePath: string;

  constructor(private readonly prisma: PrismaService) {
    this.setupFilePath = path.join(this.dataPath, 'setup.json');
  }

  /**
   * Get current setup status
   */
  async getStatus(): Promise<SetupStatus> {
    const [hasAdmin, setupState, mountedLibrary] = await Promise.all([
      this.hasAdminUser(),
      this.getSetupState(),
      this.checkMountedLibrary(),
    ]);

    const hasMusicLibrary = !!setupState.musicLibraryPath;

    return {
      needsSetup: !setupState.completed,
      hasAdmin,
      hasMusicLibrary,
      musicLibraryPath: setupState.musicLibraryPath || null,
      setupCompleted: setupState.completed,
      mountedLibrary,
    };
  }

  /**
   * Check available media folders (Jellyfin-style)
   * Looks for mounted folders like /mnt, /media, /music
   */
  private async checkMountedLibrary(): Promise<SetupStatus['mountedLibrary']> {
    // Check common media mount points (in order of preference)
    const mountPoints = ['/music', '/mnt', '/media', '/data'];
    const musicExtensions = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aac', '.opus'];

    for (const mountPath of mountPoints) {
      try {
        await fs.access(mountPath, fs.constants.R_OK);
        const stats = await fs.stat(mountPath);

        if (!stats.isDirectory()) continue;

        const entries = await fs.readdir(mountPath);
        if (entries.length === 0) continue;

        // Count music files (quick scan)
        const fileCount = await this.countMusicFiles(mountPath, musicExtensions, 3);

        if (fileCount > 0) {
          return {
            path: mountPath,
            isMounted: true,
            hasContent: true,
            fileCount,
          };
        }
      } catch {
        // Path doesn't exist or not readable, try next
        continue;
      }
    }

    // No music found, but check if any mount points are available for browsing
    for (const mountPath of mountPoints) {
      try {
        await fs.access(mountPath, fs.constants.R_OK);
        const stats = await fs.stat(mountPath);
        if (stats.isDirectory()) {
          const entries = await fs.readdir(mountPath);
          if (entries.length > 0) {
            return {
              path: mountPath,
              isMounted: true,
              hasContent: true, // Has content, just no music at root
              fileCount: 0,
            };
          }
        }
      } catch {
        continue;
      }
    }

    // Nothing mounted
    return { path: '/mnt', isMounted: false, hasContent: false, fileCount: 0 };
  }

  /**
   * Create admin account (step 1 of wizard)
   */
  async createAdmin(username: string, password: string, email?: string): Promise<void> {
    // Verify setup is not completed
    const state = await this.getSetupState();
    if (state.completed) {
      throw new BadRequestException('Setup already completed. Use admin panel to manage users.');
    }

    // Verify no admin exists
    const existingAdmin = await this.hasAdminUser();
    if (existingAdmin) {
      throw new BadRequestException('Admin user already exists.');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    // Hash password
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(password, rounds);

    // Create admin user
    await this.prisma.user.create({
      data: {
        username,
        email: email || `${username}@localhost`,
        passwordHash,
        name: username,
        isAdmin: true,
        isActive: true,
        theme: 'dark',
        language: 'es',
        mustChangePassword: false, // User just set it
      },
    });

    this.logger.log(`Admin user "${username}" created during setup wizard`);
  }

  /**
   * Configure music library path (step 2 of wizard)
   */
  async configureMusicLibrary(libraryPath: string): Promise<{ valid: boolean; message: string; fileCount?: number }> {
    // Verify setup is not completed
    const state = await this.getSetupState();
    if (state.completed) {
      throw new BadRequestException('Setup already completed. Use admin panel to change settings.');
    }

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

    // Count music files (quick check)
    const musicExtensions = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.aac', '.wma', '.opus'];
    let fileCount = 0;

    try {
      fileCount = await this.countMusicFiles(libraryPath, musicExtensions, 3); // Max 3 levels deep
    } catch (error) {
      this.logger.warn(`Could not count music files: ${(error as Error).message}`);
    }

    // Save to setup state (not completing setup yet)
    state.musicLibraryPath = libraryPath;
    await this.saveSetupState(state);

    this.logger.log(`Music library configured: ${libraryPath} (${fileCount} files found)`);

    return {
      valid: true,
      message: fileCount > 0
        ? `Found ${fileCount} music files in the library.`
        : 'Path is valid but no music files were found in the first 3 levels.',
      fileCount,
    };
  }

  /**
   * Browse directories for music library selection
   */
  async browseDirectories(targetPath: string): Promise<BrowseResult> {
    const isDev = process.env.NODE_ENV === 'development';
    const isWindows = process.platform === 'win32';

    // Handle Windows root path in development
    let normalizedPath = path.normalize(targetPath).replace(/\\/g, '/');

    // In development on Windows, if requesting "/", show common locations
    if (isDev && isWindows && (targetPath === '/' || targetPath === '')) {
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

    // Security: prevent browsing outside allowed paths (only in production)
    if (!isDev) {
      const allowedRoots = ['/', '/mnt', '/media', '/home', '/music', '/data'];
      const isAllowed = allowedRoots.some(root =>
        normalizedPath === root || normalizedPath.startsWith(root + '/')
      );

      if (!isAllowed && normalizedPath !== '/') {
        throw new BadRequestException(`Access denied to path: ${normalizedPath}`);
      }
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
    const directories: DirectoryInfo[] = [];
    const musicExtensions = ['.mp3', '.flac', '.m4a', '.ogg', '.wav'];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue; // Skip hidden dirs

      const dirPath = path.join(normalizedPath, entry.name);
      let readable = false;
      let hasMusic = false;

      try {
        await fs.access(dirPath, fs.constants.R_OK);
        readable = true;

        // Quick check for music files
        const files = await fs.readdir(dirPath);
        hasMusic = files.some(f =>
          musicExtensions.some(ext => f.toLowerCase().endsWith(ext))
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

    // Sort: directories with music first, then alphabetically
    directories.sort((a, b) => {
      if (a.hasMusic && !b.hasMusic) return -1;
      if (!a.hasMusic && b.hasMusic) return 1;
      return a.name.localeCompare(b.name);
    });

    // Parent path - handle Windows drive roots
    let parentPath: string | null;
    let canGoUp: boolean;

    if (normalizedPath === '/') {
      parentPath = null;
      canGoUp = false;
    } else if (isWindows && /^[A-Za-z]:\/?$/.test(normalizedPath)) {
      // At Windows drive root (C:/), go back to virtual root
      parentPath = '/';
      canGoUp = true;
    } else {
      const parent = path.dirname(normalizedPath).replace(/\\/g, '/');
      parentPath = parent !== normalizedPath ? parent : null;
      canGoUp = parentPath !== null;
    }

    return {
      currentPath: normalizedPath,
      parentPath,
      directories,
      canGoUp,
    };
  }

  /**
   * Complete setup (step 3 of wizard)
   */
  async completeSetup(): Promise<{ success: boolean; message: string }> {
    const state = await this.getSetupState();

    if (state.completed) {
      return { success: true, message: 'Setup was already completed.' };
    }

    // Verify admin exists
    const hasAdmin = await this.hasAdminUser();
    if (!hasAdmin) {
      throw new BadRequestException('Cannot complete setup: No admin user created.');
    }

    // Verify music library is configured
    if (!state.musicLibraryPath) {
      throw new BadRequestException('Cannot complete setup: Music library not configured.');
    }

    // Mark setup as completed
    state.completed = true;
    state.completedAt = new Date().toISOString();
    state.version = 1;
    await this.saveSetupState(state);

    // Initialize all default settings
    await this.initializeDefaultSettings(state.musicLibraryPath);

    this.logger.log('Setup wizard completed successfully');

    return {
      success: true,
      message: 'Setup completed! You can now log in and start scanning your library.',
    };
  }

  /**
   * Initialize default settings on first run
   * These settings can be modified later via the admin panel
   */
  private async initializeDefaultSettings(musicLibraryPath: string): Promise<void> {
    const defaultSettings = [
      // Library settings
      {
        key: 'library.music.path',
        value: musicLibraryPath,
        category: 'library',
        type: 'string',
        description: 'Path to the music library',
        isPublic: false,
      },
      // Scanner settings
      {
        key: 'scanner.auto_watch.enabled',
        value: 'true',
        category: 'scanner',
        type: 'boolean',
        description: 'Automatically watch for new files in the music library',
        isPublic: false,
      },
      {
        key: 'scanner.auto_scan.interval_minutes',
        value: '60',
        category: 'scanner',
        type: 'number',
        description: 'Interval between automatic scans (in minutes)',
        isPublic: false,
      },
      // Metadata auto-enrichment settings
      {
        key: 'metadata.auto_enrich.enabled',
        value: 'true',
        category: 'metadata',
        type: 'boolean',
        description: 'Automatically enrich metadata for new tracks',
        isPublic: false,
      },
      {
        key: 'metadata.auto_search_mbid.enabled',
        value: 'true',
        category: 'metadata',
        type: 'boolean',
        description: 'Automatically search for MusicBrainz IDs',
        isPublic: false,
      },
      // API settings - enabled flags (keys are added by user via admin panel)
      {
        key: 'api.lastfm.enabled',
        value: 'true',
        category: 'api',
        type: 'boolean',
        description: 'Enable Last.fm metadata agent (requires API key)',
        isPublic: false,
      },
      {
        key: 'api.lastfm.api_key',
        value: '',
        category: 'api',
        type: 'string',
        description: 'Last.fm API key for artist biographies and images',
        isPublic: false,
      },
      {
        key: 'api.fanart.enabled',
        value: 'true',
        category: 'api',
        type: 'boolean',
        description: 'Enable Fanart.tv metadata agent (requires API key)',
        isPublic: false,
      },
      {
        key: 'api.fanart.api_key',
        value: '',
        category: 'api',
        type: 'string',
        description: 'Fanart.tv API key for high-quality artist images',
        isPublic: false,
      },
      // Storage settings
      {
        key: 'storage.metadata.path',
        value: process.env.DATA_PATH ? `${process.env.DATA_PATH}/metadata` : '/app/data/metadata',
        category: 'storage',
        type: 'string',
        description: 'Path for storing downloaded metadata (images, etc.)',
        isPublic: false,
      },
    ];

    for (const setting of defaultSettings) {
      await this.prisma.setting.upsert({
        where: { key: setting.key },
        update: {}, // Don't overwrite existing values
        create: setting,
      });
    }

    this.logger.log(`Initialized ${defaultSettings.length} default settings`);
  }

  /**
   * Check if admin user exists
   */
  private async hasAdminUser(): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { isAdmin: true },
    });
    return count > 0;
  }

  /**
   * Get setup state from file
   */
  private async getSetupState(): Promise<SetupState> {
    try {
      const data = await fs.readFile(this.setupFilePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // File doesn't exist or invalid - return default state
      return {
        completed: false,
        version: 1,
      };
    }
  }

  /**
   * Save setup state to file
   */
  private async saveSetupState(state: SetupState): Promise<void> {
    // Ensure data directory exists
    await fs.mkdir(this.dataPath, { recursive: true });

    await fs.writeFile(
      this.setupFilePath,
      JSON.stringify(state, null, 2),
      'utf-8'
    );
  }

  /**
   * Count music files in directory (limited depth)
   */
  private async countMusicFiles(
    dirPath: string,
    extensions: string[],
    maxDepth: number,
    currentDepth = 0
  ): Promise<number> {
    if (currentDepth >= maxDepth) return 0;

    let count = 0;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          count++;
        }
      } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
        try {
          count += await this.countMusicFiles(
            path.join(dirPath, entry.name),
            extensions,
            maxDepth,
            currentDepth + 1
          );
        } catch {
          // Skip directories we can't read
        }
      }
    }

    return count;
  }
}
