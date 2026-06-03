import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { sql, eq, isNotNull, lt } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, tracks } from '@infrastructure/database/schema';
import { FileScannerService } from '../file-scanner.service';
import { SettingsService } from '@infrastructure/settings';

/**
 * Política de purga de archivos desaparecidos:
 * - 'never': solo los marca, nunca borra (conserva ratings, playlists, etc.)
 * - 'always': borra en cuanto el archivo desaparece
 * - 'after_days:N': borra tras N días desaparecido
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
 * Limpia registros huérfanos de la biblioteca con el patrón "archivos desaparecidos"
 * (estilo Navidrome): marca en vez de borrar, conserva ratings/reproducciones/playlists
 * y purga según la política configurada.
 */
@Injectable()
export class LibraryCleanupService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly fileScanner: FileScannerService,
    private readonly settingsService: SettingsService,
    @InjectPinoLogger(LibraryCleanupService.name)
    private readonly logger: PinoLogger
  ) {}

  async getPurgeMode(): Promise<PurgeMode> {
    const mode = await this.settingsService.getString('library.purgeMissing', 'never');
    return mode as PurgeMode;
  }

  // Marca el archivo como desaparecido o lo borra, según la política de purga
  async handleMissingFile(filePath: string): Promise<TrackMissingResult> {
    const result: TrackMissingResult = {
      trackMarkedMissing: false,
      trackDeleted: false,
      albumDeleted: false,
      artistDeleted: false,
    };

    try {
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

      // Ya estaba marcado como desaparecido
      if (track[0].missingAt) {
        this.logger.debug(`Track already marked as missing: ${filePath}`);
        return result;
      }

      result.trackId = track[0].id;
      result.trackTitle = track[0].title;
      result.albumId = track[0].albumId ?? undefined;

      const purgeMode = await this.getPurgeMode();

      if (purgeMode === 'always') {
        return this.deleteTrackById(track[0].id, track[0].albumId);
      }

      // Para 'never' o 'after_days:N': solo se marca
      await this.drizzle.db
        .update(tracks)
        .set({ missingAt: new Date(), updatedAt: new Date() })
        .where(eq(tracks.id, track[0].id));

      result.trackMarkedMissing = true;
      this.logger.info(`Track marcado como desaparecido: "${track[0].title}" (${filePath})`);

      return result;
    } catch (error) {
      this.logger.error(`Error manejando archivo desaparecido ${filePath}:`, error);
      return result;
    }
  }

  // El archivo reapareció: deja de estar marcado como desaparecido
  async unmarkMissing(filePath: string): Promise<boolean> {
    try {
      const updated = await this.drizzle.db
        .update(tracks)
        .set({ missingAt: null, updatedAt: new Date() })
        .where(eq(tracks.path, filePath))
        .returning({ id: tracks.id });

      if (updated.length > 0) {
        this.logger.info(`Track recuperado: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error desmarcando track como desaparecido ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Elimina un álbum si no tiene tracks, y su artista si no tiene álbumes.
   * Usado por TrackProcessingService cuando un track cambia de álbum.
   */
  async cleanupOrphanedAlbum(albumId: string): Promise<void> {
    try {
      const remaining = await this.drizzle.db
        .select({ id: tracks.id })
        .from(tracks)
        .where(eq(tracks.albumId, albumId))
        .limit(1);

      if (remaining.length > 0) return;

      const album = await this.drizzle.db
        .select({ id: albums.id, name: albums.name, artistId: albums.artistId })
        .from(albums)
        .where(eq(albums.id, albumId))
        .limit(1);

      if (!album[0]) return;

      const artistId = album[0].artistId;
      await this.drizzle.db.delete(albums).where(eq(albums.id, albumId));
      this.logger.info(`Album huerfano eliminado: "${album[0].name}"`);

      if (artistId) {
        const remainingAlbums = await this.drizzle.db
          .select({ id: albums.id })
          .from(albums)
          .where(eq(albums.artistId, artistId))
          .limit(1);

        if (remainingAlbums.length === 0) {
          const artist = await this.drizzle.db
            .select({ name: artists.name })
            .from(artists)
            .where(eq(artists.id, artistId))
            .limit(1);

          await this.drizzle.db.delete(artists).where(eq(artists.id, artistId));
          this.logger.info(`Artista huerfano eliminado: "${artist[0]?.name}"`);
        }
      }
    } catch (error) {
      this.logger.error(`Error limpiando album huerfano ${albumId}:`, error);
    }
  }

  // Borra el track y, si se quedan vacíos, también su álbum y su artista
  private async deleteTrackById(
    trackId: string,
    albumId: string | null
  ): Promise<TrackMissingResult> {
    const result: TrackMissingResult = {
      trackMarkedMissing: false,
      trackDeleted: false,
      albumDeleted: false,
      artistDeleted: false,
    };

    // Guarda los datos del track antes de borrarlo
    const track = await this.drizzle.db
      .select({ title: tracks.title })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    result.trackId = trackId;
    result.trackTitle = track[0]?.title;
    result.albumId = albumId ?? undefined;

    await this.drizzle.db.delete(tracks).where(eq(tracks.id, trackId));
    result.trackDeleted = true;
    this.logger.info(` Track eliminado: "${track[0]?.title}"`);

    // ¿El álbum se ha quedado sin tracks?
    if (albumId) {
      const albumTracks = await this.drizzle.db
        .select({ id: tracks.id })
        .from(tracks)
        .where(eq(tracks.albumId, albumId))
        .limit(1);

      if (albumTracks.length === 0) {
        const album = await this.drizzle.db
          .select({ artistId: albums.artistId })
          .from(albums)
          .where(eq(albums.id, albumId))
          .limit(1);

        result.artistId = album[0]?.artistId ?? undefined;

        await this.drizzle.db.delete(albums).where(eq(albums.id, albumId));
        result.albumDeleted = true;
        this.logger.info(` Álbum huérfano eliminado (ID: ${albumId})`);

        // ¿El artista se ha quedado sin álbumes?
        if (result.artistId) {
          const artistAlbums = await this.drizzle.db
            .select({ id: albums.id })
            .from(albums)
            .where(eq(albums.artistId, result.artistId))
            .limit(1);

          if (artistAlbums.length === 0) {
            await this.drizzle.db.delete(artists).where(eq(artists.id, result.artistId));
            result.artistDeleted = true;
            this.logger.info(` Artista huérfano eliminado (ID: ${result.artistId})`);
          }
        }
      }
    }

    return result;
  }

  // Borra los tracks que llevan desaparecidos más del periodo configurado
  async purgeOldMissingTracks(): Promise<number> {
    const purgeMode = await this.getPurgeMode();

    if (purgeMode === 'never') {
      return 0;
    }

    if (purgeMode === 'always') {
      return this.deleteAllMissingTracks();
    }

    // Formato 'after_days:N'
    const match = purgeMode.match(/^after_days:(\d+)$/);
    if (!match) {
      this.logger.warn(`Invalid purge mode: ${purgeMode}`);
      return 0;
    }

    const days = parseInt(match[1], 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Tracks desaparecidos antes de la fecha de corte
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
      this.logger.info(
        ` Purgados ${deletedCount} tracks desaparecidos hace más de ${days} días`
      );
      await this.deleteOrphanedAlbums();
      await this.deleteOrphanedArtists();
    }

    return deletedCount;
  }

  private async deleteAllMissingTracks(): Promise<number> {
    const missingTracks = await this.drizzle.db
      .select({ id: tracks.id })
      .from(tracks)
      .where(isNotNull(tracks.missingAt));

    if (missingTracks.length > 0) {
      const trackIds = missingTracks.map((t) => t.id);
      await this.drizzle.db.delete(tracks).where(
        sql`${tracks.id} IN (${sql.join(
          trackIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

      this.logger.info(` Eliminados ${missingTracks.length} tracks desaparecidos`);
      await this.deleteOrphanedAlbums();
      await this.deleteOrphanedArtists();
    }

    return missingTracks.length;
  }

  // Lista de tracks desaparecidos (para el panel de admin)
  async getMissingTracks(): Promise<
    Array<{
      id: string;
      title: string;
      path: string;
      albumName: string | null;
      artistName: string | null;
      missingAt: Date | null;
    }>
  > {
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

  async getMissingTracksCount(): Promise<number> {
    const result = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(tracks)
      .where(isNotNull(tracks.missingAt));
    return Number(result[0]?.count ?? 0);
  }

  // Borrado manual de un desaparecido concreto desde el panel de admin
  async deleteMissingTrackById(trackId: string): Promise<TrackMissingResult> {
    const track = await this.drizzle.db
      .select({ id: tracks.id, albumId: tracks.albumId, missingAt: tracks.missingAt })
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .limit(1);

    if (!track[0]) {
      this.logger.warn(`Track not found: ${trackId}`);
      return {
        trackMarkedMissing: false,
        trackDeleted: false,
        albumDeleted: false,
        artistDeleted: false,
      };
    }

    // Solo se pueden borrar tracks marcados como desaparecidos
    if (!track[0].missingAt) {
      this.logger.warn(`Track ${trackId} is not marked as missing, cannot delete`);
      return {
        trackMarkedMissing: false,
        trackDeleted: false,
        albumDeleted: false,
        artistDeleted: false,
      };
    }

    return this.deleteTrackById(track[0].id, track[0].albumId);
  }

  // Borra de la BD los tracks que ya no existen en disco y limpia álbumes/artistas huérfanos
  async pruneDeletedTracks(existingFiles: string[]): Promise<number> {
    try {
      const existingFilesSet = new Set(existingFiles);

      // Procesar en chunks para no cargar todos los tracks en memoria.
      // Con 100k tracks, cargar todo de golpe causa picos de RAM innecesarios.
      const CHUNK_SIZE = 5000;
      let offset = 0;
      const tracksToDelete: string[] = [];

      let hasMore = true;
      while (hasMore) {
        const chunk = await this.drizzle.db
          .select({ id: tracks.id, path: tracks.path })
          .from(tracks)
          .limit(CHUNK_SIZE)
          .offset(offset);

        if (chunk.length === 0) {
          hasMore = false;
          continue;
        }

        for (const track of chunk) {
          if (!existingFilesSet.has(track.path)) {
            tracksToDelete.push(track.id);
          }
        }

        offset += CHUNK_SIZE;
      }

      if (tracksToDelete.length > 0) {
        const BATCH_SIZE = 500;
        for (let i = 0; i < tracksToDelete.length; i += BATCH_SIZE) {
          const batch = tracksToDelete.slice(i, i + BATCH_SIZE);
          await this.drizzle.db.delete(tracks).where(
            sql`${tracks.id} IN (${sql.join(
              batch.map((id) => sql`${id}`),
              sql`, `
            )})`
          );
        }
        this.logger.info(`Eliminados ${tracksToDelete.length} tracks obsoletos`);
      }

      await this.deleteOrphanedAlbums();
      await this.deleteOrphanedArtists();

      return tracksToDelete.length;
    } catch (error) {
      this.logger.error('Error eliminando registros obsoletos:', error);
      return 0;
    }
  }

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
      await this.drizzle.db.delete(albums).where(
        sql`${albums.id} IN (${sql.join(
          albumIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
      this.logger.info(` Eliminados ${orphanedAlbums.length} álbumes huérfanos`);
    }

    return orphanedAlbums.length;
  }

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
      await this.drizzle.db.delete(artists).where(
        sql`${artists.id} IN (${sql.join(
          artistIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
      this.logger.info(` Eliminados ${orphanedArtists.length} artistas huérfanos`);
    }

    return orphanedArtists.length;
  }
}
