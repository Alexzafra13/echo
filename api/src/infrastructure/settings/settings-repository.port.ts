/**
 * Setting Entity - Domain representation of an application setting
 */
export interface Setting {
  key: string;
  value: string;
  category: string;
  type: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new setting
 */
export interface CreateSettingData {
  key: string;
  value: string;
  category: string;
  type?: string;
  description?: string;
  isPublic?: boolean;
}

/**
 * ISettingsRepository Port - Contract for settings persistence
 *
 * Defines what the domain needs for settings storage,
 * implementation is in infrastructure layer
 */
export interface ISettingsRepository {
  findOne(key: string): Promise<Setting | null>;
  findByCategory(category: string): Promise<Setting[]>;
  findAll(): Promise<Setting[]>;
  create(data: CreateSettingData): Promise<Setting>;
  update(key: string, value: string): Promise<Setting>;
  upsert(data: CreateSettingData): Promise<Setting>;
  delete(key: string): Promise<void>;
  countByCategory(category: string): Promise<number>;
  exists(key: string): Promise<boolean>;
}

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');
