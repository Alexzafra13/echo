import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, tracks } from '@infrastructure/database/schema';
import { FileScannerService } from '../file-scanner.service';

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
