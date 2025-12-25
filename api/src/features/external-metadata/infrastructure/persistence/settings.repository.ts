import { Injectable, Logger } from '@nestjs/common';
import { eq, asc, count } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { settings } from '@infrastructure/database/schema';
import {
  ISettingsRepository,
  Setting,
  CreateSettingData,
} from '../../domain/ports';

/**
 * Settings Repository
 * Handles database operations for settings
 * Implements ISettingsRepository port
 */
@Injectable()
export class SettingsRepository implements ISettingsRepository {
  private readonly logger = new Logger(SettingsRepository.name);

  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Find a setting by key
   */
  async findOne(key: string): Promise<Setting | null> {
    try {
      const result = await this.drizzle.db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      return result[0] ?? null;
    } catch (error) {
      this.logger.error(`Error finding setting "${key}": ${(error as Error).message}`, (error as Error).stack);
      return null;
    }
  }

  /**
   * Find all settings by category
   */
  async findByCategory(category: string): Promise<Setting[]> {
    try {
      return await this.drizzle.db
        .select()
        .from(settings)
        .where(eq(settings.category, category))
        .orderBy(asc(settings.key));
    } catch (error) {
      this.logger.error(`Error finding settings for category "${category}": ${(error as Error).message}`, (error as Error).stack);
      return [];
    }
  }

  /**
   * Find all settings
   */
  async findAll(): Promise<Setting[]> {
    try {
      return await this.drizzle.db
        .select()
        .from(settings)
        .orderBy(asc(settings.category), asc(settings.key));
    } catch (error) {
      this.logger.error(`Error finding all settings: ${(error as Error).message}`, (error as Error).stack);
      return [];
    }
  }

  /**
   * Create a new setting
   */
  async create(data: CreateSettingData): Promise<Setting> {
    const result = await this.drizzle.db
      .insert(settings)
      .values({
        key: data.key,
        value: data.value,
        category: data.category,
        type: data.type || 'string',
        description: data.description,
        isPublic: data.isPublic || false,
      })
      .returning();

    return result[0];
  }

  /**
   * Update an existing setting
   */
  async update(key: string, value: string): Promise<Setting> {
    const result = await this.drizzle.db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();

    return result[0];
  }

  /**
   * Upsert a setting (create or update)
   */
  async upsert(data: CreateSettingData): Promise<Setting> {
    // Check if exists
    const existing = await this.findOne(data.key);

    if (existing) {
      // Update
      const result = await this.drizzle.db
        .update(settings)
        .set({
          value: data.value,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, data.key))
        .returning();

      return result[0];
    } else {
      // Create
      return await this.create(data);
    }
  }

  /**
   * Delete a setting
   */
  async delete(key: string): Promise<void> {
    try {
      await this.drizzle.db
        .delete(settings)
        .where(eq(settings.key, key));
    } catch (error) {
      this.logger.error(`Error deleting setting "${key}": ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * Count settings by category
   */
  async countByCategory(category: string): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(settings)
      .where(eq(settings.category, category));

    return result[0]?.count ?? 0;
  }

  /**
   * Check if a setting exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(settings)
      .where(eq(settings.key, key));

    return (result[0]?.count ?? 0) > 0;
  }
}
