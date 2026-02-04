import { Injectable, Inject, OnModuleInit, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq, desc } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { libraryScans } from '@infrastructure/database/schema';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import {
  IScannerRepository,
  SCANNER_REPOSITORY,
} from '../../domain/ports/scanner-repository.port';
import { FileScannerService } from './file-scanner.service';
import { LufsAnalysisQueueService } from './lufs-analysis-queue.service';
import { ScannerGateway } from '../gateways/scanner.gateway';
import { ScanStatus } from '../../presentation/dtos/scanner-events.dto';
import { CachedAlbumRepository } from '@features/albums/infrastructure/persistence/cached-album.repository';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { EnrichmentQueueService } from '@features/external-metadata/infrastructure/services/enrichment-queue.service';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { generateUuid } from '@shared/utils';
import {
  TrackProcessingService,
  ScanProgressTracker,
  LibraryCleanupService,
} from './scanning';
import * as path from 'path';

// Setting key for music library path
const LIBRARY_PATH_KEY = 'library.music.path';

/**
 * ScanProcessorService - Orchestrates library scanning
 *
 * This service coordinates the scanning workflow:
 * - Queues scan jobs via BullMQ
 * - Processes scans using specialized services
 * - Reports progress via WebSocket
 * - Triggers post-scan tasks (enrichment, LUFS analysis)
 *
 * Delegates to specialized services:
 * - TrackProcessingService: File processing and entity creation
 * - LibraryCleanupService: Cleanup of deleted files
 */
@Injectable()
export class ScanProcessorService implements OnModuleInit {
  private readonly QUEUE_NAME = 'library-scan';

  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
    private readonly drizzle: DrizzleService,
    private readonly bullmq: BullmqService,
    private readonly fileScanner: FileScannerService,
    private readonly lufsAnalysisQueue: LufsAnalysisQueueService,
    @Inject(forwardRef(() => ScannerGateway))
    private readonly scannerGateway: ScannerGateway,
    private readonly cachedAlbumRepository: CachedAlbumRepository,
    private readonly settingsService: SettingsService,
    private readonly enrichmentQueueService: EnrichmentQueueService,
    private readonly logService: LogService,
    private readonly trackProcessing: TrackProcessingService,
    private readonly libraryCleanup: LibraryCleanupService,
    @InjectPinoLogger(ScanProcessorService.name)
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    // Register processor for full scan
    this.bullmq.registerProcessor(this.QUEUE_NAME, async (job) => {
      return await this.processScanning(job.data);
    });

