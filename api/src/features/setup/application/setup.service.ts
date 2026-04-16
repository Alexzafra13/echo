import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { eq, count as dbCount } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { users, settings } from '@infrastructure/database/schema';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DirectoryBrowserService,
  BrowseResult,
  MusicLibraryDetectorService,
} from './services';
import { SettingsService } from '@infrastructure/settings/settings.service';

// Re-export types for backwards compatibility
export type { DirectoryInfo, BrowseResult } from './services';

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
  adminUsername: string | null;
  adminUserId: string | null;
  adminHasAvatar: boolean;
  hasMusicLibrary: boolean;
  musicLibraryPath: string | null;
  setupCompleted: boolean;
  mountedLibrary: {
    path: string;
    isMounted: boolean;
    hasContent: boolean;
    fileCount: number;
  };
  apiKeyHints: {
    lastfm: string | null;
    fanart: string | null;
  };
}

/**
 * Setup Service - Orchestrator for first-run setup wizard
 *
 * Responsibilities:
 * - Setup state management (setup.json)
 * - Admin account creation
 * - Setup wizard workflow orchestration
 *
 * Delegates to:
 * - DirectoryBrowserService: filesystem browsing
 * - MusicLibraryDetectorService: music library detection and validation
 */
@Injectable()
export class SetupService {
  private readonly dataPath = process.env.DATA_PATH || '/app/data';
  private readonly setupFilePath: string;

  constructor(
    @InjectPinoLogger(SetupService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly directoryBrowser: DirectoryBrowserService,
    private readonly libraryDetector: MusicLibraryDetectorService,
    private readonly settingsService: SettingsService,
  ) {
    this.setupFilePath = path.join(this.dataPath, 'setup.json');
  }

  async saveApiKeys(keys: { lastfm?: string; fanart?: string }): Promise<void> {
    const updates: Record<string, string> = {};
    if (typeof keys.lastfm === 'string') {
      updates['metadata.lastfm.api_key'] = keys.lastfm.trim();
    }
    if (typeof keys.fanart === 'string') {
      updates['metadata.fanart.api_key'] = keys.fanart.trim();
    }
    if (Object.keys(updates).length === 0) return;
    await this.settingsService.setMultiple(updates);
    this.logger.info(`Setup wizard saved API keys: ${Object.keys(updates).join(', ')}`);
  }

  /**
   * Get current setup status
   */
  async getStatus(): Promise<SetupStatus> {
    const [adminInfo, setupState, mountedLibrary, apiKeyHints] = await Promise.all([
      this.getAdminInfo(),
      this.getSetupState(),
      this.libraryDetector.checkMountedLibrary(),
      this.getApiKeyHints(),
    ]);

    const hasAdmin = adminInfo !== null;
    const hasMusicLibrary = !!setupState.musicLibraryPath;
    const needsSetup = !setupState.completed || !hasAdmin;

    return {
      needsSetup,
      hasAdmin,
      adminUsername: adminInfo?.username ?? null,
      adminUserId: adminInfo?.id ?? null,
      adminHasAvatar: adminInfo?.hasAvatar ?? false,
      hasMusicLibrary,
      musicLibraryPath: setupState.musicLibraryPath || null,
      setupCompleted: setupState.completed,
      mountedLibrary,
      apiKeyHints,
    };
  }

  private async getApiKeyHints(): Promise<{ lastfm: string | null; fanart: string | null }> {
    const maskLast4 = (value: string): string | null => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.length <= 4 ? trimmed : trimmed.slice(-4);
    };
    const [lastfm, fanart] = await Promise.all([
      this.settingsService.getString('metadata.lastfm.api_key', ''),
      this.settingsService.getString('metadata.fanart.api_key', ''),
    ]);
    return {
      lastfm: maskLast4(lastfm),
      fanart: maskLast4(fanart),
    };
  }

