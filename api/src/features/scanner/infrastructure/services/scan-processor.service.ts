import { Injectable, Inject, OnModuleInit, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq, and, or, isNull, sql, count, sum, gte, notInArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { artists, albums, tracks, genres, trackGenres } from '@infrastructure/database/schema';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../domain/ports/scanner-repository.port';
import { FileScannerService } from './file-scanner.service';
import { MetadataExtractorService } from './metadata-extractor.service';
import { LufsAnalysisQueueService } from './lufs-analysis-queue.service';
import { CoverArtService } from '@shared/services';
import { generateUuid, normalizeForSorting } from '@shared/utils';
import { ScannerGateway } from '../gateways/scanner.gateway';
import { ScanStatus } from '../../presentation/dtos/scanner-events.dto';
import { CachedAlbumRepository } from '@features/albums/infrastructure/persistence/cached-album.repository';
import { ExternalMetadataService } from '@features/external-metadata/application/external-metadata.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { MbidAutoSearchService } from '@features/external-metadata/infrastructure/services/mbid-auto-search.service';
import { EnrichmentQueueService } from '@features/external-metadata/infrastructure/services/enrichment-queue.service';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import * as path from 'path';

/**
 * ScanProcessorService - Procesa escaneos de librería en background
 *
 * Responsabilidades:
 * - Encolar trabajos de escaneo en BullMQ
 * - Procesar escaneos en background
 * - Actualizar estado del escaneo en BD
 * - Coordinar FileScannerService, MetadataExtractorService y BD
 */
/**
 * Helper class para trackear progreso del scan
 */
class ScanProgress {
  filesScanned = 0;
  totalFiles = 0;
  tracksCreated = 0;
  albumsCreated = 0;
  artistsCreated = 0;
  coversExtracted = 0;
  errors = 0;

  get progress(): number {
    if (this.totalFiles === 0) return 0;
    return Math.round((this.filesScanned / this.totalFiles) * 100);
  }
}

// Setting key for music library path (same as admin-library.controller)
const LIBRARY_PATH_KEY = 'library.music.path';

@Injectable()
export class ScanProcessorService implements OnModuleInit {
  private readonly QUEUE_NAME = 'library-scan';

  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
    private readonly drizzle: DrizzleService,
    private readonly bullmq: BullmqService,
    private readonly fileScanner: FileScannerService,
    private readonly metadataExtractor: MetadataExtractorService,
    private readonly lufsAnalysisQueue: LufsAnalysisQueueService,
    private readonly coverArtService: CoverArtService,
    @Inject(forwardRef(() => ScannerGateway))
    private readonly scannerGateway: ScannerGateway,
    private readonly cachedAlbumRepository: CachedAlbumRepository,
    private readonly externalMetadataService: ExternalMetadataService,
    private readonly settingsService: SettingsService,
    private readonly mbidAutoSearchService: MbidAutoSearchService,
    private readonly enrichmentQueueService: EnrichmentQueueService,
    private readonly logService: LogService,
    @InjectPinoLogger(ScanProcessorService.name)
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    // Registrar procesador de jobs para scan completo
    this.bullmq.registerProcessor(this.QUEUE_NAME, async (job) => {
      return await this.processScanning(job.data);
    });

    // Registrar procesador de jobs para scan incremental (file watcher)
    this.bullmq.registerProcessor('scanner', async (job) => {
      if (job.name === 'incremental-scan') {
        return await this.processIncrementalScan(job.data);
      }
      return null;
    });
  }

  /**
   * Get music library path from settings, fallback to env, then default
   */
  private async getMusicLibraryPath(): Promise<string> {
    return this.settingsService.getString(
      LIBRARY_PATH_KEY,
      process.env.MUSIC_LIBRARY_PATH || '/music',
    );
  }

  /**
   * Encola un nuevo trabajo de escaneo
   */
  async enqueueScan(scanId: string, options?: any): Promise<void> {
    const libraryPath = await this.getMusicLibraryPath();
    await this.bullmq.addJob(
      this.QUEUE_NAME,
      'scan',
      {
        scanId,
        path: options?.path || libraryPath,
        recursive: options?.recursive !== false,
        pruneDeleted: options?.pruneDeleted !== false,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }

  /**
   * Procesa el escaneo de la librería
   */
  private async processScanning(data: any): Promise<void> {
    const { scanId, path: scanPath, recursive, pruneDeleted } = data;
    const startTime = Date.now();
    const tracker = new ScanProgress();

    this.logger.info(`📁 Iniciando escaneo ${scanId} en ${scanPath}`);

    // 🔵 LOG: Inicio de scan
    await this.logService.info(LogCategory.SCANNER, `Scan iniciado: ${scanId}`, {
      entityId: scanId,
      entityType: 'scan',
      details: JSON.stringify({ scanPath, recursive, pruneDeleted }),
    });

    try {
      // 1. Actualizar estado a "running"
      await this.scannerRepository.update(scanId, {
        status: 'running',
      } as any);

      // Emitir evento: scan iniciado
      this.emitProgress(scanId, tracker, ScanStatus.SCANNING, 'Buscando archivos...');

      // 2. Escanear archivos
      const files = await this.fileScanner.scanDirectory(scanPath, recursive);
      tracker.totalFiles = files.length;
      this.logger.info(`📁 Encontrados ${files.length} archivos de música`);

      // Emitir evento: archivos encontrados
      this.emitProgress(scanId, tracker, ScanStatus.SCANNING, `Encontrados ${files.length} archivos`);

      // 3. Procesar cada archivo
      let tracksAdded = 0;
      let tracksUpdated = 0;
      let tracksDeleted = 0;

      for (const filePath of files) {
        try {
          const result = await this.processFile(filePath, tracker);
          if (result === 'added') {
            tracksAdded++;
            tracker.tracksCreated++;
          }
          if (result === 'updated') tracksUpdated++;

          tracker.filesScanned++;

          // Emitir progreso cada 10 archivos o al 100%
          if (tracker.filesScanned % 10 === 0 || tracker.filesScanned === tracker.totalFiles) {
            this.emitProgress(
              scanId,
              tracker,
              ScanStatus.SCANNING,
              `Procesando ${path.basename(filePath)}`,
              filePath
            );
          }
        } catch (error) {
          tracker.errors++;
          this.scannerGateway.emitError({
            scanId,
            file: filePath,
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // 4. Si pruneDeleted está activado, eliminar tracks que ya no existen
      if (pruneDeleted) {
        this.emitProgress(scanId, tracker, ScanStatus.SCANNING, 'Eliminando archivos borrados...');
        tracksDeleted = await this.pruneDeletedTracks(files);
      }

      // ⭐ NOTA: Con la nueva arquitectura atómica, los álbumes y artistas
      // ya fueron creados/actualizados durante processFile().
      // No necesitamos fase de agregación separada.
      this.logger.info(`✅ Álbumes y artistas ya procesados durante el escaneo`);

      // 5. Actualizar escaneo como completado
      await this.scannerRepository.update(scanId, {
        status: 'completed',
        finishedAt: new Date(),
        tracksAdded,
        tracksUpdated,
        tracksDeleted,
      } as any);

      const duration = Date.now() - startTime;

      // Invalidar caché para que los nuevos álbumes aparezcan inmediatamente
      await this.cachedAlbumRepository.invalidateListCaches();

      // 6. Auto-enriquecer metadatos si está habilitado
      await this.performAutoEnrichment(tracker.artistsCreated, tracker.albumsCreated);

      // 7. Iniciar análisis LUFS en background para tracks sin ReplayGain
      await this.startLufsAnalysis();

      // 🟢 LOG: Scan completado exitosamente
      await this.logService.info(
        LogCategory.SCANNER,
        `Scan completado exitosamente: ${scanId}`,
        {
          entityId: scanId,
          entityType: 'scan',
          details: JSON.stringify({
            totalFiles: tracker.totalFiles,
            filesScanned: tracker.filesScanned,
            tracksCreated: tracker.tracksCreated,
            albumsCreated: tracker.albumsCreated,
            artistsCreated: tracker.artistsCreated,
            coversExtracted: tracker.coversExtracted,
            errors: tracker.errors,
            duration,
            tracksAdded,
            tracksUpdated,
            tracksDeleted,
          }),
        },
      );

      // Emitir evento: completado
      this.scannerGateway.emitCompleted({
        scanId,
        totalFiles: tracker.totalFiles,
        tracksCreated: tracker.tracksCreated,
        albumsCreated: tracker.albumsCreated,
        artistsCreated: tracker.artistsCreated,
        coversExtracted: tracker.coversExtracted,
        errors: tracker.errors,
        duration,
        timestamp: new Date().toISOString(),
      });

      this.logger.info(
        `✅ Escaneo completado: +${tracksAdded} ~${tracksUpdated} -${tracksDeleted}`,
      );
    } catch (error) {
      this.logger.error(`❌ Error en escaneo ${scanId}:`, error);

      // 🔴 LOG CRÍTICO: Scan falló completamente
      await this.logService.critical(
        LogCategory.SCANNER,
        `Scan falló completamente: ${scanId}`,
        {
          entityId: scanId,
          entityType: 'scan',
          details: JSON.stringify({
            scanPath,
            errorMessage: (error as Error).message,
            filesProcessedBeforeError: tracker.filesScanned,
          }),
        },
        error as Error,
      );

      // Actualizar escaneo como fallido
      await this.scannerRepository.update(scanId, {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: (error as Error).message || 'Error desconocido',
      } as any);

      throw error;
    }
  }

  /**
   * Helper para emitir progreso
   */
  private emitProgress(
    scanId: string,
    tracker: ScanProgress,
    status: ScanStatus,
    message: string,
    currentFile?: string,
  ): void {
    this.scannerGateway.emitProgress({
      scanId,
      status,
      progress: tracker.progress,
      filesScanned: tracker.filesScanned,
      totalFiles: tracker.totalFiles,
      tracksCreated: tracker.tracksCreated,
      albumsCreated: tracker.albumsCreated,
      artistsCreated: tracker.artistsCreated,
      coversExtracted: tracker.coversExtracted,
      errors: tracker.errors,
      currentFile,
      message,
    });
  }

  /**
   * Normaliza un string para comparación (sin acentos, minúsculas, sin espacios extra)
   */
  private normalizeForComparison(str: string): string {
    return str
      .normalize('NFD') // Descompone caracteres con acentos
      .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas (acentos)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Normaliza espacios múltiples a uno solo
  }

  /**
   * Busca o crea un artista de manera atómica
   *
   * Esta función garantiza que siempre retorne un artista válido con ID,
   * creándolo si no existe. Sigue el patrón "find-or-create" de Navidrome.
   *
   * Ahora con normalización de acentos para evitar duplicados:
   * - "Dani Fernández" y "Dani Fernandez" se reconocen como el mismo artista
   * - Se mantiene el nombre original (con acentos) del primer track encontrado
   * - Usa orderArtistName para búsqueda eficiente sin acentos
   *
   * @param artistName - Nombre del artista
   * @param mbzArtistId - MusicBrainz ID (opcional)
   * @returns Artista existente o recién creado, con flag 'created'
   */
  private async findOrCreateArtist(
    artistName: string,
    mbzArtistId?: string,
  ): Promise<{ id: string; name: string; created: boolean }> {
    // Normalizar nombre (evitar duplicados por espacios, etc.)
    const normalizedName = (artistName || 'Unknown Artist').trim();
    const orderName = normalizeForSorting(normalizedName); // Use shared utility for sorting

    // 1. Buscar artista por nombre normalizado (sin acentos)
    const existingArtist = await this.drizzle.db
      .select({ id: artists.id, name: artists.name, mbzArtistId: artists.mbzArtistId })
      .from(artists)
      .where(eq(artists.orderArtistName, orderName))
      .limit(1);

    if (existingArtist[0]) {
      // Update MBID if provided and the artist doesn't have one yet
      if (mbzArtistId && !existingArtist[0].mbzArtistId) {
        await this.drizzle.db
          .update(artists)
          .set({ mbzArtistId, updatedAt: new Date() })
          .where(eq(artists.id, existingArtist[0].id));
        this.logger.debug(`Updated MBID for artist "${existingArtist[0].name}": ${mbzArtistId}`);
      }
      return { id: existingArtist[0].id, name: existingArtist[0].name, created: false };
    }

    // 2. Si no existe, crearlo con el nombre original (con acentos si los tiene)
    const newArtist = await this.drizzle.db
      .insert(artists)
      .values({
        name: normalizedName,
        orderArtistName: orderName, // Guardar versión normalizada para búsquedas
        mbzArtistId: mbzArtistId || null,
        albumCount: 0, // Se calculará después
        songCount: 0,  // Se calculará después
        size: Number(0), // Se calculará después
      })
      .returning({ id: artists.id, name: artists.name });

    return { ...newArtist[0], created: true };
  }

  /**
   * Busca o crea un álbum de manera atómica
   *
   * Esta función garantiza que siempre retorne un álbum válido con ID,
   * creándolo si no existe y vinculándolo al artista correcto.
   * Sigue el patrón "find-or-create" de Navidrome.
   *
   * @param albumName - Nombre del álbum
   * @param artistId - ID del artista propietario
   * @param metadata - Metadatos adicionales del álbum
   * @param trackPath - Path del track (para extraer cover)
   * @returns Álbum existente o recién creado, con flags 'created' y 'coverExtracted'
   */
  private async findOrCreateAlbum(
    albumName: string,
    artistId: string,
    metadata: {
      year?: number;
      compilation?: boolean;
      mbzAlbumId?: string;
      mbzAlbumArtistId?: string;
    },
    trackPath: string,
  ): Promise<{ id: string; name: string; artistId: string; created: boolean; coverExtracted: boolean }> {
    // Normalizar nombre
    const normalizedName = (albumName || 'Unknown Album').trim();

    // 1. Intentar buscar el álbum existente
    // Search by name ONLY to prevent album splitting when:
    // - Tracks have different artists due to collaborations (feat.)
    // - Tracks have slightly different years (e.g., 2006 vs 2007)
    // This ensures all tracks from the same album stay under one album entity
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
      .where(eq(albums.name, normalizedName))
      .limit(1);

    // 2. Si existe, actualizar MBID y cover si es necesario
    if (existingAlbum[0]) {
      let coverExtracted = false;
      const updates: any = {};

      // Log existing album state for debugging
      this.logger.debug(
        `Found existing album "${existingAlbum[0].name}" (ID: ${existingAlbum[0].id}), ` +
        `coverArtPath: ${existingAlbum[0].coverArtPath === null ? 'NULL' : existingAlbum[0].coverArtPath === undefined ? 'UNDEFINED' : `"${existingAlbum[0].coverArtPath}"`}`
      );

      // Update MBID if provided and the album doesn't have one yet
      if (metadata.mbzAlbumId && !existingAlbum[0].mbzAlbumId) {
        updates.mbzAlbumId = metadata.mbzAlbumId;
        updates.mbzAlbumArtistId = metadata.mbzAlbumArtistId || null;
        this.logger.debug(`Updated MBID for album "${existingAlbum[0].name}": ${metadata.mbzAlbumId}`);
      }

      // Extract cover if missing (Navidrome-style: always check and fill gaps)
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
      } else {
        this.logger.debug(`Skipping cover extraction for "${existingAlbum[0].name}" - already has cover: ${existingAlbum[0].coverArtPath}`);
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

    // 3. Si no existe, crearlo
    {
      const albumId = generateUuid();

      // Extraer cover art del primer track
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
          albumArtistId: artistId, // Por defecto, album artist = artist
          year: metadata.year || null,
          compilation: metadata.compilation || false,
          mbzAlbumId: metadata.mbzAlbumId || null,
          mbzAlbumArtistId: metadata.mbzAlbumArtistId || null,
          coverArtPath: coverPath || null,
          orderAlbumName: normalizeForSorting(normalizedName), // Auto-populate for sorting
          songCount: 0,    // Se actualizará con cada track
          duration: 0,     // Se actualizará con cada track
          size: Number(0), // Se actualizará con cada track
        })
        .returning({
          id: albums.id,
          name: albums.name,
          artistId: albums.artistId,
        });

      return {
        id: newAlbum[0].id,
        name: newAlbum[0].name,
        artistId: newAlbum[0].artistId!, // TypeScript: garantizamos que no es null porque acabamos de crearlo
        created: true,
        coverExtracted: !!coverPath,
      };
    }
  }

  /**
   * Procesa un archivo individual de manera ATÓMICA
   *
   * Siguiendo la arquitectura de Navidrome, este método:
   * 1. Extrae metadatos del archivo
   * 2. Busca o crea el artista
   * 3. Busca o crea el álbum (vinculado al artista)
   * 4. Crea o actualiza el track (vinculado al álbum y artista)
   *
   * Todo en una sola pasada, garantizando consistencia de datos.
   * No hay fase de "agregación" ni "vinculación" posterior.
   *
   * @param filePath - Ruta del archivo de música
   * @param tracker - (Opcional) Tracker para actualizar contadores
   * @returns 'added' si se creó, 'updated' si se actualizó, 'skipped' si hubo error
   */
  private async processFile(
    filePath: string,
    tracker?: ScanProgress,
  ): Promise<'added' | 'updated' | 'skipped'> {
    try {
      // ============================================================
      // 1. EXTRAER METADATOS
      // ============================================================
      const metadata = await this.metadataExtractor.extractMetadata(filePath);
      if (!metadata) {
        this.logger.warn(`⚠️  No se pudieron extraer metadatos de ${filePath}`);

        // 🔴 LOG CRÍTICO: No se pudieron extraer metadatos
        await this.logService.error(
          LogCategory.SCANNER,
          `Fallo al extraer metadatos del archivo`,
          {
            details: JSON.stringify({
              filePath,
              fileExtension: path.extname(filePath),
              reason: 'metadata_extraction_failed',
            }),
          },
        );

        return 'skipped';
      }

      const stats = await this.fileScanner.getFileStats(filePath);
      const size = stats ? stats.size : 0;

      // ============================================================
      // 2. BUSCAR O CREAR ARTISTA (atómico)
      // ============================================================
      // Use albumArtist if available to keep album under one artist,
      // otherwise use artist field. This prevents album splitting when tracks have "feat."
      const artistName = metadata.albumArtist || metadata.artist || 'Unknown Artist';
      const mbzArtistId = Array.isArray(metadata.musicBrainzArtistId)
        ? metadata.musicBrainzArtistId[0]
        : metadata.musicBrainzArtistId;

      const artist = await this.findOrCreateArtist(artistName, mbzArtistId);

      // Trackear si se creó un nuevo artista
      if (artist.created && tracker) {
        tracker.artistsCreated++;
      }

      // 🎯 Auto-búsqueda MBID estilo Picard: si el artista no tiene MBID, buscarlo
      if (!mbzArtistId && artist.created) {
        // Ejecutar en background para no bloquear el scan
        this.mbidAutoSearchService
          .searchArtistMbid(artist.id, artistName, true)
          .catch((error) => {
            this.logger.warn(
              `Auto-search MBID failed for artist "${artistName}": ${error.message}`,
            );
          });
      }

      // ============================================================
      // 3. BUSCAR O CREAR ÁLBUM (atómico, vinculado al artista)
      // ============================================================
      const albumName = metadata.album || 'Unknown Album';
      const mbzAlbumId = metadata.musicBrainzAlbumId;
      const mbzAlbumArtistId = Array.isArray(metadata.musicBrainzAlbumArtistId)
        ? metadata.musicBrainzAlbumArtistId[0]
        : metadata.musicBrainzAlbumArtistId;

      const album = await this.findOrCreateAlbum(
        albumName,
        artist.id,
        {
          year: metadata.year,
          compilation: metadata.compilation,
          mbzAlbumId,
          mbzAlbumArtistId,
        },
        filePath,
      );

      // Trackear si se creó un nuevo álbum o cover
      if (tracker) {
        if (album.created) tracker.albumsCreated++;
        if (album.coverExtracted) tracker.coversExtracted++;
      }

      // 🎯 Auto-búsqueda MBID estilo Picard: si el álbum no tiene MBID, buscarlo
      if (!mbzAlbumId && album.created) {
        // Ejecutar en background para no bloquear el scan
        this.mbidAutoSearchService
          .searchAlbumMbid(album.id, albumName, artistName, true)
          .catch((error) => {
            this.logger.warn(
              `Auto-search MBID failed for album "${albumName}": ${error.message}`,
            );
          });
      }

      // ============================================================
      // 4. CREAR O ACTUALIZAR TRACK (con IDs ya vinculados)
      // ============================================================
      const existingTrackResult = await this.drizzle.db
        .select()
        .from(tracks)
        .where(eq(tracks.path, filePath))
        .limit(1);
      const existingTrack = existingTrackResult[0];

      // 🔵 LOG: Datos del track antes de guardar
      if (!metadata.title && !metadata.artist && !metadata.album) {
        await this.logService.warning(
          LogCategory.SCANNER,
          `Track sin metadatos básicos (título, artista, álbum)`,
          {
            details: JSON.stringify({
              filePath,
              hasTitle: !!metadata.title,
              hasArtist: !!metadata.artist,
              hasAlbum: !!metadata.album,
              fileName: path.basename(filePath),
            }),
          },
        );
      }

      const trackData = {
        title: metadata.title || path.basename(filePath, path.extname(filePath)),
        // Store the full artist name from metadata (includes "feat." collaborations)
        // while the album stays associated with the main artist
        artistName: metadata.artist || artist.name,
        albumName: album.name,
        albumArtistName: metadata.albumArtist || artist.name,
        // ⭐ CRITICAL: Vincular con IDs desde el inicio
        artistId: artist.id,
        albumId: album.id,
        albumArtistId: artist.id,
        // Metadatos del track
        trackNumber: metadata.trackNumber,
        discNumber: metadata.discNumber || 1,
        year: metadata.year,
        duration: metadata.duration,
        bitRate: metadata.bitRate,
        channels: metadata.channels,
        size: Number(size),
        suffix: this.fileScanner.getFileExtension(filePath),
        path: filePath,
        hasCoverArt: metadata.coverArt || false,
        compilation: metadata.compilation || false,
        comment: typeof metadata.comment === 'object' && metadata.comment?.text
          ? metadata.comment.text
          : typeof metadata.comment === 'string'
            ? metadata.comment
            : null,
        lyrics: metadata.lyrics,
        // ReplayGain / Normalización de audio (from embedded tags, LUFS analyzed in background)
        rgTrackGain: metadata.rgTrackGain ?? null,
        rgTrackPeak: metadata.rgTrackPeak ?? null,
        rgAlbumGain: metadata.rgAlbumGain ?? null,
        rgAlbumPeak: metadata.rgAlbumPeak ?? null,
        // MusicBrainz IDs
        mbzTrackId: metadata.musicBrainzTrackId,
        mbzAlbumId: mbzAlbumId,
        mbzArtistId: mbzArtistId,
        mbzAlbumArtistId: mbzAlbumArtistId,
      };

      if (existingTrack) {
        // Actualizar track existente
        await this.drizzle.db
          .update(tracks)
          .set({ ...trackData, updatedAt: new Date() })
          .where(eq(tracks.id, existingTrack.id));

        // Guardar géneros desde tags de audio
        await this.saveTrackGenres(existingTrack.id, metadata.genre);

        // Actualizar contadores del álbum
        await this.updateAlbumStats(album.id);
        await this.updateArtistStats(artist.id);

        return 'updated';
      } else {
        // Crear nuevo track
        const newTrackResult = await this.drizzle.db
          .insert(tracks)
          .values(trackData)
          .returning();
        const newTrack = newTrackResult[0];

        // Guardar géneros desde tags de audio
        await this.saveTrackGenres(newTrack.id, metadata.genre);

        // 🎯 Auto-búsqueda MBID estilo Picard: si el track no tiene MBID, buscarlo
        if (!metadata.musicBrainzTrackId) {
          // Ejecutar en background para no bloquear el scan
          this.mbidAutoSearchService
            .searchTrackMbid(
              newTrack.id,
              {
                artist: metadata.artist || artistName,
                album: albumName,
                title: metadata.title || path.basename(filePath, path.extname(filePath)),
                trackNumber: metadata.trackNumber,
                duration: metadata.duration,
              },
              true,
            )
            .catch((error) => {
              this.logger.warn(
                `Auto-search MBID failed for track "${metadata.title}": ${error.message}`,
              );
            });
        }

        // Actualizar contadores del álbum
        await this.updateAlbumStats(album.id);
        await this.updateArtistStats(artist.id);

        return 'added';
      }
    } catch (error) {
      this.logger.error(`❌ Error procesando ${filePath}:`, error);

      // 🔴 LOG CRÍTICO: Error procesando archivo
      await this.logService.error(
        LogCategory.SCANNER,
        `Error procesando archivo de música`,
        {
          details: JSON.stringify({
            filePath,
            fileExtension: path.extname(filePath),
            errorMessage: (error as Error).message,
          }),
        },
        error as Error,
      );

      return 'skipped';
    }
  }

  /**
   * Actualiza las estadísticas de un álbum (songCount, duration, size)
   * basándose en sus tracks vinculados
   */
  private async updateAlbumStats(albumId: string): Promise<void> {
    const stats = await this.drizzle.db
      .select({
        count: count(),
        totalDuration: sum(tracks.duration),
        totalSize: sum(tracks.size),
      })
      .from(tracks)
      .where(eq(tracks.albumId, albumId));

    await this.drizzle.db
      .update(albums)
      .set({
        songCount: stats[0]?.count ?? 0,
        duration: Number(stats[0]?.totalDuration) || 0,
        size: Number(stats[0]?.totalSize ?? 0),
        updatedAt: new Date(),
      })
      .where(eq(albums.id, albumId));
  }

  /**
   * Actualiza las estadísticas de un artista (albumCount, songCount, size)
   * basándose en sus álbumes y tracks vinculados
   */
  private async updateArtistStats(artistId: string): Promise<void> {
    const [albumCountResult, trackStats] = await Promise.all([
      this.drizzle.db
        .select({ count: count() })
        .from(albums)
        .where(eq(albums.artistId, artistId)),
      this.drizzle.db
        .select({
          count: count(),
          totalSize: sum(tracks.size),
        })
        .from(tracks)
        .where(eq(tracks.artistId, artistId)),
    ]);

    await this.drizzle.db
      .update(artists)
      .set({
        albumCount: albumCountResult[0]?.count ?? 0,
        songCount: trackStats[0]?.count ?? 0,
        size: Number(trackStats[0]?.totalSize ?? 0),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));
  }

  /**
   * Elimina tracks de la BD que ya no existen en el filesystem
   */
  private async pruneDeletedTracks(existingFiles: string[]): Promise<number> {
    try {
      // Obtener todos los tracks de la BD
      const allTracks = await this.drizzle.db
        .select({ id: tracks.id, path: tracks.path })
        .from(tracks);

      const existingFilesSet = new Set(existingFiles);
      const tracksToDelete: string[] = [];

      // Encontrar tracks que ya no existen
      for (const track of allTracks) {
        if (!existingFilesSet.has(track.path)) {
          const exists = await this.fileScanner.pathExists(track.path);
          if (!exists) {
            tracksToDelete.push(track.id);
          }
        }
      }

      // Eliminar tracks
      if (tracksToDelete.length > 0) {
        await this.drizzle.db
          .delete(tracks)
          .where(sql`${tracks.id} IN (${sql.join(tracksToDelete.map((id) => sql`${id}`), sql`, `)})`);
        this.logger.info(`🗑️  Eliminados ${tracksToDelete.length} tracks obsoletos`);
      }

      // Eliminar álbumes huérfanos (sin tracks) usando NOT EXISTS
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

      // Eliminar artistas huérfanos (sin álbumes) usando NOT EXISTS
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

      return tracksToDelete.length;
    } catch (error) {
      this.logger.error('Error eliminando registros obsoletos:', error);
      return 0;
    }
  }


  /**
   * Procesa scan incremental de archivos específicos (desde file watcher)
   * Mucho más rápido que scan completo - solo procesa archivos detectados
   */
  private async processIncrementalScan(data: any): Promise<void> {
    const { files, source, timestamp } = data;
    const scanId = generateUuid(); // ID único para tracking

    this.logger.info(`🔍 Iniciando scan incremental de ${files.length} archivo(s)...`);
    this.logger.info(`📁 Fuente: ${source} | Timestamp: ${timestamp}`);

    // Emitir progreso inicial via WebSocket
    this.scannerGateway.emitProgress({
      scanId,
      status: ScanStatus.SCANNING,
      progress: 0,
      filesScanned: 0,
      totalFiles: files.length,
      tracksCreated: 0,
      albumsCreated: 0,
      artistsCreated: 0,
      coversExtracted: 0,
      errors: 0,
      message: `Auto-scan detectó ${files.length} archivo(s) nuevo(s)`,
    });

    const tracker = new ScanProgress();
    tracker.totalFiles = files.length;

    try {
      // Procesar cada archivo detectado usando el método existente
      for (const filePath of files) {
        try {
          this.logger.info(`🎵 Procesando: ${path.basename(filePath)}`);

          const result = await this.processFile(filePath, tracker);

          if (result === 'added') {
            tracker.tracksCreated++;
          } else if (result === 'skipped') {
            tracker.errors++;
          }

          tracker.filesScanned++;

          // Emitir progreso cada 5 archivos o al final
          if (tracker.filesScanned % 5 === 0 || tracker.filesScanned === tracker.totalFiles) {
            this.scannerGateway.emitProgress({
              scanId,
              status: ScanStatus.SCANNING,
              progress: tracker.progress,
              filesScanned: tracker.filesScanned,
              totalFiles: tracker.totalFiles,
              tracksCreated: tracker.tracksCreated,
              albumsCreated: 0,
              artistsCreated: 0,
              coversExtracted: 0,
              errors: tracker.errors,
              currentFile: path.basename(filePath),
              message: `Auto-scan: ${tracker.filesScanned}/${tracker.totalFiles}`,
            });
          }
        } catch (error) {
          this.logger.error(`❌ Error procesando ${filePath}:`, error);
          tracker.errors++;
        }
      }

      // ⭐ Con la nueva arquitectura atómica, álbumes y artistas ya fueron
      // creados durante processFile(). No necesitamos agregación separada.

      // Invalidar caché para que los nuevos álbumes aparezcan inmediatamente
      await this.cachedAlbumRepository.invalidateListCaches();

      // Auto-enriquecer metadatos si está habilitado
      await this.performAutoEnrichment(tracker.artistsCreated, tracker.albumsCreated);

      // Iniciar análisis LUFS en background
      await this.startLufsAnalysis();

      // Scan completado
      this.scannerGateway.emitCompleted({
        scanId,
        totalFiles: tracker.totalFiles,
        tracksCreated: tracker.tracksCreated,
        albumsCreated: tracker.albumsCreated,
        artistsCreated: tracker.artistsCreated,
        coversExtracted: tracker.coversExtracted,
        errors: tracker.errors,
        duration: 0, // No trackear duración en auto-scan
        timestamp: new Date().toISOString(),
      });

      this.logger.info(`✅ Auto-scan completado:`);
      this.logger.info(`   📁 Archivos: ${tracker.filesScanned}/${tracker.totalFiles}`);
      this.logger.info(`   🎵 Tracks: ${tracker.tracksCreated}`);
      this.logger.info(`   💿 Álbumes: ${tracker.albumsCreated}`);
      this.logger.info(`   🎤 Artistas: ${tracker.artistsCreated}`);
      this.logger.info(`   📸 Covers: ${tracker.coversExtracted}`);
      if (tracker.errors > 0) {
        this.logger.info(`   ⚠️ Errores: ${tracker.errors}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error en scan incremental:`, error);
      this.scannerGateway.emitError({
        scanId,
        file: 'incremental-scan',
        error: error instanceof Error ? (error as Error).message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Realiza auto-enriquecimiento de metadatos externos si está habilitado
   * Se ejecuta después de completar un escaneo exitoso.
   * Inicia la cola de enriquecimiento continuo en background.
   */
  private async performAutoEnrichment(
    artistsCreated: number,
    albumsCreated: number,
  ): Promise<void> {
    try {
      // Verificar si el auto-enriquecimiento está habilitado
      const autoEnrichEnabled = await this.settingsService.getBoolean(
        'metadata.auto_enrich.enabled',
        true, // Enabled by default
      );

      if (!autoEnrichEnabled) {
        this.logger.info('Auto-enriquecimiento deshabilitado en configuración');
        return;
      }

      // Iniciar cola de enriquecimiento continuo
      // Esto procesará TODOS los items pendientes en background, uno a uno,
      // respetando los rate limits de las APIs externas
      const result = await this.enrichmentQueueService.startEnrichmentQueue();

      if (result.started) {
        this.logger.info(
          `🚀 Cola de enriquecimiento iniciada: ${result.pending} items pendientes`
        );
      } else {
        this.logger.info(`ℹ️ ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Error al iniciar cola de enriquecimiento: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // No lanzar error para no afectar el escaneo principal
    }
  }

  /**
   * Inicia el análisis LUFS en background para tracks sin datos de ReplayGain.
   * Esto permite que el scan sea rápido y el análisis de audio pesado
   * se ejecute gradualmente después.
   */
  private async startLufsAnalysis(): Promise<void> {
    try {
      const result = await this.lufsAnalysisQueue.startLufsAnalysisQueue();

      if (result.started) {
        this.logger.info(
          `🎚️ Cola de análisis LUFS iniciada: ${result.pending} tracks pendientes`
        );
      } else if (result.pending > 0) {
        this.logger.info(`ℹ️ ${result.message}`);
      }
      // Si pending es 0, no loggear nada (todos los tracks ya tienen datos)
    } catch (error) {
      this.logger.error(
        `Error al iniciar cola de análisis LUFS: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // No lanzar error para no afectar el escaneo principal
    }
  }

  /**
   * Process and save genres from audio file tags
   * Creates genre entries if they don't exist and associates them with the track
   *
   * @param trackId - Track ID to associate genres with
   * @param genreTags - Array of genre names from audio metadata
   */
  private async saveTrackGenres(trackId: string, genreTags?: string[]): Promise<void> {
    if (!genreTags || genreTags.length === 0) {
      return;
    }

    try {
      // Normalize genre names (trim, lowercase, remove duplicates)
      const normalizedGenres = [...new Set(
        genreTags
          .map((g) => g.trim())
          .filter((g) => g.length > 0 && g.length <= 100) // Max 100 chars per schema
          .map((g) => g.charAt(0).toUpperCase() + g.slice(1)) // Capitalize first letter
      )];

      if (normalizedGenres.length === 0) {
        return;
      }

      // Upsert genres (create if not exist)
      const genreRecords = await Promise.all(
        normalizedGenres.map(async (genreName) => {
          // Try to find existing genre
          const existing = await this.drizzle.db
            .select({ id: genres.id, name: genres.name })
            .from(genres)
            .where(eq(genres.name, genreName))
            .limit(1);

          if (existing[0]) {
            return existing[0];
          }

          // Create new genre
          const newGenre = await this.drizzle.db
            .insert(genres)
            .values({ name: genreName })
            .onConflictDoNothing({ target: genres.name })
            .returning({ id: genres.id, name: genres.name });

          // If insert was ignored due to conflict, fetch existing
          if (!newGenre[0]) {
            const fetched = await this.drizzle.db
              .select({ id: genres.id, name: genres.name })
              .from(genres)
              .where(eq(genres.name, genreName))
              .limit(1);
            return fetched[0];
          }

          return newGenre[0];
        }),
      );

      // Associate genres with track (skip if already associated)
      await Promise.all(
        genreRecords
          .filter((genre) => genre != null)
          .map(async (genre) => {
            try {
              await this.drizzle.db
                .insert(trackGenres)
                .values({
                  trackId,
                  genreId: genre.id,
                })
                .onConflictDoNothing();
            } catch (error) {
              // Log warning for non-constraint errors
              this.logger.warn(
                `Failed to associate genre ${genre.name} with track: ${(error as Error).message}`,
              );
            }
          }),
      );

      this.logger.debug(`Saved ${genreRecords.length} genres for track ${trackId}`);
    } catch (error) {
      this.logger.error(`Error saving track genres: ${(error as Error).message}`);
      // Don't throw - genre saving shouldn't block track processing
    }
  }
}
