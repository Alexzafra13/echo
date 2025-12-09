import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { tracks } from '@infrastructure/database/schema';
import { eq, isNull, isNotNull, sql, and } from 'drizzle-orm';
import { LufsAnalyzerService } from './lufs-analyzer.service';
import { ScannerEventsService } from '../../domain/services/scanner-events.service';
import * as os from 'os';

/**
 * Queue names for LUFS analysis processing
 */
const LUFS_QUEUE = 'lufs-analysis-queue';
const LUFS_JOB = 'analyze-track';

/**
 * Auto-detect optimal concurrency based on system resources
 * - Uses half the CPU cores (leave room for other processes)
 * - Minimum 1, maximum 8
 * - Can be overridden with LUFS_CONCURRENCY env var
 */
function getOptimalConcurrency(): number {
  const cpuCores = os.cpus().length;
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);

  // Use half the cores, minimum 1
  let concurrency = Math.max(1, Math.floor(cpuCores / 2));

  // Each FFmpeg process uses ~150MB, limit based on available memory
  // Reserve 1GB for system, use 150MB per worker
  const maxByMemory = Math.max(1, Math.floor((totalMemoryGB - 1) / 0.15));
  concurrency = Math.min(concurrency, maxByMemory);

  // Cap at 8 to avoid overwhelming the system
  return Math.min(concurrency, 8);
}

interface LufsAnalysisJob {
  trackId: string;
  trackTitle: string;
  filePath: string;
}

export interface LufsQueueStats {
  isRunning: boolean;
  pendingTracks: number;
  processedInSession: number;
  currentTrack: string | null;
  startedAt: Date | null;
  estimatedTimeRemaining: string | null;
}

/**
 * LufsAnalysisQueueService
 *
 * Handles background LUFS analysis for tracks without ReplayGain data.
 * Uses BullMQ for reliable job processing with parallel workers.
 *
 * Flow:
 * 1. After scan completes, startLufsAnalysisQueue() is called
 * 2. Service enqueues ALL pending tracks at once
 * 3. BullMQ processes them in parallel (CONCURRENCY workers)
 * 4. Much faster than sequential processing
 */
