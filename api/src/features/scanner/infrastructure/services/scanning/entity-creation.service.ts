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

// Busca o crea artistas y álbumes (find-or-create), identificándolos por PID
@Injectable()
export class EntityCreationService {
  // Cache in-memory para evitar queries repetidas durante el scan.
  // En un álbum de 15 tracks, sin cache se harían 15-30 queries para el mismo álbum/artista.
  // Se limpia con clearCache() al finalizar el scan.
  private artistCache = new Map<string, ArtistResult>();
  private albumCache = new Map<string, AlbumResult>();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly coverArtService: CoverArtService,
    @InjectPinoLogger(EntityCreationService.name)
    private readonly logger: PinoLogger
  ) {}

  // Vacía la caché en memoria. Llamar al finalizar un scan.
  clearCache(): void {
    this.artistCache.clear();
    this.albumCache.clear();
  }

  // Usa el nombre normalizado (sin acentos) para no tratar
  // "Dani Fernández" y "Dani Fernandez" como artistas distintos
  async findOrCreateArtist(artistName: string, mbzArtistId?: string): Promise<ArtistResult> {
    const normalizedName = (artistName || 'Unknown Artist').trim();
    const orderName = normalizeForSorting(normalizedName);

    // Caché primero (clave = nombre normalizado)
    const cacheKey = orderName;
    const cached = this.artistCache.get(cacheKey);
    if (cached) return cached;

    const existingArtist = await this.drizzle.db
      .select({ id: artists.id, name: artists.name, mbzArtistId: artists.mbzArtistId })
      .from(artists)
      .where(eq(artists.orderArtistName, orderName))
      .limit(1);

    if (existingArtist[0]) {
      // Completa el MBID si llega y el artista aún no lo tiene
      if (mbzArtistId && !existingArtist[0].mbzArtistId) {
        await this.drizzle.db
          .update(artists)
          .set({ mbzArtistId, updatedAt: new Date() })
          .where(eq(artists.id, existingArtist[0].id));
        this.logger.debug(`Updated MBID for artist "${existingArtist[0].name}": ${mbzArtistId}`);
      }
      const result: ArtistResult = {
        id: existingArtist[0].id,
        name: existingArtist[0].name,
        created: false,
      };
      this.artistCache.set(cacheKey, result);
      return result;
    }

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

    const result: ArtistResult = { ...newArtist[0], created: true };
    this.artistCache.set(cacheKey, result);
    return result;
  }

  /**
   * Identifica el álbum por un PID estable: el MBID si existe, o un hash de
   * artistId + nombre + año. Para álbumes antiguos sin PID cae a nombre + artista.
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
    trackPath: string
  ): Promise<AlbumResult> {
    const normalizedName = (albumName || 'Unknown Album').trim();
    const orderName = normalizeForSorting(normalizedName);

    const pid = generateAlbumPid(metadata.mbzAlbumId, artistId, normalizedName, metadata.year);

    // Si el álbum está cacheado con cover, se devuelve directo;
    // si no tiene cover, se intenta extraer de este track antes de devolver.
    const cachedAlbum = this.albumCache.get(pid);
    if (cachedAlbum) {
      if (cachedAlbum.coverExtracted) return cachedAlbum;

      // Intentar extraer cover del track actual
      const coverPath = await this.coverArtService.extractAndCacheCover(cachedAlbum.id, trackPath);
      if (coverPath) {
        await this.drizzle.db
          .update(albums)
          .set({ coverArtPath: coverPath, updatedAt: new Date() })
          .where(eq(albums.id, cachedAlbum.id));
        cachedAlbum.coverExtracted = true;
        this.logger.info(`Extracted cover for cached album "${cachedAlbum.name}": ${coverPath}`);
      }
      return cachedAlbum;
    }

    // 1) Por PID (lo más fiable, aguanta cambios de metadatos)
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

    // 2) Fallback: por nombre + artista (álbumes antiguos o con otro PID)
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
      const updates: Partial<{
        mbzAlbumId: string | null;
        mbzAlbumArtistId: string | null;
        pid: string;
        coverArtPath: string;
        updatedAt: Date;
      }> = {};

      this.logger.debug(
        `Found existing album "${existingAlbum[0].name}" (ID: ${existingAlbum[0].id}), ` +
          `coverArtPath: ${existingAlbum[0].coverArtPath === null ? 'NULL' : `"${existingAlbum[0].coverArtPath}"`}`
      );

      // Completa MBID y PID si llegan y el álbum no los tiene
      if (metadata.mbzAlbumId && !existingAlbum[0].mbzAlbumId) {
        updates.mbzAlbumId = metadata.mbzAlbumId;
        updates.mbzAlbumArtistId = metadata.mbzAlbumArtistId || null;
        // Regenera el PID con el MBID (más estable)
        updates.pid = generateAlbumPid(
          metadata.mbzAlbumId,
          artistId,
          normalizedName,
          metadata.year
        );
        this.logger.debug(
          `Updated MBID for album "${existingAlbum[0].name}": ${metadata.mbzAlbumId}`
        );
      }

      // Pone PID a los álbumes antiguos que no tienen
      if (!existingAlbum[0].pid) {
        updates.pid = pid;
      }

      // Extrae la portada si falta
      if (!existingAlbum[0].coverArtPath) {
        this.logger.debug(
          `Attempting to extract cover for existing album "${existingAlbum[0].name}" from: ${trackPath}`
        );

        const coverPath = await this.coverArtService.extractAndCacheCover(
          existingAlbum[0].id,
          trackPath
        );

        this.logger.debug(
          `Cover extraction result for "${existingAlbum[0].name}": ${coverPath || 'NULL'}`
        );

        if (coverPath) {
          updates.coverArtPath = coverPath;
          coverExtracted = true;
          this.logger.info(
            `Extracted cover for existing album "${existingAlbum[0].name}": ${coverPath}`
          );
        } else {
          this.logger.warn(`No cover found for existing album "${existingAlbum[0].name}"`);
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await this.drizzle.db.update(albums).set(updates).where(eq(albums.id, existingAlbum[0].id));
      }

      const result: AlbumResult = {
        id: existingAlbum[0].id,
        name: existingAlbum[0].name,
        artistId: existingAlbum[0].artistId!,
        created: false,
        coverExtracted,
      };
      this.albumCache.set(pid, result);
      return result;
    }

    const albumId = generateUuid();

    const coverPath = await this.coverArtService.extractAndCacheCover(albumId, trackPath);

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

    const result: AlbumResult = {
      id: newAlbum[0].id,
      name: newAlbum[0].name,
      artistId: newAlbum[0].artistId!,
      created: true,
      coverExtracted: !!coverPath,
    };
    this.albumCache.set(pid, result);
    return result;
  }
}
