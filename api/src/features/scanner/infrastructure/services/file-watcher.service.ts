import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import chokidar, { FSWatcher } from 'chokidar';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { LibraryCleanupService } from './scanning/library-cleanup.service';
import { ScannerEventsService } from '../../domain/services/scanner-events.service';
import { LibraryChangeType } from '../../presentation/dtos/scanner-events.dto';
import { stat } from 'fs/promises';

/**
 * FileWatcherService - Monitors changes in music library
 *
 * Functionality:
 * - Automatically detects new/modified/deleted files
 * - Incrementally scans only changed files
 * - Debouncing to avoid scans while files are being copied
 * - Configurable from UI (scanner.auto_watch.enabled) or fallback to AUTO_SCAN env
 *
 * Similar to Navidrome: New albums appear automatically without manual intervention
 */
@Injectable()
export class FileWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileWatcherService.name);
  private watcher?: FSWatcher;
  private pendingFiles = new Set<string>();
  private debounceTimer?: NodeJS.Timeout;
  private readonly DEBOUNCE_MS = 5000; // 5 seconds after last change
  private readonly SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.opus'];

  constructor(
    private readonly configService: ConfigService,
    private readonly bullmq: BullmqService,
    private readonly settingsService: SettingsService,
    private readonly libraryCleanup: LibraryCleanupService,
    private readonly scannerEventsService: ScannerEventsService,
  ) {}

  /**
   * Starts file watcher when module initializes
   */
  async onModuleInit() {
    // Priority: DB setting > ENV fallback (defaults to true)
    const dbEnabled = await this.settingsService.getBoolean('scanner.auto_watch.enabled', true);
    const envEnabled = this.configService.get<string>('AUTO_SCAN', 'true') === 'true';
    const autoScanEnabled = dbEnabled && envEnabled;

    if (!autoScanEnabled) {
      this.logger.log('Auto-scan disabled via settings');
      return;
    }

    // Get music path from DB setting first, then env fallback
    const musicPath = await this.settingsService.getString(
      'library.music.path',
      this.configService.get<string>('UPLOAD_PATH', ''),
    );

    if (!musicPath) {
      this.logger.warn('Music library path not configured, auto-scan disabled');
      return;
    }

    await this.startWatching(musicPath);
  }

  /**
   * Stops file watcher when module destroys
   */
  async onModuleDestroy() {
    await this.stopWatching();
  }

  /**
   * Starts monitoring music folder
   */
  private async startWatching(path: string): Promise<void> {
    try {
      this.logger.log(`Starting file watcher on: ${path}`);

      this.watcher = chokidar.watch(path, {
        ignored: [
          /(^|[\/\\])\../, // Hidden files
          '**/node_modules/**',
          '**/.git/**',
          '**/covers/**', // Ignore covers cache
        ],
        persistent: true,
        ignoreInitial: true, // Don't scan existing files on startup
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Wait 2s for stability
          pollInterval: 100,
        },
        depth: 10, // Maximum 10 levels deep
        usePolling: false, // Use native OS events
        alwaysStat: true, // Get file stats
      });

      // Watcher events
      this.watcher
        .on('add', (filePath) => this.handleFileAdded(filePath))
        .on('change', (filePath) => this.handleFileChanged(filePath))
        .on('unlink', (filePath) => this.handleFileDeleted(filePath))
        .on('error', (error) => this.handleError(error as Error))
        .on('ready', () => this.handleReady(path));

    } catch (error) {
      this.logger.error(`Error starting file watcher:`, error);
    }
  }

  /**
   * Stops file watcher
   */
  private async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.logger.log('Stopping file watcher...');
      await this.watcher.close();
      this.watcher = undefined;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  /**
   * Handles newly detected files
   */
  private handleFileAdded(filePath: string): void {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.debug(`New file detected: ${filePath}`);
    this.addToPendingQueue(filePath);
  }

  /**
   * Handles modified files
   */
  private handleFileChanged(filePath: string): void {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.debug(`File modified: ${filePath}`);
    this.addToPendingQueue(filePath);
  }

  /**
   * Handles deleted files - marks as missing or deletes based on purge mode
   */
  private async handleFileDeleted(filePath: string): Promise<void> {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.log(`👻 File deletion detected: ${filePath}`);

    try {
      // Handle missing file (mark or delete based on settings)
      const result = await this.libraryCleanup.handleMissingFile(filePath);

      if (result.trackMarkedMissing) {
        // Track was marked as missing (not deleted)
        this.scannerEventsService.emitLibraryChange({
          type: LibraryChangeType.TRACK_MISSING,
          trackId: result.trackId,
          trackTitle: result.trackTitle,
          albumId: result.albumId,
          timestamp: new Date().toISOString(),
        });
      } else if (result.trackDeleted) {
        // Track was deleted (purge mode = 'always')
        this.scannerEventsService.emitLibraryChange({
          type: LibraryChangeType.TRACK_DELETED,
          trackId: result.trackId,
          trackTitle: result.trackTitle,
          albumId: result.albumId,
          albumDeleted: result.albumDeleted,
          artistId: result.artistId,
          artistDeleted: result.artistDeleted,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Error handling deleted file ${filePath}:`, error);
    }
  }

  /**
   * Handles watcher errors
   */
  private handleError(error: Error): void {
    this.logger.error(`File watcher error:`, error);
  }

  /**
   * Watcher ready and monitoring
   */
  private handleReady(path: string): void {
    this.logger.log(`File watcher active, monitoring: ${path}`);
    this.logger.log(`Supported extensions: ${this.SUPPORTED_EXTENSIONS.join(', ')}`);
    this.logger.log(`Debounce: ${this.DEBOUNCE_MS / 1000}s after last change`);
  }

  /**
   * Checks if file is supported (by extension)
   */
  private isSupportedFile(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return this.SUPPORTED_EXTENSIONS.some(supported => ext.endsWith(supported));
  }

  /**
   * Adds file to pending queue and schedules scan
   */
  private addToPendingQueue(filePath: string): void {
    this.pendingFiles.add(filePath);

    // Restart debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingFiles();
    }, this.DEBOUNCE_MS);
  }

  /**
   * Processes pending files (after debounce)
   */
  private async processPendingFiles(): Promise<void> {
    if (this.pendingFiles.size === 0) {
      return;
    }

    const files = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    this.logger.log(`Processing ${files.length} detected file(s)...`);

    try {
      // Verify files exist (they could have been deleted)
      const existingFiles: string[] = [];
      for (const file of files) {
        try {
          await stat(file);
          existingFiles.push(file);
        } catch {
          this.logger.debug(`File no longer exists: ${file}`);
        }
      }

      if (existingFiles.length === 0) {
        this.logger.log('No valid files to process');
        return;
      }

      // Add incremental scan job to queue
      await this.bullmq.addJob(
        'scanner',
        'incremental-scan',
        {
          files: existingFiles,
          source: 'file-watcher',
          timestamp: new Date().toISOString(),
        },
      );

      this.logger.log(`${existingFiles.length} file(s) added to scan queue`);
    } catch (error) {
      this.logger.error(`Error processing pending files:`, error);
    }
  }

  /**
   * Gets watcher statistics
   */
  getStats() {
    return {
      active: !!this.watcher,
      pendingFiles: this.pendingFiles.size,
      watchedPath: this.configService.get<string>('UPLOAD_PATH'),
    };
  }

  /**
   * Permite pausar/reanudar el watcher manualmente
   */
  async pause(): Promise<void> {
    await this.stopWatching();
    this.logger.log('⏸️ File watcher pausado');
  }

  async resume(): Promise<void> {
    const musicPath = this.configService.get<string>('UPLOAD_PATH');
    if (musicPath) {
      await this.startWatching(musicPath);
      this.logger.log('▶️ File watcher reanudado');
    }
  }
}
