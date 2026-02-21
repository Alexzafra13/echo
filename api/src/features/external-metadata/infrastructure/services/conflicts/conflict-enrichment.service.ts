import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { metadataConflicts, artists, albums, tracks } from '@infrastructure/database/schema';

export type EntityType = 'track' | 'album' | 'artist';
export type ConflictField =
  | 'cover'
  | 'externalCover'
  | 'year'
  | 'biography'
  | 'images'
  | 'artistName'
  | 'albumName';
export type ConflictSource = 'musicbrainz' | 'lastfm' | 'fanart' | 'coverartarchive';
export type ConflictStatus = 'pending' | 'accepted' | 'rejected' | 'ignored';

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
 * Service for enriching conflicts with entity data and verification
 * Handles entity existence checks and name lookups
 */
@Injectable()
export class ConflictEnrichmentService {
  constructor(
    @InjectPinoLogger(ConflictEnrichmentService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService
  ) {}

  /**
   * Verify if an entity still exists in the database
   */
  async verifyEntityExists(entityType: EntityType, entityId: string): Promise<boolean> {
    try {
      switch (entityType) {
        case 'artist': {
          const artistResults = await this.drizzle.db
            .select({ id: artists.id })
            .from(artists)
            .where(eq(artists.id, entityId))
            .limit(1);
          return artistResults.length > 0;
        }

        case 'album': {
          const albumResults = await this.drizzle.db
            .select({ id: albums.id })
            .from(albums)
            .where(eq(albums.id, entityId))
            .limit(1);
          return albumResults.length > 0;
        }

        case 'track': {
          const trackResults = await this.drizzle.db
            .select({ id: tracks.id })
            .from(tracks)
            .where(eq(tracks.id, entityId))
            .limit(1);
          return trackResults.length > 0;
        }

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Error verifying entity existence: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get entity name by type and ID
   */
  async getEntityName(entityType: EntityType, entityId: string): Promise<string> {
    try {
      switch (entityType) {
        case 'artist': {
          const artistResults = await this.drizzle.db
            .select({ name: artists.name })
            .from(artists)
            .where(eq(artists.id, entityId))
            .limit(1);
          return artistResults[0]?.name || 'Unknown Artist';
        }

        case 'album': {
          const albumResults = await this.drizzle.db
            .select({ name: albums.name })
            .from(albums)
            .where(eq(albums.id, entityId))
            .limit(1);
          return albumResults[0]?.name || 'Unknown Album';
        }

        case 'track': {
          const trackResults = await this.drizzle.db
            .select({ title: tracks.title })
            .from(tracks)
            .where(eq(tracks.id, entityId))
            .limit(1);
          return trackResults[0]?.title || 'Unknown Track';
        }

        default:
          return 'Unknown';
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch entity name for ${entityType} ${entityId}: ${(error as Error).message}`
      );
      return 'Unknown';
    }
  }

  /**
   * Enrich conflict with entity name
   * First tries to get the name from conflict metadata, then falls back to database query
   */
  async enrichConflictWithEntity(conflict: any): Promise<ConflictWithEntity> {
    let entityName = 'Unknown';

    try {
      // First, try to get name from metadata (faster, no DB query needed)
      const metadata = this.parseMetadata(conflict.metadata);

      if (metadata) {
        entityName = this.getNameFromMetadata(conflict.entityType, metadata);
      }

      // If not found in metadata, query the database
      if (entityName === 'Unknown') {
        entityName = await this.getEntityName(conflict.entityType, conflict.entityId);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch entity name for conflict ${conflict.id}: ${(error as Error).message}`
      );
    }

    return this.mapConflictWithEntity(conflict, { name: entityName });
  }

  /**
   * Enrich multiple conflicts with entity data
   */
  async enrichConflicts(conflicts: any[]): Promise<ConflictWithEntity[]> {
    return Promise.all(conflicts.map((c) => this.enrichConflictWithEntity(c)));
  }

  /**
   * Clean up orphaned conflicts (conflicts referencing deleted entities)
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
        conflict.entityId
      );

      if (!exists) {
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
          `Cleaned up orphaned conflict ${conflict.id} for deleted ${conflict.entityType} ${conflict.entityId}`
        );
      }
    }

    if (orphanedCount > 0) {
      this.logger.info(`Cleaned up ${orphanedCount} orphaned conflicts`);
    }

    return orphanedCount;
  }

  /**
   * Parse metadata from conflict
   */
  private parseMetadata(metadata: any): any | null {
    if (!metadata) return null;
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  }

  /**
   * Get entity name from metadata
   */
  private getNameFromMetadata(entityType: string, metadata: any): string {
    if (entityType === 'artist' && metadata.artistName) {
      return metadata.artistName;
    }
    if (entityType === 'album' && metadata.albumName) {
      return metadata.albumName;
    }
    if (entityType === 'track' && metadata.trackName) {
      return metadata.trackName;
    }
    return 'Unknown';
  }

  /**
   * Map database conflict to ConflictWithEntity
   */
  mapConflictWithEntity(conflict: any, entity?: { name: string }): ConflictWithEntity {
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
      metadata: this.parseMetadata(conflict.metadata),
      createdAt: conflict.createdAt,
      resolvedAt: conflict.resolvedAt,
      resolvedBy: conflict.resolvedBy,
      entity,
    };
  }
}