@Injectable()
export class LufsAnalysisQueueService implements OnModuleInit {
  // Session stats
  private isRunning = false;
  private processedInSession = 0;
  private totalToProcess = 0;
  private sessionStartedAt: Date | null = null;
  private averageProcessingTime = 4000; // FFmpeg analysis ~4 seconds per track
  private readonly concurrency: number;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly bullmq: BullmqService,
    private readonly lufsAnalyzer: LufsAnalyzerService,
    private readonly configService: ConfigService,
    private readonly scannerEventsService: ScannerEventsService,
    @InjectPinoLogger(LufsAnalysisQueueService.name)
    private readonly logger: PinoLogger,
  ) {
    // Read concurrency from env, or auto-detect based on hardware
    const envConcurrency = this.configService.get<number>('LUFS_CONCURRENCY');
    this.concurrency = envConcurrency ?? getOptimalConcurrency();
  }

  async onModuleInit() {
    // Register the job processor with concurrency for parallel processing
    this.bullmq.registerProcessor(
      LUFS_QUEUE,
      async (job) => {
        return this.processLufsJob(job.data as LufsAnalysisJob);
      },
      { concurrency: this.concurrency },
    );

    const cpuCores = os.cpus().length;
    const totalMemoryGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
    this.logger.info(
      `LufsAnalysisQueueService initialized: ${this.concurrency} workers (detected: ${cpuCores} cores, ${totalMemoryGB}GB RAM)`
    );
  }

  /**
   * Start the LUFS analysis queue after a scan completes
   */
  async startLufsAnalysisQueue(): Promise<{ started: boolean; pending: number; message: string }> {
    // Check if FFmpeg is available
    const ffmpegAvailable = await this.lufsAnalyzer.isFFmpegAvailable();
    if (!ffmpegAvailable) {
      return {
        started: false,
        pending: 0,
        message: 'FFmpeg not available. Skipping LUFS analysis.',
      };
    }

    if (this.isRunning) {
      const stats = await this.getQueueStats();
      return {
        started: false,
        pending: stats.pendingTracks,
        message: `LUFS analysis queue already running. ${stats.pendingTracks} tracks pending.`,
      };
    }

    // Get all pending tracks (lufsAnalyzedAt = null means never analyzed)
    const pendingTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        path: tracks.path,
      })
      .from(tracks)
      .where(isNull(tracks.lufsAnalyzedAt));

    if (pendingTracks.length === 0) {
      return {
        started: false,
        pending: 0,
        message: 'No tracks pending LUFS analysis.',
      };
    }

    // Initialize session
    this.isRunning = true;
    this.processedInSession = 0;
    this.totalToProcess = pendingTracks.length;
    this.sessionStartedAt = new Date();

    this.logger.info(
      `🎚️ Starting LUFS analysis queue: ${pendingTracks.length} tracks (${this.concurrency} parallel workers)`
    );

    // Enqueue ALL tracks at once - BullMQ will handle parallelism
    const jobs = pendingTracks.map((track) => ({
      name: LUFS_JOB,
      data: {
        trackId: track.id,
        trackTitle: track.title,
        filePath: track.path,
      } as LufsAnalysisJob,
      opts: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    }));

    // Add jobs in batches to avoid memory issues with large libraries
    const BATCH_SIZE = 500;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((job) =>
          this.bullmq.addJob(LUFS_QUEUE, job.name, job.data, job.opts),
        ),
      );
    }

    const estimatedTime = this.formatDuration(
      (pendingTracks.length / this.concurrency) * this.averageProcessingTime
    );

    // Emit initial progress via SSE
    this.emitProgress();

    return {
      started: true,
      pending: pendingTracks.length,
      message: `LUFS analysis started. Processing ${pendingTracks.length} tracks with ${this.concurrency} workers. ETA: ~${estimatedTime}`,
    };
  }

  /**
   * Stop the LUFS analysis queue
   */
  async stopLufsAnalysisQueue(): Promise<void> {
    this.isRunning = false;
    this.logger.info('⏹️ LUFS analysis queue stopped');
  }

  /**
   * Get current queue statistics
   */
  async getQueueStats(): Promise<LufsQueueStats> {
    const pendingResult = await this.drizzle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tracks)
      .where(isNull(tracks.lufsAnalyzedAt));

    const pendingTracks = pendingResult[0]?.count ?? 0;

    // Calculate estimated time remaining (with parallel processing)
    let estimatedTimeRemaining: string | null = null;
    if (this.isRunning && pendingTracks > 0) {
      const totalMs = (pendingTracks / this.concurrency) * this.averageProcessingTime;
      estimatedTimeRemaining = this.formatDuration(totalMs);
    }

    return {
      isRunning: this.isRunning,
      pendingTracks,
      processedInSession: this.processedInSession,
      currentTrack: null, // With parallel processing, multiple tracks are being processed
      startedAt: this.sessionStartedAt,
      estimatedTimeRemaining,
    };
  }

  /**
   * Process a single LUFS analysis job
   *
   * Logic:
   * - Always set lufsAnalyzedAt to mark as processed (won't retry)
   * - If analysis succeeds: save gain/peak values
   * - If analysis fails: leave gain/peak as null (distinguishable from 0dB real gain)
   */
  private async processLufsJob(job: LufsAnalysisJob): Promise<void> {
    const startTime = Date.now();
    const now = new Date();

    try {
      const result = await this.lufsAnalyzer.analyzeFile(job.filePath);

      if (result) {
        // Success: save track LUFS data + mark as analyzed
        // Note: Album gain/peak will be calculated later in calculateAlbumGains()
        await this.drizzle.db
          .update(tracks)
          .set({
            rgTrackGain: result.trackGain,
            rgTrackPeak: result.trackPeak,
            lufsAnalyzedAt: now,
            updatedAt: now,
          })
          .where(eq(tracks.id, job.trackId));

        this.logger.debug(
          `✅ ${job.trackTitle}: gain=${result.trackGain.toFixed(2)}dB, peak=${result.trackPeak.toFixed(3)}`
        );
      } else {
        // Analysis returned no data: mark as analyzed but leave values null
        // This distinguishes "couldn't analyze" from "0dB real gain"
        await this.drizzle.db
          .update(tracks)
          .set({
            lufsAnalyzedAt: now,
            updatedAt: now,
          })
          .where(eq(tracks.id, job.trackId));

        this.logger.warn(`⚠️ ${job.trackTitle}: analysis failed, marked as analyzed (no gain data)`);
      }

      this.processedInSession++;

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.averageProcessingTime = Math.round(
        (this.averageProcessingTime * 0.9) + (processingTime * 0.1)
      );

      // Emit SSE progress every 10 tracks (or on first track)
      if (this.processedInSession === 1 || this.processedInSession % 10 === 0) {
        this.emitProgress();
      }

      // Log progress every 100 tracks
      if (this.processedInSession % 100 === 0) {
        const stats = await this.getQueueStats();
        this.logger.info(
          `📊 LUFS progress: ${this.processedInSession}/${this.totalToProcess} (${stats.pendingTracks} remaining, ETA: ${stats.estimatedTimeRemaining})`
        );
      }

      // Check if queue is complete
      if (this.processedInSession >= this.totalToProcess) {
        const duration = this.sessionStartedAt
          ? Date.now() - this.sessionStartedAt.getTime()
          : 0;
        this.logger.info(
          `🎉 LUFS track analysis completed! Processed ${this.processedInSession} tracks in ${this.formatDuration(duration)}`
        );

        // Calculate album gains after all tracks are processed
        await this.calculateAlbumGains();
        this.isRunning = false;

        // Emit final progress (completed)
        this.emitProgress();
      }

    } catch (error) {
      this.logger.error(
        `❌ Error analyzing ${job.trackTitle}: ${(error as Error).message}`
      );

      // Mark as analyzed to avoid re-processing on next scan
      // Leave gain/peak null to indicate no data available
      await this.drizzle.db
        .update(tracks)
        .set({
          lufsAnalyzedAt: now,
          updatedAt: now,
        })
        .where(eq(tracks.id, job.trackId));

      this.processedInSession++;
    }
  }

  /**
   * Emit current progress via SSE
   */
  private emitProgress(): void {
    const pendingTracks = this.totalToProcess - this.processedInSession;
    const estimatedTimeRemaining = this.isRunning && pendingTracks > 0
      ? this.formatDuration((pendingTracks / this.concurrency) * this.averageProcessingTime)
      : null;

    this.scannerEventsService.emitLufsProgress({
      isRunning: this.isRunning,
      pendingTracks,
      processedInSession: this.processedInSession,
      estimatedTimeRemaining,
    });
  }

  /**
   * Format milliseconds to human readable duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Calculate album gain/peak values based on all tracks in each album
   *
   * Album gain is the average of all track gains in the album (weighted by track count)
   * Album peak is the maximum peak across all tracks in the album
   *
   * This ensures consistent loudness when playing an album in order,
   * preserving the intended dynamic range between tracks.
   */
  private async calculateAlbumGains(): Promise<void> {
    this.logger.info('📀 Calculating album gains...');

    try {
      // Get aggregated album stats: average gain and max peak per album
      const albumStats = await this.drizzle.db
        .select({
          albumId: tracks.albumId,
          avgGain: sql<number>`AVG(${tracks.rgTrackGain})::real`,
          maxPeak: sql<number>`MAX(${tracks.rgTrackPeak})::real`,
          trackCount: sql<number>`COUNT(*)::int`,
        })
        .from(tracks)
        .where(
          and(
            isNotNull(tracks.albumId),
            isNotNull(tracks.rgTrackGain),
            isNotNull(tracks.rgTrackPeak)
          )
        )
        .groupBy(tracks.albumId);

      if (albumStats.length === 0) {
        this.logger.info('📀 No albums with analyzed tracks found');
        return;
      }

      // Update each album's tracks with the calculated album gain/peak
      let updatedAlbums = 0;
      const now = new Date();

      for (const album of albumStats) {
        if (!album.albumId || album.avgGain === null || album.maxPeak === null) {
          continue;
        }

        await this.drizzle.db
          .update(tracks)
          .set({
            rgAlbumGain: album.avgGain,
            rgAlbumPeak: album.maxPeak,
            updatedAt: now,
          })
          .where(eq(tracks.albumId, album.albumId));

        updatedAlbums++;
      }

      this.logger.info(
        `📀 Album gains calculated! Updated ${updatedAlbums} albums`
      );
    } catch (error) {
      this.logger.error(
        `❌ Error calculating album gains: ${(error as Error).message}`
      );
    }
  }
}
