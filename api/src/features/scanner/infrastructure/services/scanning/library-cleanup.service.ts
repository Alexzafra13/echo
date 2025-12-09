import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { sql, eq, isNull, isNotNull, lt } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, tracks } from '@infrastructure/database/schema';
import { FileScannerService } from '../file-scanner.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';

/**
 * Purge mode for missing files:
 * - 'never': Only mark as missing, never delete (preserves ratings, playlists, etc.)
 * - 'always': Delete immediately when file disappears
 * - 'after_days:N': Delete after N days of being missing
 */
export type PurgeMode = 'never' | 'always' | `after_days:${number}`;

export interface TrackMissingResult {
  trackMarkedMissing: boolean;
  trackDeleted: boolean;
  trackId?: string;
  trackTitle?: string;
  albumId?: string;
  albumDeleted: boolean;
  artistId?: string;
  artistDeleted: boolean;
}

/**
 * Service for cleaning up orphaned library records
 * Supports "missing files" pattern like Navidrome:
 * - Mark files as missing instead of deleting immediately
 * - Preserve ratings, play counts, playlist references
 * - Configurable purge policy (never, always, after N days)
 */
@Injectable()
export class LibraryCleanupService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly fileScanner: FileScannerService,
    private readonly settingsService: SettingsService,
    @InjectPinoLogger(LibraryCleanupService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Get the current purge mode from settings
   */
  async getPurgeMode(): Promise<PurgeMode> {
    const mode = await this.settingsService.getString('library.purgeMissing', 'never');
    return mode as PurgeMode;
  }

  /**
   * Handle a missing file - either mark as missing or delete based on purge mode
   *
   * @param filePath - Path to the missing file
   * @returns Information about what action was taken
   */
  async handleMissingFile(filePath: string): Promise<TrackMissingResult> {
    const result: TrackMissingResult = {
      trackMarkedMissing: false,
      trackDeleted: false,
      albumDeleted: false,
      artistDeleted: false,
    };

    try {
      // Find the track by path
      const track = await this.drizzle.db
        .select({
          id: tracks.id,
          title: tracks.title,
          albumId: tracks.albumId,
          missingAt: tracks.missingAt,
        })
        .from(tracks)
        .where(eq(tracks.path, filePath))
        .limit(1);

      if (!track[0]) {
        this.logger.debug(`Track not found in DB for path: ${filePath}`);
        return result;
      }

      // Already marked as missing
      if (track[0].missingAt) {
        this.logger.debug(`Track already marked as missing: ${filePath}`);
        return result;
      }

      result.trackId = track[0].id;
      result.trackTitle = track[0].title;
      result.albumId = track[0].albumId ?? undefined;

      const purgeMode = await this.getPurgeMode();

      if (purgeMode === 'always') {
        // Delete immediately
        return this.deleteTrackById(track[0].id, track[0].albumId);
      }

      // Mark as missing (for 'never' or 'after_days:N')
      await this.drizzle.db
        .update(tracks)
        .set({ missingAt: new Date(), updatedAt: new Date() })
        .where(eq(tracks.id, track[0].id));

      result.trackMarkedMissing = true;
      this.logger.info(`👻 Track marcado como desaparecido: "${track[0].title}" (${filePath})`);

      return result;
    } catch (error) {
      this.logger.error(`Error manejando archivo desaparecido ${filePath}:`, error);
      return result;
    }
  }

  /**
   * Mark a track as no longer missing (file reappeared)
   */
  async unmarkMissing(filePath: string): Promise<boolean> {
    try {
      const updated = await this.drizzle.db
        .update(tracks)
        .set({ missingAt: null, updatedAt: new Date() })
        .where(eq(tracks.path, filePath))
        .returning({ id: tracks.id });

      if (updated.length > 0) {
        this.logger.info(`✅ Track recuperado: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error desmarcando track como desaparecido ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Delete a track by ID and cleanup orphans
   */
  private async deleteTrackById(trackId: string, albumId: string | null): Promise<TrackMissingResult> {
    const result: TrackMissingResult = {
      trackMarkedMissing: false,
      trackDeleted: false,
      albumDeleted: false,
      artistDeleted: false,
    };

    // Get track info before deleting
    const track = await this.drizzle.db
      .select({ title: tracks.title })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    result.trackId = trackId;
    result.trackTitle = track[0]?.title;
    result.albumId = albumId ?? undefined;

    // Delete the track
    await this.drizzle.db.delete(tracks).where(eq(tracks.id, trackId));
    result.trackDeleted = true;
    this.logger.info(`🗑️  Track eliminado: "${track[0]?.title}"`);

    // Check if album is now orphaned
    if (albumId) {
      const albumTracks = await this.drizzle.db
        .select({ id: tracks.id })
        .from(tracks)
        .where(eq(tracks.albumId, albumId))
        .limit(1);

      if (albumTracks.length === 0) {
        // Get artist ID before deleting album
        const album = await this.drizzle.db
          .select({ artistId: albums.artistId })
          .from(albums)
          .where(eq(albums.id, albumId))
          .limit(1);

        result.artistId = album[0]?.artistId ?? undefined;

        // Delete orphaned album
        await this.drizzle.db.delete(albums).where(eq(albums.id, albumId));
        result.albumDeleted = true;
        this.logger.info(`🗑️  Álbum huérfano eliminado (ID: ${albumId})`);

        // Check if artist is now orphaned
        if (result.artistId) {
          const artistAlbums = await this.drizzle.db
            .select({ id: albums.id })
            .from(albums)
            .where(eq(albums.artistId, result.artistId))
            .limit(1);

          if (artistAlbums.length === 0) {
            await this.drizzle.db.delete(artists).where(eq(artists.id, result.artistId));
            result.artistDeleted = true;
            this.logger.info(`🗑️  Artista huérfano eliminado (ID: ${result.artistId})`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Purge tracks that have been missing for longer than the configured period
   * Called periodically or during full scan
   */
  async purgeOldMissingTracks(): Promise<number> {
    const purgeMode = await this.getPurgeMode();

    if (purgeMode === 'never') {
      return 0;
    }

    if (purgeMode === 'always') {
      // All missing tracks should be deleted
      return this.deleteAllMissingTracks();
    }

    // Parse 'after_days:N' format
    const match = purgeMode.match(/^after_days:(\d+)$/);
    if (!match) {
      this.logger.warn(`Invalid purge mode: ${purgeMode}`);
      return 0;
    }

    const days = parseInt(match[1], 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Find tracks missing for longer than cutoff
    const oldMissingTracks = await this.drizzle.db
      .select({ id: tracks.id, albumId: tracks.albumId })
      .from(tracks)
      .where(lt(tracks.missingAt, cutoffDate));

    let deletedCount = 0;
    for (const track of oldMissingTracks) {
      await this.deleteTrackById(track.id, track.albumId);
      deletedCount++;
    }

    if (deletedCount > 0) {
      this.logger.info(`🗑️  Purgados ${deletedCount} tracks desaparecidos hace más de ${days} días`);
      await this.deleteOrphanedAlbums();
      await this.deleteOrphanedArtists();
    }

    return deletedCount;
  }

  /**
   * Delete all tracks marked as missing
   */
  private async deleteAllMissingTracks(): Promise<number> {
    const missingTracks = await this.drizzle.db
      .select({ id: tracks.id })
      .from(tracks)
      .where(isNotNull(tracks.missingAt));

    if (missingTracks.length > 0) {
      const trackIds = missingTracks.map((t) => t.id);
      await this.drizzle.db
        .delete(tracks)
        .where(sql`${tracks.id} IN (${sql.join(trackIds.map((id) => sql`${id}`), sql`, `)})`);

      this.logger.info(`🗑️  Eliminados ${missingTracks.length} tracks desaparecidos`);
      await this.deleteOrphanedAlbums();
      await this.deleteOrphanedArtists();
    }

    return missingTracks.length;
  }

  /**
   * Get list of all missing tracks (for admin page)
   */
  async getMissingTracks(): Promise<Array<{
    id: string;
    title: string;
    path: string;
    albumName: string | null;
    artistName: string | null;
    missingAt: Date | null;
  }>> {
    return this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        path: tracks.path,
        albumName: tracks.albumName,
        artistName: tracks.artistName,
        missingAt: tracks.missingAt,
      })
      .from(tracks)
      .where(isNotNull(tracks.missingAt))
      .orderBy(tracks.missingAt);
  }

  /**
   * Get count of missing tracks
   */
  async getMissingTracksCount(): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(tracks)
      .where(isNotNull(tracks.missingAt));
    return Number(result[0]?.count ?? 0);
  }

  /**
   * Remove tracks from DB that no longer exist in the filesystem
   * Also cleans up orphaned albums and artists
   *
   * @param existingFiles - List of files that currently exist
   * @returns Number of tracks deleted
   */
  async pruneDeletedTracks(existingFiles: string[]): Promise<number> {
    try {
      // Get all tracks from DB
      const allTracks = await this.drizzle.db
        .select({ id: tracks.id, path: tracks.path })
        .from(tracks);

      const existingFilesSet = new Set(existingFiles);
      const tracksToDelete: string[] = [];

      // Find tracks that no longer exist
      for (const track of allTracks) {
        if (!existingFilesSet.has(track.path)) {
          const exists = await this.fileScanner.pathExists(track.path);
          if (!exists) {
            tracksToDelete.push(track.id);
          }
        }
      }

      // Delete tracks
      if (tracksToDelete.length > 0) {
        await this.drizzle.db
          .delete(tracks)
          .where(sql`${tracks.id} IN (${sql.join(tracksToDelete.map((id) => sql`${id}`), sql`, `)})`);
        this.logger.info(`🗑️  Eliminados ${tracksToDelete.length} tracks obsoletos`);
      }

      // Delete orphaned albums (without tracks)
      await this.deleteOrphanedAlbums();

      // Delete orphaned artists (without albums)
      await this.deleteOrphanedArtists();

      return tracksToDelete.length;
    } catch (error) {
      this.logger.error('Error eliminando registros obsoletos:', error);
      return 0;
    }
  }

  /**
   * Delete albums that have no tracks
   */
  private async deleteOrphanedAlbums(): Promise<number> {
    const orphanedAlbumsResult = await this.drizzle.db.execute(sql`
      SELECT id FROM albums a
      WHERE NOT EXISTS (
        SELECT 1 FROM tracks t WHERE t.album_id = a.id
      )
    `);
    const orphanedAlbums = (orphanedAlbumsResult.rows as { id: string }[]) || [];

    if (orphanedAlbums.length > 0) {
      const albumIds = orphanedAlbums.map((a) => a.id);
      await this.drizzle.db
        .delete(albums)
        .where(sql`${albums.id} IN (${sql.join(albumIds.map((id) => sql`${id}`), sql`, `)})`);
      this.logger.info(`🗑️  Eliminados ${orphanedAlbums.length} álbumes huérfanos`);
    }

    return orphanedAlbums.length;
  }

  /**
   * Delete artists that have no albums
   */
  private async deleteOrphanedArtists(): Promise<number> {
    const orphanedArtistsResult = await this.drizzle.db.execute(sql`
      SELECT id FROM artists ar
      WHERE NOT EXISTS (
        SELECT 1 FROM albums al WHERE al.artist_id = ar.id
      )
    `);
    const orphanedArtists = (orphanedArtistsResult.rows as { id: string }[]) || [];

    if (orphanedArtists.length > 0) {
      const artistIds = orphanedArtists.map((a) => a.id);
      await this.drizzle.db
        .delete(artists)
        .where(sql`${artists.id} IN (${sql.join(artistIds.map((id) => sql`${id}`), sql`, `)})`);
      this.logger.info(`🗑️  Eliminados ${orphanedArtists.length} artistas huérfanos`);
    }

    return orphanedArtists.length;
  }
}
