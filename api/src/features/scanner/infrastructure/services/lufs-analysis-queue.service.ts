import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { tracks } from '@infrastructure/database/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { LufsAnalyzerService } from './lufs-analyzer.service';

/**
 * Queue names for LUFS analysis processing
 */
const LUFS_QUEUE = 'lufs-analysis-queue';
const LUFS_JOB = 'analyze-track';

// Default concurrency - conservative for home servers
// Can be overridden with LUFS_CONCURRENCY env var
const DEFAULT_CONCURRENCY = 2;

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
    @InjectPinoLogger(LufsAnalysisQueueService.name)
    private readonly logger: PinoLogger,
  ) {
    // Read concurrency from env, default to 2 for home servers
    // LUFS_CONCURRENCY=1 for Raspberry Pi / low-end NAS
    // LUFS_CONCURRENCY=4 for powerful servers
    this.concurrency = this.configService.get<number>('LUFS_CONCURRENCY', DEFAULT_CONCURRENCY);
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

    this.logger.info(`LufsAnalysisQueueService initialized (concurrency: ${this.concurrency})`);
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

    // Get all pending tracks
    const pendingTracks = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        path: tracks.path,
      })
      .from(tracks)
      .where(isNull(tracks.rgTrackGain));

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
      .where(isNull(tracks.rgTrackGain));

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
   */
  private async processLufsJob(job: LufsAnalysisJob): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await this.lufsAnalyzer.analyzeFile(job.filePath);

      if (result) {
        // Update track with LUFS data
        await this.drizzle.db
          .update(tracks)
          .set({
            rgTrackGain: result.trackGain,
            rgTrackPeak: result.trackPeak,
            rgAlbumGain: result.trackGain,
            rgAlbumPeak: result.trackPeak,
            updatedAt: new Date(),
          })
          .where(eq(tracks.id, job.trackId));

        this.logger.debug(
          `✅ ${job.trackTitle}: gain=${result.trackGain.toFixed(2)}dB, peak=${result.trackPeak.toFixed(3)}`
        );
      } else {
        // Set to 0 to mark as "analyzed but no data"
        await this.drizzle.db
          .update(tracks)
          .set({
            rgTrackGain: 0,
            rgTrackPeak: 1,
            rgAlbumGain: 0,
            rgAlbumPeak: 1,
            updatedAt: new Date(),
          })
          .where(eq(tracks.id, job.trackId));

        this.logger.warn(`⚠️ ${job.trackTitle}: analysis failed, set to neutral gain`);
      }

      this.processedInSession++;

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.averageProcessingTime = Math.round(
        (this.averageProcessingTime * 0.9) + (processingTime * 0.1)
      );

      // Log progress every 100 tracks
      if (this.processedInSession % 100 === 0) {
        const stats = await this.getQueueStats();
        this.logger.info(
          `📊 LUFS progress: ${this.processedInSession}/${this.totalToProcess} (${stats.pendingTracks} remaining, ETA: ${stats.estimatedTimeRemaining})`
        );
      }

      // Check if queue is complete
      if (this.processedInSession >= this.totalToProcess) {
        this.isRunning = false;
        const duration = this.sessionStartedAt
          ? Date.now() - this.sessionStartedAt.getTime()
          : 0;
        this.logger.info(
          `🎉 LUFS analysis completed! Processed ${this.processedInSession} tracks in ${this.formatDuration(duration)}`
        );
      }

    } catch (error) {
      this.logger.error(
        `❌ Error analyzing ${job.trackTitle}: ${(error as Error).message}`
      );

      // Mark as processed to avoid re-processing
      await this.drizzle.db
        .update(tracks)
        .set({
          rgTrackGain: 0,
          rgTrackPeak: 1,
          updatedAt: new Date(),
        })
        .where(eq(tracks.id, job.trackId));

      this.processedInSession++;
    }
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
}
