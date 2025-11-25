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
    const [hasAdmin, setupState] = await Promise.all([
      this.hasAdminUser(),
      this.getSetupState(),
    ]);

    const hasMusicLibrary = !!setupState.musicLibraryPath;

    return {
      needsSetup: !setupState.completed,
      hasAdmin,
      hasMusicLibrary,
      musicLibraryPath: setupState.musicLibraryPath || null,
      setupCompleted: setupState.completed,
    };
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
    const normalizedPath = path.normalize(targetPath).replace(/\\/g, '/');

    // Security: prevent browsing outside allowed paths
    const allowedRoots = ['/', '/mnt', '/media', '/home', '/music', '/data'];
    const isAllowed = allowedRoots.some(root =>
      normalizedPath === root || normalizedPath.startsWith(root + '/')
    );

    if (!isAllowed && normalizedPath !== '/') {
      throw new BadRequestException(`Access denied to path: ${normalizedPath}`);
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

    // Parent path
    const parentPath = normalizedPath === '/' ? null : path.dirname(normalizedPath);

    return {
      currentPath: normalizedPath,
      parentPath,
      directories,
      canGoUp: normalizedPath !== '/',
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

    // Create setting in database for music library path
    await this.prisma.setting.upsert({
      where: { key: 'library.music.path' },
      update: { value: state.musicLibraryPath },
      create: {
        key: 'library.music.path',
        value: state.musicLibraryPath,
        category: 'library',
        type: 'string',
        description: 'Path to the music library',
        isPublic: false,
      },
    });

    this.logger.log('Setup wizard completed successfully');

    return {
      success: true,
      message: 'Setup completed! You can now log in and start scanning your library.',
    };
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
