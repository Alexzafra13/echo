import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  ScanProgressDto,
  ScanErrorDto,
  ScanCompletedDto,
  LufsProgressDto,
  LibraryChangeDto,
} from '../../presentation/dtos/scanner-events.dto';

export type ScannerEventType =
  | 'scan:progress'
  | 'scan:error'
  | 'scan:completed'
  | 'lufs:progress'
  | 'library:change';

export interface ScannerEventData {
  'scan:progress': ScanProgressDto;
  'scan:error': ScanErrorDto;
  'scan:completed': ScanCompletedDto;
  'lufs:progress': LufsProgressDto;
  'library:change': LibraryChangeDto;
}

/**
 * ScannerEventsService - Central event hub for scanner events
 *
 * Replaces the WebSocket gateway with an EventEmitter pattern.
 * SSE endpoints subscribe to these events and forward them to clients.
 *
 * Events:
 * - scan:progress - Scan progress updates
 * - scan:error - Scan errors
 * - scan:completed - Scan completion
 * - lufs:progress - LUFS analysis progress
 * - library:change - File watcher changes
 */
@Injectable()
export class ScannerEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(ScannerEventsService.name);
  private readonly emitter = new EventEmitter();

  // Store latest state for late subscribers
  private latestScanProgress = new Map<string, ScanProgressDto>();
  private latestLufsProgress: LufsProgressDto | null = null;

  constructor() {
    // Increase max listeners for SSE connections
    this.emitter.setMaxListeners(100);
    this.logger.log('ScannerEventsService initialized');
  }

  onModuleDestroy() {
    this.emitter.removeAllListeners();
  }

  /**
   * Subscribe to scanner events
   */
  on<K extends ScannerEventType>(
    event: K,
    listener: (data: ScannerEventData[K]) => void,
  ): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from scanner events
   */
  off<K extends ScannerEventType>(
    event: K,
    listener: (data: ScannerEventData[K]) => void,
  ): void {
    this.emitter.off(event, listener);
  }

  /**
   * Emit scan progress
   */
  emitProgress(data: ScanProgressDto): void {
    this.latestScanProgress.set(data.scanId, data);
    this.emitter.emit('scan:progress', data);
    this.logger.debug(`Emitted progress for scan ${data.scanId}: ${data.progress}%`);
  }

  /**
   * Emit scan error
   */
  emitError(data: ScanErrorDto): void {
    this.emitter.emit('scan:error', data);
    this.logger.warn(`Emitted error for scan ${data.scanId}: ${data.error}`);
  }

  /**
   * Emit scan completed
   */
  emitCompleted(data: ScanCompletedDto): void {
    // Clean up stored progress
    this.latestScanProgress.delete(data.scanId);
    this.emitter.emit('scan:completed', data);
    this.logger.log(`Emitted completed for scan ${data.scanId}`);
  }

  /**
   * Emit LUFS analysis progress
   */
  emitLufsProgress(data: LufsProgressDto): void {
    this.latestLufsProgress = data.isRunning ? data : null;
    this.emitter.emit('lufs:progress', data);
    this.logger.debug(
      `Emitted LUFS progress: ${data.processedInSession}/${data.processedInSession + data.pendingTracks} tracks`,
    );
  }

  /**
   * Emit library change (from file watcher)
   */
  emitLibraryChange(data: LibraryChangeDto): void {
    this.emitter.emit('library:change', data);
    this.logger.log(`Library change: ${data.type} - ${data.trackTitle || data.trackId || 'unknown'}`);
  }

  /**
   * Get current scan progress for late subscribers
   */
  getCurrentScanProgress(scanId: string): ScanProgressDto | null {
    return this.latestScanProgress.get(scanId) || null;
  }

  /**
   * Get current LUFS progress for late subscribers
   */
  getCurrentLufsProgress(): LufsProgressDto | null {
    return this.latestLufsProgress;
  }

  /**
   * Get all active scans progress
   */
  getAllActiveScanProgress(): ScanProgressDto[] {
    return Array.from(this.latestScanProgress.values());
  }
}
