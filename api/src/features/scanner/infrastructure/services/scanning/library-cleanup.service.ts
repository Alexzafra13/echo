import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { sql, eq } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, tracks } from '@infrastructure/database/schema';
import { FileScannerService } from '../file-scanner.service';

export interface TrackDeletionResult {
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
 * Removes tracks, albums, and artists that no longer exist in the filesystem
 */
@Injectable()
export class LibraryCleanupService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly fileScanner: FileScannerService,
    @InjectPinoLogger(LibraryCleanupService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Delete a single track by its file path
   * Also cleans up orphaned album and artist if needed
   *
   * @param filePath - Path to the deleted file
   * @returns Information about what was deleted
   */
  async deleteTrackByPath(filePath: string): Promise<TrackDeletionResult> {
    const result: TrackDeletionResult = {
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
        })
        .from(tracks)
        .where(eq(tracks.path, filePath))
        .limit(1);

      if (!track[0]) {
        this.logger.debug(`Track not found in DB for path: ${filePath}`);
        return result;
      }

      result.trackId = track[0].id;
      result.trackTitle = track[0].title;
      result.albumId = track[0].albumId ?? undefined;

      // Delete the track
      await this.drizzle.db.delete(tracks).where(eq(tracks.id, track[0].id));
      result.trackDeleted = true;
      this.logger.info(`🗑️  Track eliminado: "${track[0].title}" (${filePath})`);

      // Check if album is now orphaned
      if (track[0].albumId) {
        const albumTracks = await this.drizzle.db
          .select({ id: tracks.id })
          .from(tracks)
          .where(eq(tracks.albumId, track[0].albumId))
          .limit(1);

        if (albumTracks.length === 0) {
          // Get artist ID before deleting album
          const album = await this.drizzle.db
            .select({ artistId: albums.artistId })
            .from(albums)
            .where(eq(albums.id, track[0].albumId))
            .limit(1);

          result.artistId = album[0]?.artistId ?? undefined;

          // Delete orphaned album
          await this.drizzle.db.delete(albums).where(eq(albums.id, track[0].albumId));
          result.albumDeleted = true;
          this.logger.info(`🗑️  Álbum huérfano eliminado (ID: ${track[0].albumId})`);

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
    } catch (error) {
      this.logger.error(`Error eliminando track por path ${filePath}:`, error);
      return result;
    }
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
