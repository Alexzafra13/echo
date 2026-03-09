import { Injectable, Inject, OnModuleInit, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { IScannerRepository, SCANNER_REPOSITORY } from '../../domain/ports/scanner-repository.port';
import { FileScannerService } from './file-scanner.service';
import { PostScanTasksService } from './post-scan-tasks.service';
import { ScannerGateway } from '../gateways/scanner.gateway';
import { ScanStatus } from '../../presentation/dtos/scanner-events.dto';
import { CachedAlbumRepository } from '@features/albums/infrastructure/persistence/cached-album.repository';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { LogService, LogCategory } from '@features/logs/application/log.service';
import { generateUuid } from '@shared/utils';
import { TrackProcessingService, ScanProgressTracker, LibraryCleanupService } from './scanning';
import * as path from 'path';

// Setting key for music library path
const LIBRARY_PATH_KEY = 'library.music.path';

/** Options for enqueueing a scan job */
interface EnqueueScanOptions {
  path?: string;
  recursive?: boolean;
  pruneDeleted?: boolean;
}

/** Data passed to full scan job processor */
interface ScanJobData {
  scanId: string;
  path: string;
  recursive: boolean;
  pruneDeleted: boolean;
}

/** Data passed to incremental scan job processor */
interface IncrementalScanJobData {
  files: string[];
  source: string;
  timestamp: string;
}

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
/** Signal to control a running scan */
type ScanSignal = 'pause' | 'cancel';

@Injectable()
export class ScanProcessorService implements OnModuleInit {
  private readonly QUEUE_NAME = 'library-scan';
  /** Active scan control signals - checked each iteration of the file loop */
  private readonly scanSignals = new Map<string, ScanSignal>();
  /** Resolve function to wake up a paused scan */
  private readonly pauseResolvers = new Map<string, () => void>();

  constructor(
    @Inject(SCANNER_REPOSITORY)
    private readonly scannerRepository: IScannerRepository,
    private readonly bullmq: BullmqService,
    private readonly fileScanner: FileScannerService,
    @Inject(forwardRef(() => ScannerGateway))
    private readonly scannerGateway: ScannerGateway,
    private readonly cachedAlbumRepository: CachedAlbumRepository,
    private readonly settingsService: SettingsService,
    private readonly logService: LogService,
    private readonly trackProcessing: TrackProcessingService,
    private readonly libraryCleanup: LibraryCleanupService,
    private readonly postScanTasks: PostScanTasksService,
    @InjectPinoLogger(ScanProcessorService.name)
    private readonly logger: PinoLogger
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
      process.env.MUSIC_LIBRARY_PATH || '/music'
    );
  }

  /**
   * Pause a running scan. The file loop will stop at the next iteration.
   */
  async pauseScan(scanId: string): Promise<boolean> {
    const scan = await this.scannerRepository.findById(scanId);
    if (!scan || scan.status !== 'running') return false;

    this.scanSignals.set(scanId, 'pause');
    this.logger.info(`⏸️ Señal de pausa enviada al scan ${scanId}`);
    return true;
  }

  /**
   * Cancel a running or paused scan.
   */
  async cancelScan(scanId: string, reason?: string): Promise<boolean> {
    const scan = await this.scannerRepository.findById(scanId);
    if (!scan || (scan.status !== 'running' && scan.status !== 'paused')) return false;

    this.scanSignals.set(scanId, 'cancel');

    // If paused, wake up the loop so it can exit
    const resolver = this.pauseResolvers.get(scanId);
    if (resolver) {
      resolver();
      this.pauseResolvers.delete(scanId);
    }

    this.logger.info(
      `🛑 Señal de cancelación enviada al scan ${scanId}${reason ? `: ${reason}` : ''}`
    );
    return true;
  }

  /**
   * Resume a paused scan.
   */
  async resumeScan(scanId: string): Promise<boolean> {
    const scan = await this.scannerRepository.findById(scanId);
    if (!scan || scan.status !== 'paused') return false;

    this.scanSignals.delete(scanId);

    // Wake up the paused loop
    const resolver = this.pauseResolvers.get(scanId);
    if (resolver) {
      resolver();
      this.pauseResolvers.delete(scanId);
    }

    await this.scannerRepository.update(scanId, { status: 'running' });
    this.logger.info(`▶️ Scan ${scanId} reanudado`);
    return true;
  }

  /**
   * Check signal and handle pause/cancel. Returns true if scan should stop.
   */
  private async checkSignal(scanId: string, tracker: ScanProgressTracker): Promise<boolean> {
    const signal = this.scanSignals.get(scanId);
    if (!signal) return false;

    if (signal === 'cancel') {
      this.scanSignals.delete(scanId);
      return true; // Caller will handle cancelled state
    }

    if (signal === 'pause') {
      // Update DB status to paused
      await this.scannerRepository.update(scanId, { status: 'paused' });
      this.emitProgress(scanId, tracker, ScanStatus.PAUSED, 'Scan en pausa');

      this.logger.info(
        `⏸️ Scan ${scanId} pausado en archivo ${tracker.filesScanned}/${tracker.totalFiles}`
      );

      // Wait until resumed or cancelled
      await new Promise<void>((resolve) => {
        this.pauseResolvers.set(scanId, resolve);
      });

      // After waking up, check if we were cancelled while paused
      const newSignal = this.scanSignals.get(scanId);
      if (newSignal === 'cancel') {
        this.scanSignals.delete(scanId);
        return true;
      }

      // Resumed
      this.emitProgress(scanId, tracker, ScanStatus.SCANNING, 'Scan reanudado');
      return false;
    }

    return false;
  }

  /**
   * Queue a new scan job
   */
  async enqueueScan(scanId: string, options?: EnqueueScanOptions): Promise<void> {
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
      }
    );
  }

  /**
   * Process a full library scan
   */
  private async processScanning(data: ScanJobData): Promise<void> {
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
      await this.scannerRepository.update(scanId, { status: 'running' });

      // Get last scan timestamp for incremental scanning
      const lastScanTime = await this.getLastScanTime();
      if (lastScanTime) {
        this.logger.info(
          `⚡ Scan incremental: solo archivos modificados desde ${lastScanTime.toISOString()}`
        );
      } else {
        this.logger.info(`📁 Scan completo: primera vez o sin scans previos`);
      }

      // Emit: scan started
      this.emitProgress(scanId, tracker, ScanStatus.SCANNING, 'Buscando archivos...');

      // Scan directory
      const files = await this.fileScanner.scanDirectory(scanPath, recursive);
      tracker.totalFiles = files.length;
      this.logger.info(`📁 Encontrados ${files.length} archivos de música`);

      this.emitProgress(
        scanId,
        tracker,
        ScanStatus.SCANNING,
        `Encontrados ${files.length} archivos`
      );

      // Process each file
      let tracksAdded = 0;
      let tracksUpdated = 0;
      let tracksDeleted = 0;
      let wasCancelled = false;

      for (const filePath of files) {
        // Check for pause/cancel signals
        const shouldStop = await this.checkSignal(scanId, tracker);
        if (shouldStop) {
          wasCancelled = true;
          break;
        }

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

      // Handle cancellation
      if (wasCancelled) {
        await this.scannerRepository.update(scanId, {
          status: 'cancelled',
          finishedAt: new Date(),
          tracksAdded,
          tracksUpdated,
          tracksDeleted: 0,
          errorMessage: `Scan cancelado por el usuario en archivo ${tracker.filesScanned}/${tracker.totalFiles}`,
        });

        this.scannerGateway.emitProgress({
          scanId,
          status: ScanStatus.CANCELLED,
          progress: tracker.progress,
          filesScanned: tracker.filesScanned,
          totalFiles: tracker.totalFiles,
          tracksCreated: tracker.tracksCreated,
          albumsCreated: tracker.albumsCreated,
          artistsCreated: tracker.artistsCreated,
          coversExtracted: tracker.coversExtracted,
          errors: tracker.errors,
          message: 'Scan cancelado',
        });

        // Clean up signals
        this.scanSignals.delete(scanId);
        this.pauseResolvers.delete(scanId);

        await this.logService.info(LogCategory.SCANNER, `Scan cancelado: ${scanId}`, {
          entityId: scanId,
          entityType: 'scan',
          details: JSON.stringify({
            filesProcessed: tracker.filesScanned,
            totalFiles: tracker.totalFiles,
            tracksAdded,
            tracksUpdated,
          }),
        });

        this.logger.info(
          `🛑 Scan ${scanId} cancelado: ${tracker.filesScanned}/${tracker.totalFiles} archivos procesados`
        );
        return;
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
      });

      const duration = Date.now() - startTime;

      // Invalidate cache
      await this.cachedAlbumRepository.invalidateListCaches();

      // Post-scan tasks
      await this.postScanTasks.runAll();

      await this.logService.info(LogCategory.SCANNER, `Scan completado exitosamente: ${scanId}`, {
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
      });

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
        `✅ Escaneo completado: +${tracksAdded} ~${tracksUpdated} -${tracksDeleted} ⏭️${tracker.tracksSkipped} saltados`
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
        error as Error
      );

      await this.scannerRepository.update(scanId, {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: (error as Error).message || 'Error desconocido',
      });

      throw error;
    }
  }

  /**
   * Get last completed scan timestamp
   */
  private async getLastScanTime(): Promise<Date | null> {
    return this.scannerRepository.getLastCompletedScanTime();
  }

  /**
   * Emit scan progress via WebSocket
   */
  private emitProgress(
    scanId: string,
    tracker: ScanProgressTracker,
    status: ScanStatus,
    message: string,
    currentFile?: string
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
  private async processIncrementalScan(data: IncrementalScanJobData): Promise<void> {
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
      await this.postScanTasks.runAll();

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
}
