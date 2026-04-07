import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { SettingsRepository } from './settings.repository';

/**
 * Settings Service
 * Manages application settings with type conversion, validation and in-memory cache.
 *
 * Registered as a @Global() provider via SettingsModule — available everywhere
 * without explicit module import.
 */
@Injectable()
export class SettingsService {
  // In-memory cache for settings
  private readonly cache = new Map<string, unknown>();
  private cacheInitialized = false;

  constructor(
    @InjectPinoLogger(SettingsService.name)
    private readonly logger: PinoLogger,
    private readonly repository: SettingsRepository
  ) {}

  /**
   * Get a setting value with type conversion
   */
  async get<T = unknown>(key: string, defaultValue?: T): Promise<T> {
    if (!this.cacheInitialized) {
      await this.initializeCache();
    }

    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    const setting = await this.repository.findOne(key);

    if (!setting) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      this.logger.debug(`Setting "${key}" not found and no default provided`);
      return null as T;
    }

    const value = this.convertValue(setting.value, setting.type);
    this.cache.set(key, value);

    return value as T;
  }

  /**
   * Get all settings in a category as a key-value object
   */
  async getCategory(category: string): Promise<Record<string, unknown>> {
    const settings = await this.repository.findByCategory(category);

    const result: Record<string, unknown> = {};

    for (const setting of settings) {
      result[setting.key] = this.convertValue(setting.value, setting.type);
    }

    return result;
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: unknown): Promise<void> {
    const stringValue = this.valueToString(value);

    const existing = await this.repository.findOne(key);

    if (existing) {
      await this.repository.update(key, stringValue);
    } else {
      const category = key.split('.')[0] || 'general';
      const type =
        typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string';

      await this.repository.upsert({
        key,
        value: stringValue,
        category,
        type,
        description: `Auto-created setting for ${key}`,
        isPublic: false,
      });
    }

    this.cache.set(key, value);
    this.logger.info(`Updated setting: ${key} = ${stringValue}`);
  }

  /**
   * Set multiple settings at once
   */
  async setMultiple(settings: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, value);
    }
  }

  /**
   * Get boolean setting
   */
  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return this.convertValue(String(value), 'boolean') as boolean;
  }

  /**
   * Get number setting
   */
  async getNumber(key: string, defaultValue = 0): Promise<number> {
    const value = await this.get(key);
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return this.convertValue(String(value), 'number') as number;
  }

  /**
   * Get string setting
   */
  async getString(key: string, defaultValue = ''): Promise<string> {
    const value = await this.get(key);
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return String(value);
  }

  /**
   * Validate an API key for external services
   */
  async validateApiKey(service: 'lastfm' | 'fanart', apiKey: string): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    try {
      switch (service) {
        case 'lastfm':
          return await this.validateLastfmKey(apiKey);

        case 'fanart':
          return await this.validateFanartKey(apiKey);

        default:
          throw new BadRequestException(`Unknown service: ${service}`);
      }
    } catch (error) {
      this.logger.error(
        `Error validating ${service} API key: ${(error as Error).message}`,
        (error as Error).stack
      );
      return false;
    }
  }

  /**
   * Initialize cache from database
   */
  private async initializeCache(): Promise<void> {
    try {
      const allSettings = await this.repository.findAll();

      for (const setting of allSettings) {
        const value = this.convertValue(setting.value, setting.type);
        this.cache.set(setting.key, value);
      }

      this.cacheInitialized = true;
      this.logger.info(`Initialized settings cache with ${allSettings.length} settings`);
    } catch (error) {
      this.logger.error(
        `Error initializing settings cache: ${(error as Error).message}`,
        (error as Error).stack
      );
      this.cacheInitialized = false;
    }
  }

  /**
   * Clear settings cache (for testing or reload)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheInitialized = false;
    this.logger.info('Settings cache cleared');
  }

  /**
   * Convert string value to proper type
   */
  private convertValue(value: string, type: string): unknown {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === '1';

      case 'number': {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      }

      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          this.logger.warn(`Failed to parse JSON value: ${value}`);
          return null;
        }

      case 'string':
      default:
        return value;
    }
  }

  /**
   * Convert value to string for storage
   */
  private valueToString(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Validate Last.fm API key by making a test request
   */
  private async validateLastfmKey(apiKey: string): Promise<boolean> {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=Cher&api_key=${apiKey}&format=json`;
      const response = await fetch(url);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return !data.error;
    } catch (error) {
      this.logger.error(`Last.fm API key validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Validate Fanart.tv API key by making a test request
   */
  private async validateFanartKey(apiKey: string): Promise<boolean> {
    try {
      const testMbid = 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d';
      const url = `https://webservice.fanart.tv/v3/music/${testMbid}`;

      const response = await fetch(url, {
        headers: { 'api-key': apiKey },
      });

      return response.status === 200 || response.status === 404;
    } catch (error) {
      this.logger.error(`Fanart.tv API key validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  // ─── Admin panel methods ──────────────────────────────────────────────────

  async findOne(key: string) {
    return this.repository.findOne(key);
  }

  async findByCategory(category: string) {
    return this.repository.findByCategory(category);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async update(key: string, value: string) {
    const result = await this.repository.update(key, value);
    this.cache.delete(key);
    return result;
  }

  async delete(key: string) {
    const result = await this.repository.delete(key);
    this.cache.delete(key);
    return result;
  }

  // ─── Directory / path utilities ──────────────────────────────────────────

  private static readonly BROWSE_ALLOWED_ROOTS = [
    '/mnt',
    '/media',
    '/music',
    '/data',
    '/home',
    '/app',
    '/srv',
    '/opt',
  ];

  async browseDirectories(targetPath: string) {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const normalizedPath = path.resolve(targetPath).replace(/\\/g, '/');

      const isWindows = process.platform === 'win32';
      const isAllowed = isWindows
        ? /^[A-Za-z]:[\\/]/.test(normalizedPath)
        : SettingsService.BROWSE_ALLOWED_ROOTS.some(
            (root) => normalizedPath.startsWith(root + '/') || normalizedPath === root
          );

      if (!isAllowed) {
        throw new BadRequestException('Path is outside allowed directories');
      }

      try {
        await fs.access(normalizedPath);
      } catch {
        throw new BadRequestException(`Path does not exist: ${normalizedPath}`);
      }

      const stats = await fs.stat(normalizedPath);
      if (!stats.isDirectory()) {
        throw new BadRequestException(`Path is not a directory: ${normalizedPath}`);
      }

      const entries = await fs.readdir(normalizedPath, { withFileTypes: true });

      const directories = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(normalizedPath, entry.name);
          let writable = false;

          try {
            await fs.access(dirPath, fs.constants.W_OK);
            writable = true;
          } catch {
            writable = false;
          }

          directories.push({
            name: entry.name,
            path: dirPath.replace(/\\/g, '/'),
            writable,
          });
        }
      }

      directories.sort((a, b) => a.name.localeCompare(b.name));

      const parent = path.dirname(normalizedPath).replace(/\\/g, '/');

      return {
        path: normalizedPath,
        parent: parent !== normalizedPath ? parent : null,
        directories,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error browsing directory ${targetPath}: ${(error as Error).message}`);
      throw new BadRequestException(`Failed to browse directory: ${(error as Error).message}`);
    }
  }

  async validateStoragePath(targetPath: string) {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const normalizedPath = path.normalize(targetPath).replace(/\\/g, '/');

      let exists = true;
      let pathStats;
      try {
        pathStats = await fs.stat(normalizedPath);
      } catch {
        exists = false;
      }

      if (!exists || !pathStats) {
        const parent = path.dirname(normalizedPath);
        try {
          await fs.access(parent, fs.constants.W_OK);
          return {
            valid: true,
            exists: false,
            writable: true,
            readOnly: false,
            message: 'Path does not exist but can be created (parent is writable)',
            spaceAvailable: 'Unknown',
          };
        } catch {
          return {
            valid: false,
            exists: false,
            writable: false,
            readOnly: true,
            message: 'Path does not exist and parent is not writable',
            spaceAvailable: 'Unknown',
          };
        }
      }

      if (!pathStats.isDirectory()) {
        return {
          valid: false,
          exists: true,
          writable: false,
          readOnly: false,
          message: 'Path exists but is not a directory',
          spaceAvailable: 'N/A',
        };
      }

      let writable = false;
      let readOnly = false;
      try {
        await fs.access(normalizedPath, fs.constants.W_OK);
        writable = true;
      } catch {
        readOnly = true;
      }

      let spaceAvailable = 'Unknown';
      if (writable) {
        try {
          const testFile = path.join(normalizedPath, `.write-test-${Date.now()}`);
          try {
            await fs.writeFile(testFile, '');
            await fs.unlink(testFile);
            spaceAvailable = 'Available (write test successful)';
          } catch {
            writable = false;
            readOnly = true;
            spaceAvailable = 'Write test failed';
          }
        } catch (error) {
          this.logger.warn(
            `Could not determine space for ${normalizedPath}: ${(error as Error).message}`
          );
        }
      }

      const message = writable
        ? 'Path is valid and writable'
        : readOnly
          ? 'Path is read-only - cannot write metadata here'
          : 'Path has insufficient permissions';

      return { valid: writable, exists: true, writable, readOnly, message, spaceAvailable };
    } catch (error) {
      this.logger.error(`Error validating path ${targetPath}: ${(error as Error).message}`);
      return {
        valid: false,
        exists: false,
        writable: false,
        readOnly: false,
        message: `Validation failed: ${(error as Error).message}`,
        spaceAvailable: 'Unknown',
      };
    }
  }
}
