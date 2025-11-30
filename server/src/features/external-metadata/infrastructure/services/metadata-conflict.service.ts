import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq, and, desc, sql } from 'drizzle-orm';
import { metadataConflicts, artists, albums, tracks } from '@infrastructure/database/schema';
import { ImageDownloadService } from './image-download.service';
import { StorageService } from './storage.service';
import { NotFoundError, ConflictError } from '@shared/errors';
import * as path from 'path';

/**
 * Entity types that can have metadata conflicts
 */
export type EntityType = 'track' | 'album' | 'artist';

/**
 * Metadata fields that can have conflicts
 */
export type ConflictField = 'cover' | 'externalCover' | 'year' | 'biography' | 'images' | 'artistName' | 'albumName';

/**
 * External metadata sources
 */
export type ConflictSource = 'musicbrainz' | 'lastfm' | 'fanart' | 'coverartarchive';

/**
 * Conflict resolution status
 */
export type ConflictStatus = 'pending' | 'accepted' | 'rejected' | 'ignored';

/**
 * Priority levels for conflicts
 */
export enum ConflictPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

/**
 * Interface for creating a new conflict
 */
export interface CreateConflictDto {
  entityId: string;
  entityType: EntityType;
  field: ConflictField;
  currentValue?: string;
  suggestedValue: string;
  source: ConflictSource;
  priority?: ConflictPriority;
  metadata?: Record<string, any>;
}

/**
 * Interface for conflict with entity details
 */
export interface ConflictWithEntity {
  id: string;
  entityId: string;
  entityType: EntityType;
  field: ConflictField;
  currentValue?: string;
  suggestedValue: string;
  source: ConflictSource;
  status: ConflictStatus;
  priority: number;
  metadata?: any;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  entity?: {
    name: string;
    [key: string]: any;
  };
}

/**
 * MetadataConflictService - Service for managing metadata conflicts
 *
 * Responsibilities:
 * - Detect conflicts between existing and external metadata
 * - Store conflicts for user review
 * - Provide methods to accept/reject/ignore conflicts
 * - Apply accepted changes to entities
 *
 * Design Pattern: Service Layer
 * Purpose: Centralize conflict detection and resolution logic
 */
