import { Injectable, Inject, OnModuleInit, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../domain/ports/scanner-repository.port';
import { FileScannerService } from './file-scanner.service';
import { MetadataExtractorService } from './metadata-extractor.service';
import { CoverArtService } from '@shared/services';
import { generateUuid } from '@shared/utils';
import { ScannerGateway } from '../gateways/scanner.gateway';
import { ScanStatus } from '../../presentation/dtos/scanner-events.dto';
import { CachedAlbumRepository } from '@features/albums/infrastructure/persistence/cached-album.repository';
import { ExternalMetadataService } from '@features/external-metadata/application/external-metadata.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { MbidAutoSearchService } from '@features/external-metadata/infrastructure/services/mbid-auto-search.service';
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

@Injectable()
export class ScanProcessorService implements OnModuleInit {
  private readonly logger = new Logger(ScanProcessorService.name);
  private readonly QUEUE_NAME = 'library-scan';
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads/music';

  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
    private readonly prisma: PrismaService,
    private readonly bullmq: BullmqService,
    private readonly fileScanner: FileScannerService,
    private readonly metadataExtractor: MetadataExtractorService,
    private readonly coverArtService: CoverArtService,
    @Inject(forwardRef(() => ScannerGateway))
    private readonly scannerGateway: ScannerGateway,
    private readonly cachedAlbumRepository: CachedAlbumRepository,
    private readonly externalMetadataService: ExternalMetadataService,
    private readonly settingsService: SettingsService,
    private readonly mbidAutoSearchService: MbidAutoSearchService,
    private readonly logService: LogService,
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
   * Encola un nuevo trabajo de escaneo
   */
  async enqueueScan(scanId: string, options?: any): Promise<void> {
    await this.bullmq.addJob(
      this.QUEUE_NAME,
      'scan',
      {
        scanId,
        path: options?.path || this.uploadPath,
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

    console.log(`📁 Iniciando escaneo ${scanId} en ${scanPath}`);

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
      console.log(`📁 Encontrados ${files.length} archivos de música`);

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
      console.log(`✅ Álbumes y artistas ya procesados durante el escaneo`);

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

      console.log(
        `✅ Escaneo completado: +${tracksAdded} ~${tracksUpdated} -${tracksDeleted}`,
      );
    } catch (error) {
      console.error(`❌ Error en escaneo ${scanId}:`, error);

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
    const orderName = this.normalizeForComparison(normalizedName);

    // 1. Buscar artista por nombre normalizado (sin acentos)
    let artist = await this.prisma.artist.findFirst({
      where: { orderArtistName: orderName },
      select: { id: true, name: true },
    });

    if (artist) {
      return { ...artist, created: false };
    }

    // 2. Si no existe, crearlo con el nombre original (con acentos si los tiene)
    artist = await this.prisma.artist.create({
      data: {
        name: normalizedName,
        orderArtistName: orderName, // Guardar versión normalizada para búsquedas
        mbzArtistId: mbzArtistId || undefined,
        albumCount: 0, // Se calculará después
        songCount: 0,  // Se calculará después
        size: BigInt(0), // Se calculará después
      },
      select: { id: true, name: true },
    });
    return { ...artist, created: true };
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
    let album = await this.prisma.album.findFirst({
      where: {
        name: normalizedName,
      },
      select: { id: true, name: true, artistId: true, coverArtPath: true, year: true },
    });

    // 2. Si no existe, crearlo
    if (!album) {
      const albumId = generateUuid();

      // Extraer cover art del primer track
      const coverPath = await this.coverArtService.extractAndCacheCover(
        albumId,
        trackPath,
      );

      album = await this.prisma.album.create({
        data: {
          id: albumId,
          name: normalizedName,
          artistId: artistId,
          albumArtistId: artistId, // Por defecto, album artist = artist
          year: metadata.year || undefined,
          compilation: metadata.compilation || false,
          mbzAlbumId: metadata.mbzAlbumId || undefined,
          mbzAlbumArtistId: metadata.mbzAlbumArtistId || undefined,
          coverArtPath: coverPath || undefined,
          songCount: 0,    // Se actualizará con cada track
          duration: 0,     // Se actualizará con cada track
          size: BigInt(0), // Se actualizará con cada track
        },
        select: { id: true, name: true, artistId: true, coverArtPath: true, year: true },
      });

      return {
        id: album.id,
        name: album.name,
        artistId: album.artistId!, // TypeScript: garantizamos que no es null porque acabamos de crearlo
        created: true,
        coverExtracted: !!coverPath
      };
    }

    return {
      id: album.id,
      name: album.name,
      artistId: album.artistId!, // TypeScript: garantizamos que no es null porque filtramos por artistId
      created: false,
      coverExtracted: false
    };
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
        console.warn(`⚠️  No se pudieron extraer metadatos de ${filePath}`);

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
      const existingTrack = await this.prisma.track.findUnique({
        where: { path: filePath },
      });

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
        size: BigInt(size),
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
        mbzTrackId: metadata.musicBrainzTrackId,
        mbzAlbumId: mbzAlbumId,
        mbzArtistId: mbzArtistId,
        mbzAlbumArtistId: mbzAlbumArtistId,
      };

      if (existingTrack) {
        // Actualizar track existente
        await this.prisma.track.update({
          where: { id: existingTrack.id },
          data: trackData,
        });

        // Actualizar contadores del álbum
        await this.updateAlbumStats(album.id);
        await this.updateArtistStats(artist.id);

        return 'updated';
      } else {
        // Crear nuevo track
        const newTrack = await this.prisma.track.create({
          data: trackData,
        });

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
      console.error(`❌ Error procesando ${filePath}:`, error);

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
    const stats = await this.prisma.track.aggregate({
      where: { albumId },
      _count: { id: true },
      _sum: {
        duration: true,
        size: true,
      },
    });

    await this.prisma.album.update({
      where: { id: albumId },
      data: {
        songCount: stats._count.id,
        duration: stats._sum.duration || 0,
        size: stats._sum.size || BigInt(0),
      },
    });
  }

  /**
   * Actualiza las estadísticas de un artista (albumCount, songCount, size)
   * basándose en sus álbumes y tracks vinculados
   */
  private async updateArtistStats(artistId: string): Promise<void> {
    const [albumCount, trackStats] = await Promise.all([
      this.prisma.album.count({ where: { artistId } }),
      this.prisma.track.aggregate({
        where: { artistId },
        _count: { id: true },
        _sum: { size: true },
      }),
    ]);

    await this.prisma.artist.update({
      where: { id: artistId },
      data: {
        albumCount,
        songCount: trackStats._count.id,
        size: trackStats._sum.size || BigInt(0),
      },
    });
  }

  /**
   * Elimina tracks de la BD que ya no existen en el filesystem
   */
  private async pruneDeletedTracks(existingFiles: string[]): Promise<number> {
    try {
      // Obtener todos los tracks de la BD
      const allTracks = await this.prisma.track.findMany({
        select: { id: true, path: true },
      });

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
        await this.prisma.track.deleteMany({
          where: {
            id: {
              in: tracksToDelete,
            },
          },
        });
        console.log(`🗑️  Eliminados ${tracksToDelete.length} tracks obsoletos`);
      }

      // Eliminar álbumes huérfanos (sin tracks)
      const orphanedAlbums = await this.prisma.album.findMany({
        where: {
          tracks: {
            none: {},
          },
        },
        select: { id: true },
      });

      if (orphanedAlbums.length > 0) {
        await this.prisma.album.deleteMany({
          where: {
            id: {
              in: orphanedAlbums.map(a => a.id),
            },
          },
        });
        console.log(`🗑️  Eliminados ${orphanedAlbums.length} álbumes huérfanos`);
      }

      // Eliminar artistas huérfanos (sin álbumes)
      const orphanedArtists = await this.prisma.artist.findMany({
        where: {
          albums: {
            none: {},
          },
        },
        select: { id: true },
      });

      if (orphanedArtists.length > 0) {
        await this.prisma.artist.deleteMany({
          where: {
            id: {
              in: orphanedArtists.map(a => a.id),
            },
          },
        });
        console.log(`🗑️  Eliminados ${orphanedArtists.length} artistas huérfanos`);
      }

      return tracksToDelete.length;
    } catch (error) {
      console.error('Error eliminando registros obsoletos:', error);
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

    console.log(`🔍 Iniciando scan incremental de ${files.length} archivo(s)...`);
    console.log(`📁 Fuente: ${source} | Timestamp: ${timestamp}`);

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
          console.log(`🎵 Procesando: ${path.basename(filePath)}`);

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
          console.error(`❌ Error procesando ${filePath}:`, error);
          tracker.errors++;
        }
      }

      // ⭐ Con la nueva arquitectura atómica, álbumes y artistas ya fueron
      // creados durante processFile(). No necesitamos agregación separada.

      // Invalidar caché para que los nuevos álbumes aparezcan inmediatamente
      await this.cachedAlbumRepository.invalidateListCaches();

      // Auto-enriquecer metadatos si está habilitado
      await this.performAutoEnrichment(tracker.artistsCreated, tracker.albumsCreated);

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

      console.log(`✅ Auto-scan completado:`);
      console.log(`   📁 Archivos: ${tracker.filesScanned}/${tracker.totalFiles}`);
      console.log(`   🎵 Tracks: ${tracker.tracksCreated}`);
      console.log(`   💿 Álbumes: ${tracker.albumsCreated}`);
      console.log(`   🎤 Artistas: ${tracker.artistsCreated}`);
      console.log(`   📸 Covers: ${tracker.coversExtracted}`);
      if (tracker.errors > 0) {
        console.log(`   ⚠️ Errores: ${tracker.errors}`);
      }
    } catch (error) {
      console.error(`❌ Error en scan incremental:`, error);
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
   * Se ejecuta después de completar un escaneo exitoso
   */
  private async performAutoEnrichment(
    artistsCreated: number,
    albumsCreated: number,
  ): Promise<void> {
    try {
      // Verificar si el auto-enriquecimiento está habilitado
      const autoEnrichEnabled = await this.settingsService.getBoolean(
        'metadata.auto_enrich.enabled',
        false,
      );

      if (!autoEnrichEnabled) {
        this.logger.debug('Auto-enriquecimiento deshabilitado, omitiendo');
        return;
      }

      const batchSize = await this.settingsService.getNumber(
        'metadata.auto_enrich.batch_size',
        10,
      );

      this.logger.log(
        `Iniciando auto-enriquecimiento (batch size: ${batchSize})`,
      );

      // Obtener artistas recientes sin metadatos externos (ordenar por fecha de creación desc, limit por batch size)
      // Enriquecer tanto artistas con MBID (para Fanart.tv) como sin MBID (para buscar en MusicBrainz)
      const artistsToEnrich = await this.prisma.artist.findMany({
        where: {
          OR: [
            // Sin MBID - SIEMPRE intentar buscar
            { mbzArtistId: null },
            // Sin ninguna imagen externa - necesita enriquecimiento completo
            {
              AND: [
                { externalProfileUpdatedAt: null },
                { externalBackgroundUpdatedAt: null },
                { externalBannerUpdatedAt: null },
                { externalLogoUpdatedAt: null },
              ],
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: batchSize,
        select: {
          id: true,
          name: true,
          mbzArtistId: true,
        },
      });

      // Enriquecer artistas en background (no esperar)
      if (artistsToEnrich.length > 0) {
        const withoutMbid = artistsToEnrich.filter(a => !a.mbzArtistId).length;
        this.logger.log(
          `Enriqueciendo ${artistsToEnrich.length} artistas en background (${withoutMbid} sin MBID)`,
        );

        // Ejecutar en background sin bloquear
        this.enrichArtistsInBackground(artistsToEnrich).catch((error) => {
          this.logger.error(
            `Error en auto-enriquecimiento de artistas: ${(error as Error).message}`,
            (error as Error).stack,
          );
        });
      }

      // Obtener álbumes recientes sin portadas externas o con enriquecimiento incompleto
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const albumsToEnrich = await this.prisma.album.findMany({
        where: {
          OR: [
            { externalCoverPath: null }, // No tiene portada externa
            { mbzAlbumId: null }, // No tiene MBID - SIEMPRE intentar buscar
            {
              AND: [
                { externalCoverPath: { not: null } }, // Tiene path
                { externalInfoUpdatedAt: null }, // Pero nunca se completó el enriquecimiento
              ]
            },
            {
              AND: [
                { externalCoverPath: { not: null } }, // Tiene path
                { createdAt: { gte: oneDayAgo } }, // Creado recientemente (últimas 24h)
              ]
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: batchSize,
        select: {
          id: true,
          name: true,
          mbzAlbumId: true,
          externalCoverPath: true,
          externalInfoUpdatedAt: true,
        },
      });

      // Enriquecer álbumes en background (no esperar)
      if (albumsToEnrich.length > 0) {
        const withoutCover = albumsToEnrich.filter(a => !a.externalCoverPath).length;
        const withoutMbid = albumsToEnrich.filter(a => !a.mbzAlbumId).length;
        const withIncomplete = albumsToEnrich.filter(a => a.externalCoverPath && !a.externalInfoUpdatedAt).length;
        const recentWithCover = albumsToEnrich.filter(a => a.externalCoverPath && a.externalInfoUpdatedAt).length;

        this.logger.log(
          `Enriqueciendo ${albumsToEnrich.length} álbumes en background: ` +
          `${withoutCover} sin cover, ${withoutMbid} sin MBID, ${withIncomplete} incompletos, ${recentWithCover} recientes para verificar`
        );

        // Ejecutar en background sin bloquear
        this.enrichAlbumsInBackground(albumsToEnrich).catch((error) => {
          this.logger.error(
            `Error en auto-enriquecimiento de álbumes: ${(error as Error).message}`,
            (error as Error).stack,
          );
        });
      }

      this.logger.log('Auto-enriquecimiento iniciado en background');
    } catch (error) {
      this.logger.error(
        `Error al iniciar auto-enriquecimiento: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // No lanzar error para no afectar el escaneo principal
    }
  }

  /**
   * Enriquece artistas en background
   */
  private async enrichArtistsInBackground(
    artists: Array<{ id: string; name: string; mbzArtistId: string | null }>,
  ): Promise<void> {
    for (const artist of artists) {
      try {
        await this.externalMetadataService.enrichArtist(artist.id, false);
        this.logger.debug(`Artista enriquecido: ${artist.name}`);
      } catch (error) {
        this.logger.warn(
          `Error enriqueciendo artista ${artist.name}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Enriquece álbumes en background
   */
  private async enrichAlbumsInBackground(
    albums: Array<{
      id: string;
      name: string;
      mbzAlbumId: string | null;
      externalCoverPath?: string | null;
      externalInfoUpdatedAt?: Date | null;
    }>,
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    for (const album of albums) {
      try {
        // Si tiene cover path, verificar si el archivo existe físicamente
        let needsRefresh = false;
        if (album.externalCoverPath) {
          try {
            const fullPath = path.join(process.cwd(), album.externalCoverPath);
            await fs.access(fullPath);
            // El archivo existe, no necesita refresh
          } catch {
            // El archivo no existe, necesita refresh
            needsRefresh = true;
            this.logger.debug(
              `Cover file missing for album "${album.name}", will re-download`
            );
          }
        }

        await this.externalMetadataService.enrichAlbum(album.id, needsRefresh);
        this.logger.debug(`Album enriched: ${album.name}`);
      } catch (error) {
        this.logger.warn(
          `Error enriching album ${album.name}: ${(error as Error).message}`,
        );
      }
    }
  }
}