  /**
   * Create admin account (step 1 of wizard)
   */
  async createAdmin(username: string, password: string): Promise<void> {
    const [state, existingAdmin] = await Promise.all([
      this.getSetupState(),
      this.hasAdminUser(),
    ]);

    // Block if admin already exists
    if (existingAdmin) {
      throw new BadRequestException(
        state.completed
          ? 'Setup already completed. Use admin panel to manage users.'
          : 'Admin user already exists.',
      );
    }

    // If setup was previously completed but database was reset, reset the setup state
    if (state.completed) {
      this.logger.info('Database was reset - resetting setup state to allow re-setup');
      state.completed = false;
      state.completedAt = undefined;
      await this.saveSetupState(state);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    // Hash password and create admin
    const passwordHash = await bcrypt.hash(password, 12);

    await this.drizzle.db.insert(users).values({
      username,
      passwordHash,
      name: username,
      isAdmin: true,
      isActive: true,
      theme: 'dark',
      language: 'es',
      mustChangePassword: false,
    });

    this.logger.info(`Admin user "${username}" created during setup wizard`);
  }

  /**
   * Configure music library path (step 2 of wizard)
   */
  async configureMusicLibrary(
    libraryPath: string,
  ): Promise<{ valid: boolean; message: string; fileCount?: number }> {
    const [state, hasAdmin] = await Promise.all([
      this.getSetupState(),
      this.hasAdminUser(),
    ]);

    // Only block if setup is truly complete
    if (state.completed && hasAdmin) {
      throw new BadRequestException(
        'Setup already completed. Use admin panel to change settings.',
      );
    }

    // Validate using detector service
    const validation = await this.libraryDetector.validateLibraryPath(libraryPath);

    if (!validation.valid) {
      return validation;
    }

    // Save to setup state (not completing setup yet)
    state.musicLibraryPath = libraryPath;
    await this.saveSetupState(state);

    this.logger.info(
      `Music library configured: ${libraryPath} (${validation.fileCount} files found)`,
    );

    return validation;
  }

  /**
   * Browse directories for music library selection
   */
  async browseDirectories(targetPath: string): Promise<BrowseResult> {
    return this.directoryBrowser.browseDirectories(targetPath);
  }

  async createDirectory(parentPath: string, name: string) {
    return this.directoryBrowser.createDirectory(parentPath, name);
  }

  /**
   * Complete setup (step 3 of wizard)
   */
  async completeSetup(): Promise<{ success: boolean; message: string }> {
    const [state, hasAdmin] = await Promise.all([
      this.getSetupState(),
      this.hasAdminUser(),
    ]);

    // If setup is truly complete, return success
    if (state.completed && hasAdmin) {
      return { success: true, message: 'Setup was already completed.' };
    }

    // Verify admin exists
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

    this.logger.info('Setup wizard completed successfully');

    return {
      success: true,
      message: 'Setup completed! You can now log in and start scanning your library.',
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Check if admin user exists
   */
  private async hasAdminUser(): Promise<boolean> {
    return (await this.getAdminInfo()) !== null;
  }

  private async getAdminUsername(): Promise<string | null> {
    return (await this.getAdminInfo())?.username ?? null;
  }

  private async getAdminInfo(): Promise<
    { id: string; username: string; hasAvatar: boolean } | null
  > {
    const result = await this.drizzle.db
      .select({
        id: users.id,
        username: users.username,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(1);
    const row = result[0];
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      hasAvatar: !!row.avatarPath,
    };
  }

  async resetAdmin(): Promise<void> {
    await this.drizzle.db.delete(users).where(eq(users.isAdmin, true));
  }

  /**
   * Get setup state from file
   */
  private async getSetupState(): Promise<SetupState> {
    try {
      const data = await fs.readFile(this.setupFilePath, 'utf-8');
      return JSON.parse(data);
    } catch {
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
    await fs.mkdir(this.dataPath, { recursive: true });
    await fs.writeFile(this.setupFilePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Initialize default settings on first run
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
        key: 'metadata.mbid_auto_search.enabled',
        value: 'true',
        category: 'metadata',
        type: 'boolean',
        description: 'Automatically search for MusicBrainz IDs',
        isPublic: false,
      },
      {
        key: 'metadata.mbid_auto_search.confidence_threshold',
        value: '0.85',
        category: 'metadata',
        type: 'number',
        description: 'Minimum confidence threshold for auto-applying MBIDs',
        isPublic: false,
      },
      {
        key: 'metadata.mbid_auto_search.auto_apply',
        value: 'false',
        category: 'metadata',
        type: 'boolean',
        description: 'Automatically apply MBIDs that meet confidence threshold',
        isPublic: false,
      },
      {
        key: 'metadata.storage.location',
        value: 'centralized',
        category: 'metadata',
        type: 'string',
        description: 'Storage mode: centralized or portable',
        isPublic: false,
      },
      // Metadata provider API keys
      {
        key: 'metadata.lastfm.api_key',
        value: '',
        category: 'metadata',
        type: 'string',
        description: 'Last.fm API key for artist biographies and images',
        isPublic: false,
      },
      {
        key: 'metadata.fanart.api_key',
        value: '',
        category: 'metadata',
        type: 'string',
        description: 'Fanart.tv API key for high-quality artist images',
        isPublic: false,
      },
      // Storage settings
      {
        key: 'metadata.storage.path',
        value: process.env.DATA_PATH
          ? `${process.env.DATA_PATH}/metadata`
          : '/app/data/metadata',
        category: 'metadata',
        type: 'string',
        description: 'Path for storing downloaded metadata (images, etc.)',
        isPublic: false,
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await this.drizzle.db
        .select()
        .from(settings)
        .where(eq(settings.key, setting.key))
        .limit(1);

      if (existing.length === 0) {
        await this.drizzle.db.insert(settings).values(setting);
      }
    }

    this.logger.info(`Initialized ${defaultSettings.length} default settings`);
  }
}