    // Register processor for incremental scan (file watcher)
    this.bullmq.registerProcessor('scanner', async (job) => {
      if (job.name === 'incremental-scan') {
        return await this.processIncrementalScan(job.data);
      }
      return null;
    });
  }

  /**
   * Get music library path from settings
   */
  private async getMusicLibraryPath(): Promise<string> {
    return this.settingsService.getString(
      LIBRARY_PATH_KEY,
      process.env.MUSIC_LIBRARY_PATH || '/music',
    );
  }

  /**
   * Queue a new scan job
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
   * Process a full library scan
   */
  private async processScanning(data: any): Promise<void> {
    const { scanId, path: scanPath, recursive, pruneDeleted } = data;
    const startTime = Date.now();
    const tracker = new ScanProgressTracker();

    this.logger.info(`📁 Iniciando escaneo ${scanId} en ${scanPath}`);

    await this.logService.info(LogCategory.SCANNER, `Scan iniciado: ${scanId}`, {
      entityId: scanId,
      entityType: 'scan',
      details: JSON.stringify({ scanPath, recursive, pruneDeleted }),
    });

    try {
      // Update status to running
      await this.scannerRepository.update(scanId, { status: 'running' } as any);

      // Get last scan timestamp for incremental scanning
      const lastScanTime = await this.getLastScanTime();
      if (lastScanTime) {
        this.logger.info(`⚡ Scan incremental: solo archivos modificados desde ${lastScanTime.toISOString()}`);
      } else {
        this.logger.info(`📁 Scan completo: primera vez o sin scans previos`);
      }

      // Emit: scan started
      this.emitProgress(scanId, tracker, ScanStatus.SCANNING, 'Buscando archivos...');

      // Scan directory
      const files = await this.fileScanner.scanDirectory(scanPath, recursive);
      tracker.totalFiles = files.length;
      this.logger.info(`📁 Encontrados ${files.length} archivos de música`);

      this.emitProgress(scanId, tracker, ScanStatus.SCANNING, `Encontrados ${files.length} archivos`);

      // Process each file
      let tracksAdded = 0;
      let tracksUpdated = 0;
      let tracksDeleted = 0;

      for (const filePath of files) {
        try {
          const result = await this.trackProcessing.processFile(filePath, tracker, lastScanTime);
          if (result === 'added') {
            tracksAdded++;
            tracker.tracksCreated++;
          }
          if (result === 'updated') tracksUpdated++;
          if (result === 'skipped') tracker.tracksSkipped++;

          tracker.filesScanned++;

          // Emit progress every 10 files
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

      // Prune deleted tracks
      if (pruneDeleted) {
        this.emitProgress(scanId, tracker, ScanStatus.SCANNING, 'Eliminando archivos borrados...');
        tracksDeleted = await this.libraryCleanup.pruneDeletedTracks(files);
      }

      this.logger.info(`✅ Álbumes y artistas ya procesados durante el escaneo`);

      // Update scan as completed
      await this.scannerRepository.update(scanId, {
        status: 'completed',
        finishedAt: new Date(),
        tracksAdded,
        tracksUpdated,
        tracksDeleted,
      } as any);

      const duration = Date.now() - startTime;

      // Invalidate cache
      await this.cachedAlbumRepository.invalidateListCaches();

      // Post-scan tasks
      await this.performAutoEnrichment(tracker.artistsCreated, tracker.albumsCreated);
      await this.startLufsAnalysis();

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
            tracksSkipped: tracker.tracksSkipped,
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

      // Emit: completed
      this.scannerGateway.emitCompleted({
        scanId,
        totalFiles: tracker.totalFiles,
        tracksCreated: tracker.tracksCreated,
        tracksSkipped: tracker.tracksSkipped,
        albumsCreated: tracker.albumsCreated,
        artistsCreated: tracker.artistsCreated,
        coversExtracted: tracker.coversExtracted,
        errors: tracker.errors,
        duration,
        timestamp: new Date().toISOString(),
      });

      this.logger.info(
        `✅ Escaneo completado: +${tracksAdded} ~${tracksUpdated} -${tracksDeleted} ⏭️${tracker.tracksSkipped} saltados`,
      );
    } catch (error) {
      this.logger.error(`❌ Error en escaneo ${scanId}:`, error);

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

      await this.scannerRepository.update(scanId, {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: (error as Error).message || 'Error desconocido',
      } as any);

      throw error;
    }
  }

  /**
   * Get last completed scan timestamp
   */
  private async getLastScanTime(): Promise<Date | null> {
    const lastCompletedScan = await this.drizzle.db
      .select({ finishedAt: libraryScans.finishedAt })
      .from(libraryScans)
      .where(eq(libraryScans.status, 'completed'))
      .orderBy(desc(libraryScans.finishedAt))
      .limit(1);

    return lastCompletedScan[0]?.finishedAt ?? null;
  }

  /**
   * Emit scan progress via WebSocket
   */
  private emitProgress(
    scanId: string,
    tracker: ScanProgressTracker,
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
   * Process incremental scan from file watcher
   */
  private async processIncrementalScan(data: any): Promise<void> {
    const { files, source, timestamp } = data;
    const scanId = generateUuid();

    this.logger.info(`🔍 Iniciando scan incremental de ${files.length} archivo(s)...`);
    this.logger.info(`📁 Fuente: ${source} | Timestamp: ${timestamp}`);

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

    const tracker = new ScanProgressTracker();
    tracker.totalFiles = files.length;

    try {
      for (const filePath of files) {
        try {
          this.logger.info(`🎵 Procesando: ${path.basename(filePath)}`);

          const result = await this.trackProcessing.processFile(filePath, tracker);

          if (result === 'added') {
            tracker.tracksCreated++;
          } else if (result === 'skipped') {
            tracker.errors++;
          }

          tracker.filesScanned++;

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

      // Invalidate cache
      await this.cachedAlbumRepository.invalidateListCaches();

      // Post-scan tasks
      await this.performAutoEnrichment(tracker.artistsCreated, tracker.albumsCreated);
      await this.startLufsAnalysis();

      // Emit: completed
      this.scannerGateway.emitCompleted({
        scanId,
        totalFiles: tracker.totalFiles,
        tracksCreated: tracker.tracksCreated,
        albumsCreated: tracker.albumsCreated,
        artistsCreated: tracker.artistsCreated,
        coversExtracted: tracker.coversExtracted,
        errors: tracker.errors,
        duration: 0,
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
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Trigger auto-enrichment after scan
   */
  private async performAutoEnrichment(
    artistsCreated: number,
    albumsCreated: number,
  ): Promise<void> {
    try {
      const autoEnrichEnabled = await this.settingsService.getBoolean(
        'metadata.auto_enrich.enabled',
        true,
      );

      if (!autoEnrichEnabled) {
        this.logger.info('Auto-enriquecimiento deshabilitado en configuración');
        return;
      }

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
    }
  }

  /**
   * Trigger LUFS analysis after scan
   */
  private async startLufsAnalysis(): Promise<void> {
    try {
      const lufsAnalysisEnabled = await this.settingsService.getBoolean(
        'lufs.auto_analysis.enabled',
        true, // Enabled by default
      );

      if (!lufsAnalysisEnabled) {
        this.logger.info('🎚️ Análisis LUFS deshabilitado en configuración');
        return;
      }

      const result = await this.lufsAnalysisQueue.startLufsAnalysisQueue();

      if (result.started) {
        this.logger.info(
          `🎚️ Cola de análisis LUFS iniciada: ${result.pending} tracks pendientes`
        );
      } else if (result.pending > 0) {
        this.logger.info(`ℹ️ ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Error al iniciar cola de análisis LUFS: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

}
