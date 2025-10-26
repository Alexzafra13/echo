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
        errorMessage: error.message || 'Error desconocido',
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
        mbzArtistId: metadata.musicBrainzArtistId,
        mbzAlbumArtistId: metadata.musicBrainzAlbumArtistId,
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
}
