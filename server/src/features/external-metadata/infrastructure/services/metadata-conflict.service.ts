import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { ImageDownloadService } from './image-download.service';
import { StorageService } from './storage.service';
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
    private readonly prisma: PrismaService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Create a new metadata conflict
   *
   * @param data - Conflict data
   * @returns Created conflict
   */
  async createConflict(data: CreateConflictDto): Promise<ConflictWithEntity> {
    // Don't create duplicate pending conflicts for same entity/field/source
    const existing = await this.prisma.metadataConflict.findFirst({
      where: {
        entityId: data.entityId,
        field: data.field,
        source: data.source,
        status: 'pending',
      },
    });

    if (existing) {
      this.logger.debug(
        `Conflict already exists for ${data.entityType} ${data.entityId}, field ${data.field}`,
      );
      return this.mapConflictWithEntity(existing);
    }

    // Determine priority: MusicBrainz/CoverArtArchive always high, others medium
    const priority =
      data.priority ??
      (data.source === 'musicbrainz' || data.source === 'coverartarchive'
        ? ConflictPriority.HIGH
        : ConflictPriority.MEDIUM);

    const conflict = await this.prisma.metadataConflict.create({
      data: {
        entityId: data.entityId,
        entityType: data.entityType,
        field: data.field,
        currentValue: data.currentValue,
        suggestedValue: data.suggestedValue,
        source: data.source,
        priority,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      },
    });

    this.logger.log(
      `Created ${priority === ConflictPriority.HIGH ? 'HIGH' : 'MEDIUM'} priority conflict for ${data.entityType} ${data.entityId}: ${data.field} (source: ${data.source})`,
    );

    return this.mapConflictWithEntity(conflict);
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
    const where: any = { status: 'pending' };

    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.source) where.source = filters.source;
    if (filters?.priority) where.priority = filters.priority;

    const [conflicts, total] = await Promise.all([
      this.prisma.metadataConflict.findMany({
        where,
        skip,
        take,
        orderBy: [
          { priority: 'desc' }, // High priority first
          { createdAt: 'desc' }, // Newest first
        ],
      }),
      this.prisma.metadataConflict.count({ where }),
    ]);

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
    const conflicts = await this.prisma.metadataConflict.findMany({
      where: {
        entityId,
        entityType,
        status: 'pending',
      },
      orderBy: { priority: 'desc' },
    });

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
    const conflict = await this.prisma.metadataConflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    if (conflict.status !== 'pending') {
      throw new Error(`Conflict ${conflictId} is already ${conflict.status}`);
    }

    // Apply the change based on entity type
    let updatedEntity;

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

    // Mark conflict as accepted
    await this.prisma.metadataConflict.update({
      where: { id: conflictId },
      data: {
        status: 'accepted',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

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
    await this.prisma.metadataConflict.update({
      where: { id: conflictId },
      data: {
        status: 'rejected',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

    this.logger.log(`Rejected conflict ${conflictId}`);
  }

  /**
   * Ignore a conflict (don't show again for this field/source)
   *
   * @param conflictId - Conflict ID
   * @param userId - User who resolved the conflict
   */
  async ignoreConflict(conflictId: string, userId?: string): Promise<void> {
    await this.prisma.metadataConflict.update({
      where: { id: conflictId },
      data: {
        status: 'ignored',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });

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
        const images = JSON.parse(conflict.metadata || '{}');
        if (images.smallImageUrl) updateData.smallImageUrl = images.smallImageUrl;
        if (images.mediumImageUrl) updateData.mediumImageUrl = images.mediumImageUrl;
        if (images.largeImageUrl) updateData.largeImageUrl = images.largeImageUrl;
        if (images.backgroundImageUrl) updateData.backgroundImageUrl = images.backgroundImageUrl;
        if (images.bannerImageUrl) updateData.bannerImageUrl = images.bannerImageUrl;
        if (images.logoImageUrl) updateData.logoImageUrl = images.logoImageUrl;
        break;
    }

    return this.prisma.artist.update({
      where: { id: conflict.entityId },
      data: updateData,
    });
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

    return this.prisma.album.update({
      where: { id: conflict.entityId },
      data: updateData,
    });
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

    return this.prisma.track.update({
      where: { id: conflict.entityId },
      data: updateData,
    });
  }

  /**
   * Enrich conflict with entity name
   * First tries to get the name from conflict metadata, then falls back to database query
   */
  private async enrichConflictWithEntity(conflict: any): Promise<ConflictWithEntity> {
    let entityName = 'Unknown';

    try {
      // First, try to get name from metadata (faster, no DB query needed)
      const metadata = conflict.metadata ? JSON.parse(conflict.metadata) : null;

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
            const artist = await this.prisma.artist.findUnique({
              where: { id: conflict.entityId },
              select: { name: true },
            });
            entityName = artist?.name || 'Unknown Artist';
            break;
          case 'album':
            const album = await this.prisma.album.findUnique({
              where: { id: conflict.entityId },
              select: { name: true },
            });
            entityName = album?.name || 'Unknown Album';
            break;
          case 'track':
            const track = await this.prisma.track.findUnique({
              where: { id: conflict.entityId },
              select: { title: true },
            });
            entityName = track?.title || 'Unknown Track';
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
      metadata: conflict.metadata ? JSON.parse(conflict.metadata) : undefined,
      createdAt: conflict.createdAt,
      resolvedAt: conflict.resolvedAt,
      resolvedBy: conflict.resolvedBy,
      entity,
    };
  }
}