@Injectable()
export class MetadataConflictService {
  private readonly logger = new Logger(MetadataConflictService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Create a new metadata conflict
   * For cover images, only keeps the highest resolution suggestion (avoids duplicates)
   *
   * @param data - Conflict data
   * @returns Created conflict
   */
  async createConflict(data: CreateConflictDto): Promise<ConflictWithEntity> {
    // For cover images: check if there's already a pending conflict for this entity/field (any source)
    if (data.field === 'externalCover' || data.field === 'cover') {
      const results = await this.drizzle.db
        .select()
        .from(metadataConflicts)
        .where(
          and(
            eq(metadataConflicts.entityId, data.entityId),
            eq(metadataConflicts.field, data.field),
            eq(metadataConflicts.status, 'pending'),
          )
        )
        .limit(1);

      const existingConflict = results[0] || null;

      if (existingConflict) {
        // Get existing metadata (already parsed as JSONB)
        const existingMeta = existingConflict.metadata
          ? (existingConflict.metadata as Record<string, any>)
          : {};
        const newMeta = data.metadata || {};

        // Compare resolutions
        const shouldReplace = this.shouldReplaceConflict(existingMeta, newMeta);

        if (shouldReplace) {
          // Update existing conflict with better resolution
          const priority =
            data.priority ??
            (data.source === 'musicbrainz' || data.source === 'coverartarchive'
              ? ConflictPriority.HIGH
              : ConflictPriority.MEDIUM);

          const updateData: any = {
            suggestedValue: data.suggestedValue,
            source: data.source,
            priority,
          };

          if (data.metadata) {
            updateData.metadata = data.metadata;
          }

          const updatedResults = await this.drizzle.db
            .update(metadataConflicts)
            .set(updateData)
            .where(eq(metadataConflicts.id, existingConflict.id))
            .returning();

          const updated = updatedResults[0];

          this.logger.log(
            `Updated conflict ${existingConflict.id} with better resolution: ${newMeta.suggestedResolution} from ${data.source}`,
          );

          return this.mapConflictWithEntity(updated);
        } else {
          this.logger.debug(
            `Keeping existing conflict for ${data.entityType} ${data.entityId}: existing resolution ${existingMeta.suggestedResolution} is better than ${newMeta.suggestedResolution}`,
          );
          return this.mapConflictWithEntity(existingConflict);
        }
      }
    } else {
      // For non-cover fields: don't create duplicate pending conflicts for same entity/field/source
      const existingResults = await this.drizzle.db
        .select()
        .from(metadataConflicts)
        .where(
          and(
            eq(metadataConflicts.entityId, data.entityId),
            eq(metadataConflicts.field, data.field),
            eq(metadataConflicts.source, data.source),
            eq(metadataConflicts.status, 'pending'),
          )
        )
        .limit(1);

      const existing = existingResults[0] || null;

      if (existing) {
        this.logger.debug(
          `Conflict already exists for ${data.entityType} ${data.entityId}, field ${data.field}`,
        );
        return this.mapConflictWithEntity(existing);
      }
    }

    // Determine priority: MusicBrainz/CoverArtArchive always high, others medium
    const priority =
      data.priority ??
      (data.source === 'musicbrainz' || data.source === 'coverartarchive'
        ? ConflictPriority.HIGH
        : ConflictPriority.MEDIUM);

    const insertData: any = {
      entityId: data.entityId,
      entityType: data.entityType,
      field: data.field,
      suggestedValue: data.suggestedValue,
      source: data.source,
      priority,
    };

    if (data.currentValue !== undefined) {
      insertData.currentValue = data.currentValue;
    }

    if (data.metadata) {
      insertData.metadata = data.metadata;
    }

    const conflictResults = await this.drizzle.db
      .insert(metadataConflicts)
      .values(insertData)
      .returning();

    const conflict = conflictResults[0];

    this.logger.log(
      `Created ${priority === ConflictPriority.HIGH ? 'HIGH' : 'MEDIUM'} priority conflict for ${data.entityType} ${data.entityId}: ${data.field} (source: ${data.source})`,
    );

    return this.mapConflictWithEntity(conflict);
  }

  /**
   * Determine if a new conflict should replace an existing one
   * Based on image resolution comparison
   *
   * @param existingMeta - Existing conflict metadata
   * @param newMeta - New conflict metadata
   * @returns true if new conflict has better resolution
   */
  private shouldReplaceConflict(existingMeta: any, newMeta: any): boolean {
    const existingRes = existingMeta.suggestedResolution;
    const newRes = newMeta.suggestedResolution;

    // If either doesn't have resolution info, keep existing (cautious approach)
    if (!existingRes || !newRes || newRes === 'Desconocida') {
      return false;
    }

    // Parse resolutions (format: "1200×1200")
    const parseResolution = (res: string): number => {
      const parts = res.split('×');
      if (parts.length !== 2) return 0;
      const width = parseInt(parts[0], 10);
      const height = parseInt(parts[1], 10);
      return width * height; // Total pixels
    };

    const existingPixels = parseResolution(existingRes);
    const newPixels = parseResolution(newRes);

    // Replace if new has more pixels
    return newPixels > existingPixels;
  }

  /**
   * Get all pending conflicts with pagination
   *
   * @param skip - Number of conflicts to skip
   * @param take - Number of conflicts to take
   * @param filters - Optional filters
   * @returns List of conflicts with total count
   */
  async getPendingConflicts(
    skip = 0,
    take = 20,
    filters?: {
      entityType?: EntityType;
      source?: ConflictSource;
      priority?: ConflictPriority;
    },
  ): Promise<{ conflicts: ConflictWithEntity[]; total: number }> {
    const conditions = [eq(metadataConflicts.status, 'pending')];

    if (filters?.entityType) {
      conditions.push(eq(metadataConflicts.entityType, filters.entityType));
    }
    if (filters?.source) {
      conditions.push(eq(metadataConflicts.source, filters.source));
    }
    if (filters?.priority) {
      conditions.push(eq(metadataConflicts.priority, filters.priority));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [conflicts, totalResult] = await Promise.all([
      this.drizzle.db
        .select()
        .from(metadataConflicts)
        .where(whereClause)
        .orderBy(desc(metadataConflicts.priority), desc(metadataConflicts.createdAt))
        .limit(take)
        .offset(skip),
      this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(metadataConflicts)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count || 0;

    const conflictsWithEntities = await Promise.all(
      conflicts.map((c) => this.enrichConflictWithEntity(c)),
    );

    return {
      conflicts: conflictsWithEntities,
      total,
    };
  }

  /**
   * Get conflicts for a specific entity
   *
   * @param entityId - Entity ID
   * @param entityType - Entity type
   * @returns List of conflicts for the entity
   */
  async getConflictsForEntity(
    entityId: string,
    entityType: EntityType,
  ): Promise<ConflictWithEntity[]> {
    const conflicts = await this.drizzle.db
      .select()
      .from(metadataConflicts)
      .where(
        and(
          eq(metadataConflicts.entityId, entityId),
          eq(metadataConflicts.entityType, entityType),
          eq(metadataConflicts.status, 'pending'),
        )
      )
      .orderBy(desc(metadataConflicts.priority));

    return Promise.all(conflicts.map((c) => this.enrichConflictWithEntity(c)));
  }

  /**
   * Accept a conflict and apply the suggested value
   *
   * @param conflictId - Conflict ID
   * @param userId - User who resolved the conflict
   * @returns Updated entity
   */
  async acceptConflict(conflictId: string, userId?: string): Promise<any> {
    const conflictResults = await this.drizzle.db
      .select()
      .from(metadataConflicts)
      .where(eq(metadataConflicts.id, conflictId))
      .limit(1);

    const conflict = conflictResults[0] || null;

    if (!conflict) {
      throw new NotFoundError('MetadataConflict', conflictId);
    }

    if (conflict.status !== 'pending') {
      throw new ConflictError(`Conflict ${conflictId} is already ${conflict.status}`);
    }

    // Verify that the entity still exists before attempting to apply changes
    const entityExists = await this.verifyEntityExists(conflict.entityType as EntityType, conflict.entityId);

    if (!entityExists) {
      // Entity was deleted - mark conflict as rejected automatically
      await this.drizzle.db
        .update(metadataConflicts)
        .set({
          status: 'rejected',
          resolvedAt: new Date(),
          resolvedBy: 'system',
        })
        .where(eq(metadataConflicts.id, conflictId));

      this.logger.warn(
        `Conflict ${conflictId} rejected automatically: ${conflict.entityType} ${conflict.entityId} no longer exists (orphaned conflict)`,
      );

      throw new NotFoundError(
        conflict.entityType,
        `${conflict.entityId} (conflict auto-rejected)`,
      );
    }

    // Apply the change based on entity type
    let updatedEntity;

    try {
      switch (conflict.entityType) {
        case 'artist':
          updatedEntity = await this.applyArtistChange(conflict);
          break;
        case 'album':
          updatedEntity = await this.applyAlbumChange(conflict);
          break;
        case 'track':
          updatedEntity = await this.applyTrackChange(conflict);
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error applying conflict ${conflictId}: ${(error as Error).message}`,
      );
      throw error;
    }

    // Mark conflict as accepted
    await this.drizzle.db
      .update(metadataConflicts)
      .set({
        status: 'accepted',
        resolvedAt: new Date(),
        resolvedBy: userId,
      })
      .where(eq(metadataConflicts.id, conflictId));

    this.logger.log(
      `Accepted conflict ${conflictId}: ${conflict.field} for ${conflict.entityType} ${conflict.entityId}`,
    );

    return updatedEntity;
  }

  /**
   * Reject a conflict (keep current value)
   *
   * @param conflictId - Conflict ID
   * @param userId - User who resolved the conflict
   */
  async rejectConflict(conflictId: string, userId?: string): Promise<void> {
    await this.drizzle.db
      .update(metadataConflicts)
      .set({
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedBy: userId,
      })
      .where(eq(metadataConflicts.id, conflictId));

    this.logger.log(`Rejected conflict ${conflictId}`);
  }

  /**
   * Ignore a conflict (don't show again for this field/source)
   *
   * @param conflictId - Conflict ID
   * @param userId - User who resolved the conflict
   */
  async ignoreConflict(conflictId: string, userId?: string): Promise<void> {
    await this.drizzle.db
      .update(metadataConflicts)
      .set({
        status: 'ignored',
        resolvedAt: new Date(),
        resolvedBy: userId,
      })
      .where(eq(metadataConflicts.id, conflictId));

    this.logger.log(`Ignored conflict ${conflictId}`);
  }

  /**
   * Check if updating a field would create a conflict
   * Returns true if a conflict should be created
   *
   * @param currentValue - Current value
   * @param newValue - New value
   * @returns Whether values are different (conflict exists)
   */
  hasConflict(currentValue: any, newValue: any): boolean {
    // Both empty = no conflict
    if (!currentValue && !newValue) return false;

    // One empty, one has value = conflict
    if (!currentValue && newValue) return false; // Allow filling empty fields
    if (currentValue && !newValue) return false; // Ignore if new is empty

    // Both have values but different = conflict
    return currentValue !== newValue;
  }

  /**
   * Apply artist metadata change
   */
  private async applyArtistChange(conflict: any): Promise<any> {
    const updateData: any = {};

    switch (conflict.field) {
      case 'biography':
        updateData.biography = conflict.suggestedValue;
        updateData.biographySource = conflict.source;
        break;
      case 'images':
        // Parse images from metadata
        const images = typeof conflict.metadata === 'string'
          ? JSON.parse(conflict.metadata)
          : conflict.metadata || {};
        if (images.smallImageUrl) updateData.smallImageUrl = images.smallImageUrl;
        if (images.mediumImageUrl) updateData.mediumImageUrl = images.mediumImageUrl;
        if (images.largeImageUrl) updateData.largeImageUrl = images.largeImageUrl;
        if (images.backgroundImageUrl) updateData.backgroundImageUrl = images.backgroundImageUrl;
        if (images.bannerImageUrl) updateData.bannerImageUrl = images.bannerImageUrl;
        if (images.logoImageUrl) updateData.logoImageUrl = images.logoImageUrl;
        break;
    }

    const updatedResults = await this.drizzle.db
      .update(artists)
      .set(updateData)
      .where(eq(artists.id, conflict.entityId))
      .returning();

    return updatedResults[0];
  }

  /**
   * Apply album metadata change
   */
  private async applyAlbumChange(conflict: any): Promise<any> {
    const updateData: any = {};

    switch (conflict.field) {
      case 'externalCover':
        // Download the cover image from the URL
        const coverUrl = conflict.suggestedValue;
        this.logger.log(
          `Downloading cover for album ${conflict.entityId} from ${conflict.source}: ${coverUrl}`,
        );

        try {
          // Get album metadata path
          const metadataPath = await this.storage.getAlbumMetadataPath(conflict.entityId);
          const coverPath = path.join(metadataPath, 'cover.jpg');

          // Download and save the cover
          await this.imageDownload.downloadAndSave(coverUrl, coverPath);

          updateData.externalCoverPath = coverPath;
          updateData.externalCoverSource = conflict.source;
          updateData.externalInfoUpdatedAt = new Date();

          this.logger.log(
            `Successfully downloaded cover for album ${conflict.entityId}: ${coverPath}`,
          );
        } catch (error) {
          this.logger.error(
            `Error downloading cover for album ${conflict.entityId}: ${(error as Error).message}`,
          );
          throw error;
        }
        break;
      case 'year':
        updateData.year = parseInt(conflict.suggestedValue, 10);
        break;
    }

    const updatedResults = await this.drizzle.db
      .update(albums)
      .set(updateData)
      .where(eq(albums.id, conflict.entityId))
      .returning();

    return updatedResults[0];
  }

  /**
   * Apply track metadata change
   */
  private async applyTrackChange(conflict: any): Promise<any> {
    const updateData: any = {};

    switch (conflict.field) {
      case 'year':
        updateData.year = parseInt(conflict.suggestedValue, 10);
        break;
    }

    const updatedResults = await this.drizzle.db
      .update(tracks)
      .set(updateData)
      .where(eq(tracks.id, conflict.entityId))
      .returning();

    return updatedResults[0];
  }

  /**
   * Verify if an entity still exists in the database
   * @param entityType - Type of entity (artist, album, track)
   * @param entityId - ID of the entity
   * @returns true if entity exists, false otherwise
   */
  private async verifyEntityExists(entityType: EntityType, entityId: string): Promise<boolean> {
    try {
      switch (entityType) {
        case 'artist':
          const artistResults = await this.drizzle.db
            .select({ id: artists.id })
            .from(artists)
            .where(eq(artists.id, entityId))
            .limit(1);
          return artistResults.length > 0;
        case 'album':
          const albumResults = await this.drizzle.db
            .select({ id: albums.id })
            .from(albums)
            .where(eq(albums.id, entityId))
            .limit(1);
          return albumResults.length > 0;
        case 'track':
          const trackResults = await this.drizzle.db
            .select({ id: tracks.id })
            .from(tracks)
            .where(eq(tracks.id, entityId))
            .limit(1);
          return trackResults.length > 0;
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Error verifying entity existence: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Clean up orphaned conflicts (conflicts referencing deleted entities)
   * @returns Number of orphaned conflicts rejected
   */
  async cleanupOrphanedConflicts(): Promise<number> {
    const pendingConflicts = await this.drizzle.db
      .select({
        id: metadataConflicts.id,
        entityType: metadataConflicts.entityType,
        entityId: metadataConflicts.entityId,
      })
      .from(metadataConflicts)
      .where(eq(metadataConflicts.status, 'pending'));

    let orphanedCount = 0;

    for (const conflict of pendingConflicts) {
      const exists = await this.verifyEntityExists(
        conflict.entityType as EntityType,
        conflict.entityId,
      );

      if (!exists) {
        // Mark as rejected
        await this.drizzle.db
          .update(metadataConflicts)
          .set({
            status: 'rejected',
            resolvedAt: new Date(),
            resolvedBy: 'system-cleanup',
          })
          .where(eq(metadataConflicts.id, conflict.id));

        orphanedCount++;
        this.logger.debug(
          `Cleaned up orphaned conflict ${conflict.id} for deleted ${conflict.entityType} ${conflict.entityId}`,
        );
      }
    }

    if (orphanedCount > 0) {
      this.logger.log(`Cleaned up ${orphanedCount} orphaned conflicts`);
    }

    return orphanedCount;
  }

  /**
   * Enrich conflict with entity name
   * First tries to get the name from conflict metadata, then falls back to database query
   */
  private async enrichConflictWithEntity(conflict: any): Promise<ConflictWithEntity> {
    let entityName = 'Unknown';

    try {
      // First, try to get name from metadata (faster, no DB query needed)
      const metadata = conflict.metadata
        ? typeof conflict.metadata === 'string'
          ? JSON.parse(conflict.metadata)
          : conflict.metadata
        : null;

      if (metadata) {
        if (conflict.entityType === 'artist' && metadata.artistName) {
          entityName = metadata.artistName;
        } else if (conflict.entityType === 'album' && metadata.albumName) {
          entityName = metadata.albumName;
        } else if (conflict.entityType === 'track' && metadata.trackName) {
          entityName = metadata.trackName;
        }
      }

      // If not found in metadata, query the database
      if (entityName === 'Unknown') {
        switch (conflict.entityType) {
          case 'artist':
            const artistResults = await this.drizzle.db
              .select({ name: artists.name })
              .from(artists)
              .where(eq(artists.id, conflict.entityId))
              .limit(1);
            entityName = artistResults[0]?.name || 'Unknown Artist';
            break;
          case 'album':
            const albumResults = await this.drizzle.db
              .select({ name: albums.name })
              .from(albums)
              .where(eq(albums.id, conflict.entityId))
              .limit(1);
            entityName = albumResults[0]?.name || 'Unknown Album';
            break;
          case 'track':
            const trackResults = await this.drizzle.db
              .select({ title: tracks.title })
              .from(tracks)
              .where(eq(tracks.id, conflict.entityId))
              .limit(1);
            entityName = trackResults[0]?.title || 'Unknown Track';
            break;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch entity name for conflict ${conflict.id}: ${(error as Error).message}`);
    }

    return this.mapConflictWithEntity(conflict, { name: entityName });
  }

  /**
   * Map database conflict to ConflictWithEntity
   */
  private mapConflictWithEntity(conflict: any, entity?: { name: string }): ConflictWithEntity {
    return {
      id: conflict.id,
      entityId: conflict.entityId,
      entityType: conflict.entityType as EntityType,
      field: conflict.field as ConflictField,
      currentValue: conflict.currentValue,
      suggestedValue: conflict.suggestedValue,
      source: conflict.source as ConflictSource,
      status: conflict.status as ConflictStatus,
      priority: conflict.priority,
      metadata: conflict.metadata
        ? typeof conflict.metadata === 'string'
          ? JSON.parse(conflict.metadata)
          : conflict.metadata
        : undefined,
      createdAt: conflict.createdAt,
      resolvedAt: conflict.resolvedAt,
      resolvedBy: conflict.resolvedBy,
      entity,
    };
  }
}
