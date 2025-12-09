import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums } from '@infrastructure/database/schema';
import { CoverArtService } from '@shared/services';
import { generateUuid, normalizeForSorting } from '@shared/utils';

export interface ArtistResult {
  id: string;
  name: string;
  created: boolean;
}

export interface AlbumResult {
  id: string;
  name: string;
  artistId: string;
  created: boolean;
  coverExtracted: boolean;
}

/**
 * Service for creating and finding artists and albums
 * Implements atomic find-or-create pattern following Navidrome's approach
 */
@Injectable()
export class EntityCreationService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly coverArtService: CoverArtService,
    @InjectPinoLogger(EntityCreationService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Find or create an artist atomically
   *
   * Uses normalized name (without accents) to prevent duplicates like
   * "Dani Fernández" and "Dani Fernandez" being treated as different artists.
   */
  async findOrCreateArtist(
    artistName: string,
    mbzArtistId?: string,
  ): Promise<ArtistResult> {
    const normalizedName = (artistName || 'Unknown Artist').trim();
    const orderName = normalizeForSorting(normalizedName);

    // Search by normalized name (without accents)
    const existingArtist = await this.drizzle.db
      .select({ id: artists.id, name: artists.name, mbzArtistId: artists.mbzArtistId })
      .from(artists)
      .where(eq(artists.orderArtistName, orderName))
      .limit(1);

    if (existingArtist[0]) {
      // Update MBID if provided and artist doesn't have one
      if (mbzArtistId && !existingArtist[0].mbzArtistId) {
        await this.drizzle.db
          .update(artists)
          .set({ mbzArtistId, updatedAt: new Date() })
          .where(eq(artists.id, existingArtist[0].id));
        this.logger.debug(`Updated MBID for artist "${existingArtist[0].name}": ${mbzArtistId}`);
      }
      return { id: existingArtist[0].id, name: existingArtist[0].name, created: false };
    }

    // Create new artist
    const newArtist = await this.drizzle.db
      .insert(artists)
      .values({
        name: normalizedName,
        orderArtistName: orderName,
        mbzArtistId: mbzArtistId || null,
        albumCount: 0,
        songCount: 0,
        size: Number(0),
      })
      .returning({ id: artists.id, name: artists.name });

    return { ...newArtist[0], created: true };
  }

  /**
   * Find or create an album atomically
   *
   * Searches by normalized name AND artist to:
   * - Handle Unicode variations (different hyphens, quotes, etc.)
   * - Prevent different artists' albums with same name from merging (e.g., "Greatest Hits")
   */
  async findOrCreateAlbum(
    albumName: string,
    artistId: string,
    metadata: {
      year?: number;
      compilation?: boolean;
      mbzAlbumId?: string;
      mbzAlbumArtistId?: string;
    },
    trackPath: string,
  ): Promise<AlbumResult> {
    const normalizedName = (albumName || 'Unknown Album').trim();
    const orderName = normalizeForSorting(normalizedName);

    // Search by normalized name AND artist to prevent cross-artist merging
    const existingAlbum = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        coverArtPath: albums.coverArtPath,
        year: albums.year,
        mbzAlbumId: albums.mbzAlbumId,
      })
      .from(albums)
      .where(and(eq(albums.orderAlbumName, orderName), eq(albums.artistId, artistId)))
      .limit(1);

    if (existingAlbum[0]) {
      let coverExtracted = false;
      const updates: any = {};

      this.logger.debug(
        `Found existing album "${existingAlbum[0].name}" (ID: ${existingAlbum[0].id}), ` +
        `coverArtPath: ${existingAlbum[0].coverArtPath === null ? 'NULL' : `"${existingAlbum[0].coverArtPath}"`}`
      );

      // Update MBID if provided and album doesn't have one
      if (metadata.mbzAlbumId && !existingAlbum[0].mbzAlbumId) {
        updates.mbzAlbumId = metadata.mbzAlbumId;
        updates.mbzAlbumArtistId = metadata.mbzAlbumArtistId || null;
        this.logger.debug(`Updated MBID for album "${existingAlbum[0].name}": ${metadata.mbzAlbumId}`);
      }

      // Extract cover if missing
      if (!existingAlbum[0].coverArtPath) {
        this.logger.debug(`Attempting to extract cover for existing album "${existingAlbum[0].name}" from: ${trackPath}`);

        const coverPath = await this.coverArtService.extractAndCacheCover(
          existingAlbum[0].id,
          trackPath,
        );

        this.logger.debug(`Cover extraction result for "${existingAlbum[0].name}": ${coverPath || 'NULL'}`);

        if (coverPath) {
          updates.coverArtPath = coverPath;
          coverExtracted = true;
          this.logger.info(`✅ Extracted cover for existing album "${existingAlbum[0].name}": ${coverPath}`);
        } else {
          this.logger.warn(`❌ No cover found for existing album "${existingAlbum[0].name}"`);
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await this.drizzle.db
          .update(albums)
          .set(updates)
          .where(eq(albums.id, existingAlbum[0].id));
      }

      return {
        id: existingAlbum[0].id,
        name: existingAlbum[0].name,
        artistId: existingAlbum[0].artistId!,
        created: false,
        coverExtracted,
      };
    }

    // Create new album
    const albumId = generateUuid();

    const coverPath = await this.coverArtService.extractAndCacheCover(
      albumId,
      trackPath,
    );

    const newAlbum = await this.drizzle.db
      .insert(albums)
      .values({
        id: albumId,
        name: normalizedName,
        artistId: artistId,
        albumArtistId: artistId,
        year: metadata.year || null,
        compilation: metadata.compilation || false,
        mbzAlbumId: metadata.mbzAlbumId || null,
        mbzAlbumArtistId: metadata.mbzAlbumArtistId || null,
        coverArtPath: coverPath || null,
        orderAlbumName: normalizeForSorting(normalizedName),
        songCount: 0,
        duration: 0,
        size: Number(0),
      })
      .returning({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
      });

    return {
      id: newAlbum[0].id,
      name: newAlbum[0].name,
      artistId: newAlbum[0].artistId!,
      created: true,
      coverExtracted: !!coverPath,
    };
  }
}
