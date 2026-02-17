import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import chokidar, { FSWatcher } from 'chokidar';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { LibraryCleanupService } from './scanning/library-cleanup.service';
import { ScannerGateway } from '../gateways/scanner.gateway';
import { LibraryChangeType } from '../../presentation/dtos/scanner-events.dto';
import { stat } from 'fs/promises';

// Vigila cambios en la librería musical y dispara scans incrementales con debounce
@Injectable()
export class FileWatcherService implements OnModuleInit, OnModuleDestroy {
  private watcher?: FSWatcher;
  private pendingFiles = new Set<string>();
  private debounceTimer?: NodeJS.Timeout;
  private readonly DEBOUNCE_MS = 5000; // 5 seconds after last change
  private readonly SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.opus'];

  constructor(
    @InjectPinoLogger(FileWatcherService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
    private readonly bullmq: BullmqService,
    private readonly settingsService: SettingsService,
    private readonly libraryCleanup: LibraryCleanupService,
    private readonly scannerGateway: ScannerGateway,
  ) {}

  async onModuleInit() {
    // Prioridad: setting en BD > variable de entorno
    const dbEnabled = await this.settingsService.getBoolean('scanner.auto_watch.enabled', true);
    const envEnabled = this.configService.get<string>('AUTO_SCAN', 'true') === 'true';
    const autoScanEnabled = dbEnabled && envEnabled;

    if (!autoScanEnabled) {
      this.logger.info('Auto-scan disabled via settings');
      return;
    }

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

  async onModuleDestroy() {
    await this.stopWatching();
  }

  private async startWatching(path: string): Promise<void> {
    try {
      this.logger.info(`Starting file watcher on: ${path}`);

      this.watcher = chokidar.watch(path, {
        ignored: [
          /(^|[\/\\])\../,
          '**/node_modules/**',
          '**/.git/**',
          '**/covers/**',
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100,
        },
        depth: 10,
        usePolling: false,
        alwaysStat: true,
      });

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

  private async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.logger.info('Stopping file watcher...');
      await this.watcher.close();
      this.watcher = undefined;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private handleFileAdded(filePath: string): void {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.debug(`New file detected: ${filePath}`);
    this.addToPendingQueue(filePath);
  }

  private handleFileChanged(filePath: string): void {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.debug(`File modified: ${filePath}`);
    this.addToPendingQueue(filePath);
  }

  private async handleFileDeleted(filePath: string): Promise<void> {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.info(`👻 File deletion detected: ${filePath}`);

    try {
      const result = await this.libraryCleanup.handleMissingFile(filePath);

      if (result.trackMarkedMissing) {
        this.scannerGateway.emitLibraryChange({
          type: LibraryChangeType.TRACK_MISSING,
          trackId: result.trackId,
          trackTitle: result.trackTitle,
          albumId: result.albumId,
          timestamp: new Date().toISOString(),
        });
      } else if (result.trackDeleted) {
        this.scannerGateway.emitLibraryChange({
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

  private handleError(error: Error): void {
    this.logger.error(`File watcher error:`, error);
  }

  private handleReady(path: string): void {
    this.logger.info(`File watcher active, monitoring: ${path}`);
    this.logger.info(`Supported extensions: ${this.SUPPORTED_EXTENSIONS.join(', ')}`);
    this.logger.info(`Debounce: ${this.DEBOUNCE_MS / 1000}s after last change`);
  }

  private isSupportedFile(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return this.SUPPORTED_EXTENSIONS.some(supported => ext.endsWith(supported));
  }

  private addToPendingQueue(filePath: string): void {
    this.pendingFiles.add(filePath);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingFiles();
    }, this.DEBOUNCE_MS);
  }

  private async processPendingFiles(): Promise<void> {
    if (this.pendingFiles.size === 0) {
      return;
    }

    const files = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    this.logger.info(`Processing ${files.length} detected file(s)...`);

    try {
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
        this.logger.info('No valid files to process');
        return;
      }

      await this.bullmq.addJob(
        'scanner',
        'incremental-scan',
        {
          files: existingFiles,
          source: 'file-watcher',
          timestamp: new Date().toISOString(),
        },
      );

      this.logger.info(`${existingFiles.length} file(s) added to scan queue`);
    } catch (error) {
      this.logger.error(`Error processing pending files:`, error);
    }
  }

  getStats() {
    return {
      active: !!this.watcher,
      pendingFiles: this.pendingFiles.size,
      watchedPath: this.configService.get<string>('UPLOAD_PATH'),
    };
  }

  async pause(): Promise<void> {
    await this.stopWatching();
    this.logger.info('⏸️ File watcher pausado');
  }

  async resume(): Promise<void> {
    const musicPath = this.configService.get<string>('UPLOAD_PATH');
    if (musicPath) {
      await this.startWatching(musicPath);
      this.logger.info('▶️ File watcher reanudado');
    }
  }
}
