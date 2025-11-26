import { Injectable } from '@nestjs/common';
import { eq, and, desc, count } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { radioStations } from '@infrastructure/database/schema';
import { RadioStation } from '../../domain/entities/radio-station.entity';
import { IRadioStationRepository } from '../../domain/ports/radio-station-repository.port';
import { RadioStationMapper } from './radio-station.mapper';

/**
 * DrizzleRadioStationRepository - Implementation of IRadioStationRepository with Drizzle
 */
@Injectable()
export class DrizzleRadioStationRepository implements IRadioStationRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Save or update a favorite station
   */
  async save(station: RadioStation): Promise<RadioStation> {
    const data = RadioStationMapper.toPersistence(station);

    // Use upsert pattern: try to update, if not found then insert
    const existing = await this.drizzle.db
      .select()
      .from(radioStations)
      .where(eq(radioStations.id, data.id))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record (exclude userId from update)
      const { userId, ...updateData } = data;
      const result = await this.drizzle.db
        .update(radioStations)
        .set(updateData)
        .where(eq(radioStations.id, data.id))
        .returning();

      return RadioStationMapper.toDomain(result[0]);
    } else {
      // Insert new record
      const result = await this.drizzle.db
        .insert(radioStations)
        .values(data)
        .returning();

      return RadioStationMapper.toDomain(result[0]);
    }
  }

  /**
   * Find station by ID
   */
  async findById(id: string): Promise<RadioStation | null> {
    const result = await this.drizzle.db
      .select()
      .from(radioStations)
      .where(eq(radioStations.id, id))
      .limit(1);

    return result[0] ? RadioStationMapper.toDomain(result[0]) : null;
  }

  /**
   * Find station by Radio Browser UUID
   */
  async findByStationUuid(
    userId: string,
    stationUuid: string,
  ): Promise<RadioStation | null> {
    const result = await this.drizzle.db
      .select()
      .from(radioStations)
      .where(
        and(
          eq(radioStations.userId, userId),
          eq(radioStations.stationUuid, stationUuid),
        ),
      )
      .limit(1);

    return result[0] ? RadioStationMapper.toDomain(result[0]) : null;
  }

  /**
   * Get all favorite stations for a user
   */
  async findByUserId(userId: string): Promise<RadioStation[]> {
    const result = await this.drizzle.db
      .select()
      .from(radioStations)
      .where(
        and(
          eq(radioStations.userId, userId),
          eq(radioStations.isFavorite, true),
        ),
      )
      .orderBy(desc(radioStations.createdAt));

    return RadioStationMapper.toDomainArray(result);
  }

  /**
   * Delete a favorite station
   */
  async delete(id: string): Promise<void> {
    await this.drizzle.db
      .delete(radioStations)
      .where(eq(radioStations.id, id));
  }

  /**
   * Count favorite stations for a user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: count() })
      .from(radioStations)
      .where(
        and(
          eq(radioStations.userId, userId),
          eq(radioStations.isFavorite, true),
        ),
      );

    return result[0]?.count ?? 0;
  }
}
