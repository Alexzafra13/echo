import { Setting, CreateSettingData } from '../entities/setting.entity';

/**
 * ISettingsRepository Port - Contract for settings persistence
 *
 * Defines what the domain needs for settings storage,
 * implementation is in infrastructure layer
 */
export interface ISettingsRepository {
  /**
   * Find a setting by key
   */
  findOne(key: string): Promise<Setting | null>;

  /**
   * Find all settings by category
   */
  findByCategory(category: string): Promise<Setting[]>;

  /**
   * Find all settings
   */
  findAll(): Promise<Setting[]>;

  /**
   * Create a new setting
   */
  create(data: CreateSettingData): Promise<Setting>;

  /**
   * Update an existing setting value
   */
  update(key: string, value: string): Promise<Setting>;

  /**
   * Upsert a setting (create or update)
   */
  upsert(data: CreateSettingData): Promise<Setting>;

  /**
   * Delete a setting
   */
  delete(key: string): Promise<void>;

  /**
   * Count settings by category
   */
  countByCategory(category: string): Promise<number>;

  /**
   * Check if a setting exists
   */
  exists(key: string): Promise<boolean>;
}

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');
