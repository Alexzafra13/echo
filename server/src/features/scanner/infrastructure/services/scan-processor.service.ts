import { Injectable, Inject, OnModuleInit, forwardRef } from '@nestjs/common';
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
          const result = await this.processFile(filePath);
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

      // 4.5 Agregar/Actualizar álbumes y artistas basados en los tracks
      console.log(`📊 Agregando álbumes y artistas...`);
      this.emitProgress(scanId, tracker, ScanStatus.AGGREGATING, 'Agregando álbumes y artistas...');

      const { albumsCount, artistsCount } = await this.aggregateAlbumsAndArtists(scanId, tracker);
      tracker.albumsCreated = albumsCount;
      tracker.artistsCreated = artistsCount;

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
   * Procesa un archivo individual
   */
  private async processFile(
    filePath: string,
  ): Promise<'added' | 'updated' | 'skipped'> {
    try {
      // 1. Verificar si el track ya existe en la BD
      const existingTrack = await this.prisma.track.findUnique({
        where: { path: filePath },
      });

      // 2. Extraer metadatos
      const metadata = await this.metadataExtractor.extractMetadata(filePath);
      if (!metadata) {
        console.warn(`⚠️  No se pudieron extraer metadatos de ${filePath}`);
        return 'skipped';
      }

      // 3. Obtener tamaño del archivo
      const stats = await this.fileScanner.getFileStats(filePath);
      const size = stats ? stats.size : 0;

      // 4. Preparar datos del track
      const trackData = {
        title: metadata.title || path.basename(filePath, path.extname(filePath)),
        artistName: metadata.artist || 'Unknown Artist',
        albumName: metadata.album || 'Unknown Album',
        albumArtistName: metadata.albumArtist || metadata.artist || 'Unknown Artist',
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
        comment: metadata.comment,
        lyrics: metadata.lyrics,
        mbzTrackId: metadata.musicBrainzTrackId,
        mbzAlbumId: metadata.musicBrainzAlbumId,
        // MusicBrainz IDs can be arrays, but Prisma expects a single string
        mbzArtistId: Array.isArray(metadata.musicBrainzArtistId)
          ? metadata.musicBrainzArtistId[0]
          : metadata.musicBrainzArtistId,
        mbzAlbumArtistId: Array.isArray(metadata.musicBrainzAlbumArtistId)
          ? metadata.musicBrainzAlbumArtistId[0]
          : metadata.musicBrainzAlbumArtistId,
      };

      // 5. Si existe, actualizar; si no, crear
      if (existingTrack) {
        await this.prisma.track.update({
          where: { id: existingTrack.id },
          data: trackData,
        });
        return 'updated';
      } else {
        await this.prisma.track.create({
          data: trackData,
        });
        return 'added';
      }
    } catch (error) {
      console.error(`❌ Error procesando ${filePath}:`, error);
      return 'skipped';
    }
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
      }

      return tracksToDelete.length;
    } catch (error) {
      console.error('Error eliminando tracks obsoletos:', error);
      return 0;
    }
  }

  /**
   * Agrega álbumes y artistas basados en los tracks escaneados
   */
  private async aggregateAlbumsAndArtists(
    scanId: string,
    tracker: ScanProgress,
  ): Promise<{ albumsCount: number; artistsCount: number }> {
    try {
      // 1. Obtener todos los tracks agrupados
      const tracks = await this.prisma.track.findMany({
        select: {
          artistName: true,
          albumArtistName: true,
          albumName: true,
          duration: true,
          size: true,
          year: true,
          compilation: true,
          hasCoverArt: true,
          path: true,
          mbzArtistId: true,
          mbzAlbumArtistId: true,
          mbzAlbumId: true,
        },
      });

      // 2. Agrupar por artista
      const artistsMap = new Map<string, any>();
      for (const track of tracks) {
        const artistName = track.artistName || 'Unknown Artist';
        if (!artistsMap.has(artistName)) {
          artistsMap.set(artistName, {
            name: artistName,
            mbzArtistId: track.mbzArtistId,
            albumCount: 0,
            songCount: 0,
            size: BigInt(0),
            albums: new Set<string>(),
          });
        }
        const artist = artistsMap.get(artistName)!;
        artist.songCount++;
        artist.size += track.size || BigInt(0);
        artist.albums.add(track.albumName || 'Unknown Album');
      }

      // 3. Crear/actualizar artistas
      for (const [artistName, artistData] of artistsMap) {
        const existingArtist = await this.prisma.artist.findFirst({
          where: { name: artistName },
        });

        if (existingArtist) {
          await this.prisma.artist.update({
            where: { id: existingArtist.id },
            data: {
              albumCount: artistData.albums.size,
              songCount: artistData.songCount,
              size: artistData.size,
            },
          });
        } else {
          await this.prisma.artist.create({
            data: {
              name: artistName,
              mbzArtistId: artistData.mbzArtistId,
              albumCount: artistData.albums.size,
              songCount: artistData.songCount,
              size: artistData.size,
            },
          });
        }
      }

      // 4. Agrupar por álbum
      const albumsMap = new Map<string, any>();
      for (const track of tracks) {
        const albumName = track.albumName || 'Unknown Album';
        const albumArtistName = track.albumArtistName || track.artistName || 'Unknown Artist';
        const albumKey = `${albumName}|${albumArtistName}`;

        if (!albumsMap.has(albumKey)) {
          albumsMap.set(albumKey, {
            name: albumName,
            artistName: albumArtistName,
            mbzAlbumId: track.mbzAlbumId,
            mbzAlbumArtistId: track.mbzAlbumArtistId,
            songCount: 0,
            duration: 0,
            size: BigInt(0),
            year: track.year,
            compilation: track.compilation,
            firstTrackPath: track.path, // Guardar primer track para extraer cover
          });
        }

        const album = albumsMap.get(albumKey)!;
        album.songCount++;
        album.duration += track.duration || 0;
        album.size += track.size || BigInt(0);
      }

      // 5. Crear/actualizar álbumes
      for (const [albumKey, albumData] of albumsMap) {
        // Buscar o crear el artista
        let artist = await this.prisma.artist.findFirst({
          where: { name: albumData.artistName },
        });

        if (!artist) {
          // El artista no existe, crearlo
          console.log(`🎤 Creando artista para álbum: ${albumData.artistName}`);
          artist = await this.prisma.artist.create({
            data: {
              name: albumData.artistName,
              mbzArtistId: albumData.mbzAlbumArtistId,
              albumCount: 0, // Se actualizará después
              songCount: 0,
              size: BigInt(0),
            },
          });
        }

        // Buscar si el álbum ya existe
        const existingAlbum = await this.prisma.album.findFirst({
          where: {
            name: albumData.name,
            artistId: artist.id,
          },
        });

        // Determinar el ID del álbum (existente o nuevo)
        const albumId = existingAlbum?.id || generateUuid();

        // Extraer y cachear cover art
        this.emitProgress(scanId, tracker, ScanStatus.EXTRACTING_COVERS, `Extrayendo cover de ${albumData.name}`);
        const coverPath = await this.coverArtService.extractAndCacheCover(
          existingAlbum?.id || albumId,
          albumData.firstTrackPath,
        );

        if (coverPath) {
          tracker.coversExtracted++;
        }

        if (existingAlbum) {
          // Actualizar álbum existente
          await this.prisma.album.update({
            where: { id: existingAlbum.id },
            data: {
              songCount: albumData.songCount,
              duration: albumData.duration,
              size: albumData.size,
              year: albumData.year,
              compilation: albumData.compilation,
              coverArtPath: coverPath || existingAlbum.coverArtPath,
            },
          });
        } else {
          // Crear nuevo álbum
          await this.prisma.album.create({
            data: {
              id: albumId,
              name: albumData.name,
              artistId: artist.id,
              albumArtistId: artist.id,
              mbzAlbumId: albumData.mbzAlbumId,
              mbzAlbumArtistId: albumData.mbzAlbumArtistId,
              songCount: albumData.songCount,
              duration: albumData.duration,
              size: albumData.size,
              year: albumData.year,
              compilation: albumData.compilation,
              coverArtPath: coverPath,
            },
          });
        }
      }

      // 6. CRÍTICO: Vincular tracks con sus álbumes y artistas
      console.log('🔗 Vinculando tracks con álbumes y artistas...');
      let tracksLinked = 0;

      for (const [albumKey, albumData] of albumsMap) {
        // Buscar el álbum que acabamos de crear/actualizar
        const artist = await this.prisma.artist.findFirst({
          where: { name: albumData.artistName },
        });

        if (!artist) continue;

        const album = await this.prisma.album.findFirst({
          where: {
            name: albumData.name,
            artistId: artist.id,
          },
        });

        if (!album) continue;

        // Actualizar todas las tracks que coincidan con este álbum
        // Removemos la condición albumId: null para actualizar TODAS las tracks,
        // incluso las que ya estaban vinculadas (por si cambiaron de álbum/artista)
        const result = await this.prisma.track.updateMany({
          where: {
            albumName: albumData.name,
            OR: [
              { albumArtistName: albumData.artistName },
              { artistName: albumData.artistName },
            ],
          },
          data: {
            albumId: album.id,
            artistId: artist.id,
            albumArtistId: artist.id,
          },
        });

        tracksLinked += result.count;
      }

      console.log(`✅ Agregados/actualizados ${artistsMap.size} artistas y ${albumsMap.size} álbumes`);
      console.log(`🔗 Vinculadas ${tracksLinked} tracks con sus álbumes`);
      return { albumsCount: albumsMap.size, artistsCount: artistsMap.size };
    } catch (error) {
      console.error('❌ Error agregando álbumes y artistas:', error);
      return { albumsCount: 0, artistsCount: 0 };
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

          const result = await this.processFile(filePath);

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

      // Agregar álbumes y artistas
      this.emitProgress(
        scanId,
        tracker,
        ScanStatus.AGGREGATING,
        'Agregando álbumes y artistas...',
      );

      const { albumsCount, artistsCount } = await this.aggregateAlbumsAndArtists(scanId, tracker);
      tracker.albumsCreated = albumsCount;
      tracker.artistsCreated = artistsCount;

      // Invalidar caché para que los nuevos álbumes aparezcan inmediatamente
      await this.cachedAlbumRepository.invalidateListCaches();

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
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
