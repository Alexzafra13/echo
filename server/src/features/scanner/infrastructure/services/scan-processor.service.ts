import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../domain/ports/scanner-repository.port';
import { FileScannerService } from './file-scanner.service';
import { MetadataExtractorService } from './metadata-extractor.service';
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
  ) {}

  onModuleInit() {
    // Registrar procesador de jobs
    this.bullmq.registerProcessor(this.QUEUE_NAME, async (job) => {
      return await this.processScanning(job.data);
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

    console.log(`📁 Iniciando escaneo ${scanId} en ${scanPath}`);

    try {
      // 1. Actualizar estado a "running"
      await this.scannerRepository.update(scanId, {
        status: 'running',
      } as any);

      // 2. Escanear archivos
      const files = await this.fileScanner.scanDirectory(scanPath, recursive);
      console.log(`📁 Encontrados ${files.length} archivos de música`);

      // 3. Procesar cada archivo
      let tracksAdded = 0;
      let tracksUpdated = 0;
      let tracksDeleted = 0;

      for (const filePath of files) {
        const result = await this.processFile(filePath);
        if (result === 'added') tracksAdded++;
        if (result === 'updated') tracksUpdated++;
      }

      // 4. Si pruneDeleted está activado, eliminar tracks que ya no existen
      if (pruneDeleted) {
        tracksDeleted = await this.pruneDeletedTracks(files);
      }

      // 4.5 Agregar/Actualizar álbumes y artistas basados en los tracks
      console.log(`📊 Agregando álbumes y artistas...`);
      await this.aggregateAlbumsAndArtists();

      // 5. Actualizar escaneo como completado
      await this.scannerRepository.update(scanId, {
        status: 'completed',
        finishedAt: new Date(),
        tracksAdded,
        tracksUpdated,
        tracksDeleted,
      } as any);

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
  private async aggregateAlbumsAndArtists(): Promise<void> {
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
        await this.prisma.artist.upsert({
          where: { name: artistName },
          create: {
            name: artistName,
            mbzArtistId: artistData.mbzArtistId,
            albumCount: artistData.albums.size,
            songCount: artistData.songCount,
            size: artistData.size,
          },
          update: {
            albumCount: artistData.albums.size,
            songCount: artistData.songCount,
            size: artistData.size,
          },
        });
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
            hasCoverArt: track.hasCoverArt,
            coverArtPath: track.hasCoverArt ? track.path : null,
          });
        }

        const album = albumsMap.get(albumKey)!;
        album.songCount++;
        album.duration += track.duration || 0;
        album.size += track.size || BigInt(0);
      }

      // 5. Crear/actualizar álbumes
      for (const [albumKey, albumData] of albumsMap) {
        // Buscar el artista
        const artist = await this.prisma.artist.findUnique({
          where: { name: albumData.artistName },
        });

        if (!artist) {
          console.warn(`⚠️ Artista no encontrado para álbum: ${albumData.name}`);
          continue;
        }

        // Buscar si el álbum ya existe
        const existingAlbum = await this.prisma.album.findFirst({
          where: {
            name: albumData.name,
            artistId: artist.id,
          },
        });

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
              coverArtPath: albumData.coverArtPath,
            },
          });
        } else {
          // Crear nuevo álbum
          await this.prisma.album.create({
            data: {
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
              coverArtPath: albumData.coverArtPath,
            },
          });
        }
      }

      console.log(`✅ Agregados/actualizados ${artistsMap.size} artistas y ${albumsMap.size} álbumes`);
    } catch (error) {
      console.error('❌ Error agregando álbumes y artistas:', error);
    }
  }
}
