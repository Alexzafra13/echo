import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { eq } from 'drizzle-orm';
import { artists, albums, tracks } from '@infrastructure/database/schema';
import { ImageDownloadService } from '../image-download.service';
import { StorageService } from '../storage.service';
import * as path from 'path';
import type { EntityType } from './conflict-enrichment.service';

export interface ConflictData {
  entityId: string;
  entityType: EntityType;
  field: string;
  suggestedValue: string;
  source: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service for applying conflict resolution changes to entities
 * Handles artist, album, and track metadata updates
 */
@Injectable()
export class ConflictChangeApplierService {
  constructor(
    @InjectPinoLogger(ConflictChangeApplierService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly imageDownload: ImageDownloadService,
    private readonly storage: StorageService
  ) {}

  /**
   * Apply a conflict change to the appropriate entity
   */
  async applyChange(
    conflict: ConflictData
  ): Promise<
    typeof artists.$inferSelect | typeof albums.$inferSelect | typeof tracks.$inferSelect | null
  > {
    switch (conflict.entityType) {
      case 'artist':
        return this.applyArtistChange(conflict);
      case 'album':
        return this.applyAlbumChange(conflict);
      case 'track':
        return this.applyTrackChange(conflict);
      default:
        throw new Error(`Unknown entity type: ${conflict.entityType}`);
    }
  }

  /**
   * Apply artist metadata change
   */
  private async applyArtistChange(
    conflict: ConflictData
  ): Promise<typeof artists.$inferSelect | null> {
    const updateData: Partial<typeof artists.$inferInsert> = {};

    switch (conflict.field) {
      case 'biography':
        updateData.biography = conflict.suggestedValue;
        updateData.biographySource = conflict.source;
        break;
      case 'images':
        this.applyArtistImages(updateData, conflict.metadata);
        break;
      case 'artistName':
        // For MBID conflicts, apply the MBID from metadata
        if (conflict.metadata?.suggestedMbid) {
          updateData.mbzArtistId = conflict.metadata.suggestedMbid as string;
          updateData.mbidSearchedAt = new Date();
          this.logger.info(
            `Applying MBID ${conflict.metadata.suggestedMbid} for artist ${conflict.entityId}`
          );
        }
        break;
    }

    if (Object.keys(updateData).length === 0) {
      this.logger.warn(`No update data for artist conflict: ${conflict.field}`);
      return null;
    }

    updateData.updatedAt = new Date();

    const updatedResults = await this.drizzle.db
      .update(artists)
      .set(updateData)
      .where(eq(artists.id, conflict.entityId))
      .returning();

    this.logger.info(`Applied ${conflict.field} change to artist ${conflict.entityId}`);
    return updatedResults[0];
  }

  /**
   * Apply artist images from metadata
   */
  private applyArtistImages(
    updateData: Partial<typeof artists.$inferInsert>,
    metadata: Record<string, unknown> | undefined
  ): void {
    const images = typeof metadata === 'string' ? JSON.parse(metadata) : metadata || {};

    if (images.smallImageUrl) updateData.profileImagePath = images.smallImageUrl as string;
    if (images.mediumImageUrl) updateData.profileImagePath = images.mediumImageUrl as string;
    if (images.largeImageUrl) updateData.profileImagePath = images.largeImageUrl as string;
    if (images.backgroundImageUrl)
      updateData.backgroundImagePath = images.backgroundImageUrl as string;
    if (images.bannerImageUrl) updateData.bannerImagePath = images.bannerImageUrl as string;
    if (images.logoImageUrl) updateData.logoImagePath = images.logoImageUrl as string;
  }

  /**
   * Apply album metadata change
   */
  private async applyAlbumChange(
    conflict: ConflictData
  ): Promise<typeof albums.$inferSelect | null> {
    const updateData: Partial<typeof albums.$inferInsert> = {};

    switch (conflict.field) {
      case 'externalCover':
        await this.downloadAndApplyAlbumCover(conflict, updateData);
        break;
      case 'year':
        updateData.year = parseInt(conflict.suggestedValue, 10);
        break;
    }

    if (Object.keys(updateData).length === 0) {
      this.logger.warn(`No update data for album conflict: ${conflict.field}`);
      return null;
    }

    updateData.updatedAt = new Date();

    const updatedResults = await this.drizzle.db
      .update(albums)
      .set(updateData)
      .where(eq(albums.id, conflict.entityId))
      .returning();

    this.logger.info(`Applied ${conflict.field} change to album ${conflict.entityId}`);
    return updatedResults[0];
  }

  /**
   * Download and apply album cover
   */
  private async downloadAndApplyAlbumCover(
    conflict: ConflictData,
    updateData: Partial<typeof albums.$inferInsert>
  ): Promise<void> {
    const coverUrl = conflict.suggestedValue;
    this.logger.info(
      `Downloading cover for album ${conflict.entityId} from ${conflict.source}: ${coverUrl}`
    );

    try {
      const metadataPath = await this.storage.getAlbumMetadataPath(conflict.entityId);
      const coverPath = path.join(metadataPath, 'cover.jpg');

      await this.imageDownload.downloadAndSave(coverUrl, coverPath);

      updateData.externalCoverPath = coverPath;
      updateData.externalCoverSource = conflict.source;
      updateData.externalInfoUpdatedAt = new Date();

      this.logger.info(
        `Successfully downloaded cover for album ${conflict.entityId}: ${coverPath}`
      );
    } catch (error) {
      this.logger.error(
        `Error downloading cover for album ${conflict.entityId}: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Apply track metadata change
   */
  private async applyTrackChange(
    conflict: ConflictData
  ): Promise<typeof tracks.$inferSelect | null> {
    const updateData: Partial<typeof tracks.$inferInsert> = {};

    switch (conflict.field) {
      case 'year':
        updateData.year = parseInt(conflict.suggestedValue, 10);
        break;
    }

    if (Object.keys(updateData).length === 0) {
      this.logger.warn(`No update data for track conflict: ${conflict.field}`);
      return null;
    }

    updateData.updatedAt = new Date();

    const updatedResults = await this.drizzle.db
      .update(tracks)
      .set(updateData)
      .where(eq(tracks.id, conflict.entityId))
      .returning();

    this.logger.info(`Applied ${conflict.field} change to track ${conflict.entityId}`);
    return updatedResults[0];
  }
}
