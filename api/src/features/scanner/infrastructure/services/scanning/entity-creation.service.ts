import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums } from '@infrastructure/database/schema';
import { CoverArtService } from '@shared/services';
import { generateUuid, normalizeForSorting, generateAlbumPid } from '@shared/utils';

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
 * Implements atomic find-or-create pattern with PID-based identification
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
   * Uses PID (Persistent ID) for stable identification:
   * - MusicBrainz Album ID if available (most reliable)
   * - Otherwise, hash of artistId + normalized name + year
   *
   * Falls back to orderAlbumName + artistId for legacy albums without PID.
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

    // Generate PID for this album
    const pid = generateAlbumPid(metadata.mbzAlbumId, artistId, normalizedName, metadata.year);

    // Strategy 1: Search by PID (most reliable, handles metadata changes)
    let existingAlbum = await this.drizzle.db
      .select({
        id: albums.id,
        name: albums.name,
        artistId: albums.artistId,
        coverArtPath: albums.coverArtPath,
        year: albums.year,
        mbzAlbumId: albums.mbzAlbumId,
        pid: albums.pid,
      })
      .from(albums)
      .where(eq(albums.pid, pid))
      .limit(1);

    // Strategy 2: Fallback to orderAlbumName + artistId (for legacy or different PID)
    if (!existingAlbum[0]) {
      existingAlbum = await this.drizzle.db
        .select({
          id: albums.id,
          name: albums.name,
          artistId: albums.artistId,
          coverArtPath: albums.coverArtPath,
          year: albums.year,
          mbzAlbumId: albums.mbzAlbumId,
          pid: albums.pid,
        })
        .from(albums)
        .where(and(eq(albums.orderAlbumName, orderName), eq(albums.artistId, artistId)))
        .limit(1);
    }

    if (existingAlbum[0]) {
      let coverExtracted = false;
      const updates: any = {};

      this.logger.debug(
        `Found existing album "${existingAlbum[0].name}" (ID: ${existingAlbum[0].id}), ` +
        `coverArtPath: ${existingAlbum[0].coverArtPath === null ? 'NULL' : `"${existingAlbum[0].coverArtPath}"`}`
      );

      // Update MBID and PID if provided and album doesn't have one
      if (metadata.mbzAlbumId && !existingAlbum[0].mbzAlbumId) {
        updates.mbzAlbumId = metadata.mbzAlbumId;
        updates.mbzAlbumArtistId = metadata.mbzAlbumArtistId || null;
        // Regenerate PID with MusicBrainz ID (more stable)
        updates.pid = generateAlbumPid(metadata.mbzAlbumId, artistId, normalizedName, metadata.year);
        this.logger.debug(`Updated MBID for album "${existingAlbum[0].name}": ${metadata.mbzAlbumId}`);
      }

      // Set PID for legacy albums that don't have one
      if (!existingAlbum[0].pid) {
        updates.pid = pid;
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
        pid: pid,
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
