import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { Setting } from '@prisma/client';

/**
 * Settings Repository
 * Handles database operations for settings
 */
@Injectable()
export class SettingsRepository {
  private readonly logger = new Logger(SettingsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a setting by key
   */
  async findOne(key: string): Promise<Setting | null> {
    try {
      return await this.prisma.setting.findUnique({
        where: { key }
      });
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
      return await this.prisma.setting.findMany({
        where: { category },
        orderBy: { key: 'asc' }
      });
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
      return await this.prisma.setting.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }]
      });
    } catch (error) {
      this.logger.error(`Error finding all settings: ${(error as Error).message}`, (error as Error).stack);
      return [];
    }
  }

  /**
   * Create a new setting
   */
  async create(data: {
    key: string;
    value: string;
    category: string;
    type?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<Setting> {
    return await this.prisma.setting.create({
      data: {
        key: data.key,
        value: data.value,
        category: data.category,
        type: data.type || 'string',
        description: data.description,
        isPublic: data.isPublic || false,
      }
    });
  }

  /**
   * Update an existing setting
   */
  async update(key: string, value: string): Promise<Setting> {
    return await this.prisma.setting.update({
      where: { key },
      data: { value, updatedAt: new Date() }
    });
  }

  /**
   * Upsert a setting (create or update)
   */
  async upsert(data: {
    key: string;
    value: string;
    category: string;
    type?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<Setting> {
    return await this.prisma.setting.upsert({
      where: { key: data.key },
      create: {
        key: data.key,
        value: data.value,
        category: data.category,
        type: data.type || 'string',
        description: data.description,
        isPublic: data.isPublic || false,
      },
      update: {
        value: data.value,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete a setting
   */
  async delete(key: string): Promise<void> {
    try {
      await this.prisma.setting.delete({
        where: { key }
      });
    } catch (error) {
      if ((error as any).code !== 'P2025') {  // Not found error
        this.logger.error(`Error deleting setting "${key}": ${(error as Error).message}`, (error as Error).stack);
        throw error;
      }
    }
  }

  /**
   * Count settings by category
   */
  async countByCategory(category: string): Promise<number> {
    return await this.prisma.setting.count({
      where: { category }
    });
  }

  /**
   * Check if a setting exists
   */
  async exists(key: string): Promise<boolean> {
    const count = await this.prisma.setting.count({
      where: { key }
    });
    return count > 0;
  }
}
