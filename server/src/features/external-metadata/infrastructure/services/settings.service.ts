import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SettingsRepository } from '../persistence/settings.repository';

/**
 * Settings Service
 * Manages application settings with type conversion and validation
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  // In-memory cache for settings
  private readonly cache = new Map<string, any>();
  private cacheInitialized = false;

  constructor(private readonly repository: SettingsRepository) {}

  /**
   * Get a setting value with type conversion
   * @param key Setting key
   * @param defaultValue Default value if not found
   * @returns Setting value with proper type
   */
  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    // Initialize cache on first access
    if (!this.cacheInitialized) {
      await this.initializeCache();
    }

    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Fallback to database
    const setting = await this.repository.findOne(key);

    if (!setting) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      this.logger.warn(`Setting "${key}" not found and no default provided`);
      return null as T;
    }

    // Convert and cache
    const value = this.convertValue(setting.value, setting.type);
    this.cache.set(key, value);

    return value as T;
  }

  /**
   * Get all settings in a category as a key-value object
   * @param category Category name
   * @returns Object with setting keys and values
   */
  async getCategory(category: string): Promise<Record<string, any>> {
    const settings = await this.repository.findByCategory(category);

    const result: Record<string, any> = {};

    for (const setting of settings) {
      result[setting.key] = this.convertValue(setting.value, setting.type);
    }

    return result;
  }

  /**
   * Set a setting value
   * @param key Setting key
   * @param value Value (will be converted to string)
   */
  async set(key: string, value: any): Promise<void> {
    const stringValue = this.valueToString(value);

    await this.repository.update(key, stringValue);

    // Update cache
    this.cache.set(key, value);

    this.logger.log(`Updated setting: ${key} = ${stringValue}`);
  }

  /**
   * Set multiple settings at once
   * @param settings Object with key-value pairs
   */
  async setMultiple(settings: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await this.set(key, value);
    }
  }

  /**
   * Get boolean setting
   * @param key Setting key
   * @param defaultValue Default value
   * @returns Boolean value
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
   * @param key Setting key
   * @param defaultValue Default value
   * @returns Number value
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
   * @param key Setting key
   * @param defaultValue Default value
   * @returns String value
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
   * @param service Service name (lastfm, fanart)
   * @param apiKey API key to validate
   * @returns true if valid, false otherwise
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
      this.logger.error(`Error validating ${service} API key: ${error.message}`, error.stack);
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
      this.logger.log(`Initialized settings cache with ${allSettings.length} settings`);
    } catch (error) {
      this.logger.error(`Error initializing settings cache: ${error.message}`, error.stack);
      this.cacheInitialized = false;
    }
  }

  /**
   * Clear settings cache (for testing or reload)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheInitialized = false;
    this.logger.log('Settings cache cleared');
  }

  /**
   * Convert string value to proper type
   */
  private convertValue(value: string, type: string): any {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === '1';

      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;

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
  private valueToString(value: any): string {
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
      this.logger.error(`Last.fm API key validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate Fanart.tv API key by making a test request
   */
  private async validateFanartKey(apiKey: string): Promise<boolean> {
    try {
      // Test with a known artist MBID (The Beatles)
      const testMbid = 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d';
      const url = `https://webservice.fanart.tv/v3/music/${testMbid}`;

      const response = await fetch(url, {
        headers: {
          'api-key': apiKey
        }
      });

      // 200 = valid key, 401 = invalid key, 404 = valid key but artist not found
      return response.status === 200 || response.status === 404;
    } catch (error) {
      this.logger.error(`Fanart.tv API key validation failed: ${error.message}`);
      return false;
    }
  }
}
