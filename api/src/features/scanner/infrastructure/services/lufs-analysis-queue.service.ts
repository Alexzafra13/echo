import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { tracks } from '@infrastructure/database/schema';
import { eq, isNull, isNotNull, sql, and } from 'drizzle-orm';
import { LufsAnalyzerService } from './lufs-analyzer.service';
import { ScannerGateway } from '../gateways/scanner.gateway';
import * as os from 'os';

const LUFS_QUEUE = 'lufs-analysis-queue';
const LUFS_JOB = 'analyze-track';

// Concurrencia óptima: mitad de cores, limitado por RAM, tope en 12
function getOptimalConcurrency(): number {
  const envConcurrency = parseInt(process.env.LUFS_CONCURRENCY || '', 10);
  if (envConcurrency > 0) {
    return envConcurrency;
  }

  const cpuCores = os.cpus().length;
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);

  const byCpu = Math.max(1, Math.floor(cpuCores / 2));
  const byMemory = Math.max(1, Math.floor((totalMemoryGB - 2) / 0.05));
  return Math.min(byCpu, byMemory, 12);
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

// Análisis LUFS en background con BullMQ y workers paralelos
@Injectable()
export class LufsAnalysisQueueService implements OnModuleInit {
  private isRunning = false;
  private processedInSession = 0;
  private totalToProcess = 0;
  private sessionStartedAt: Date | null = null;
  private averageProcessingTime = 4000;
  private readonly concurrency: number;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly bullmq: BullmqService,
    private readonly lufsAnalyzer: LufsAnalyzerService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ScannerGateway))
    private readonly scannerGateway: ScannerGateway,
    @InjectPinoLogger(LufsAnalysisQueueService.name)
    private readonly logger: PinoLogger
  ) {
    const envConcurrency = this.configService.get<number>('LUFS_CONCURRENCY');
    this.concurrency = envConcurrency ?? getOptimalConcurrency();
  }

  async onModuleInit() {
    this.bullmq.registerProcessor(
      LUFS_QUEUE,
      async (job) => {
        return this.processLufsJob(job.data as LufsAnalysisJob);
      },
      { concurrency: this.concurrency }
    );

    const cpuCores = os.cpus().length;
    const totalMemoryGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
    this.logger.info(
      `LufsAnalysisQueueService initialized: ${this.concurrency} workers (detected: ${cpuCores} cores, ${totalMemoryGB}GB RAM)`
    );
  }

  // Inicia o agrega tracks a la cola de análisis LUFS
  async startLufsAnalysisQueue(): Promise<{ started: boolean; pending: number; message: string }> {
    const ffmpegAvailable = await this.lufsAnalyzer.isFFmpegAvailable();
    if (!ffmpegAvailable) {
      return {
        started: false,
        pending: 0,
        message: 'FFmpeg not available. Skipping LUFS analysis.',
      };
    }

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

    if (this.isRunning) {
      const newTracks = pendingTracks.length;
      this.totalToProcess += newTracks;

      this.logger.info(
        `🎚️ Adding ${newTracks} new tracks to running LUFS queue (total: ${this.totalToProcess})`
      );

      await this.enqueueTracksInBatches(pendingTracks);
      this.emitProgress();

      return {
        started: true,
        pending: pendingTracks.length,
        message: `Added ${newTracks} tracks to running LUFS queue. Total: ${this.totalToProcess}`,
      };
    }

    this.isRunning = true;
    this.processedInSession = 0;
    this.totalToProcess = pendingTracks.length;
    this.sessionStartedAt = new Date();

    this.logger.info(
      `🎚️ Starting LUFS analysis queue: ${pendingTracks.length} tracks (${this.concurrency} parallel workers)`
    );

    await this.enqueueTracksInBatches(pendingTracks);

    const estimatedTime = this.formatDuration(
      (pendingTracks.length / this.concurrency) * this.averageProcessingTime
    );

    this.emitProgress();

    return {
      started: true,
      pending: pendingTracks.length,
      message: `LUFS analysis started. Processing ${pendingTracks.length} tracks with ${this.concurrency} workers. ETA: ~${estimatedTime}`,
    };
  }

  private async enqueueTracksInBatches(
    tracksToEnqueue: Array<{ id: string; title: string; path: string }>
  ): Promise<void> {
    const jobs = tracksToEnqueue.map((track) => ({
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

    const BATCH_SIZE = 500;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((job) =>
          this.bullmq.addJob(
            LUFS_QUEUE,
            job.name,
            job.data as unknown as Record<string, unknown>,
            job.opts
          )
        )
      );
    }
  }

  async stopLufsAnalysisQueue(): Promise<void> {
    this.isRunning = false;
    this.logger.info('⏹️ LUFS analysis queue stopped');
  }

  async getQueueStats(): Promise<LufsQueueStats> {
    const pendingResult = await this.drizzle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tracks)
      .where(isNull(tracks.lufsAnalyzedAt));

    const pendingTracks = pendingResult[0]?.count ?? 0;

    let estimatedTimeRemaining: string | null = null;
    if (this.isRunning && pendingTracks > 0) {
      const totalMs = (pendingTracks / this.concurrency) * this.averageProcessingTime;
      estimatedTimeRemaining = this.formatDuration(totalMs);
    }

    return {
      isRunning: this.isRunning,
      pendingTracks,
      processedInSession: this.processedInSession,
      currentTrack: null,
      startedAt: this.sessionStartedAt,
      estimatedTimeRemaining,
    };
  }

  // Marca siempre lufsAnalyzedAt; si falla, deja gain/peak en null
  private async processLufsJob(job: LufsAnalysisJob): Promise<void> {
    const startTime = Date.now();
    const now = new Date();

    try {
      const result = await this.lufsAnalyzer.analyzeFile(job.filePath);

      if (result) {
        await this.drizzle.db
          .update(tracks)
          .set({
            rgTrackGain: result.trackGain,
            rgTrackPeak: result.trackPeak,
            outroStart: result.outroStart ?? null,
            lufsAnalyzedAt: now,
            updatedAt: now,
          })
          .where(eq(tracks.id, job.trackId));

        const outroInfo = result.outroStart ? `, outro=${result.outroStart.toFixed(1)}s` : '';
        this.logger.debug(
          `✅ ${job.trackTitle}: gain=${result.trackGain.toFixed(2)}dB, peak=${result.trackPeak.toFixed(3)}${outroInfo}`
        );
      } else {
        await this.drizzle.db
          .update(tracks)
          .set({
            lufsAnalyzedAt: now,
            updatedAt: now,
          })
          .where(eq(tracks.id, job.trackId));

        this.logger.warn(
          `⚠️ ${job.trackTitle}: analysis failed, marked as analyzed (no gain data)`
        );
      }

      this.processedInSession++;

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.averageProcessingTime = Math.round(
        this.averageProcessingTime * 0.9 + processingTime * 0.1
      );

      // Emit WebSocket progress every 10 tracks (or on first track)
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
        // Before finishing, check if there are any new pending tracks
        // (could have been added during processing)
        const remainingPending = await this.drizzle.db
          .select({ count: sql<number>`count(*)::int` })
          .from(tracks)
          .where(isNull(tracks.lufsAnalyzedAt));

        const remainingCount = remainingPending[0]?.count ?? 0;

        if (remainingCount > 0) {
          // There are new tracks to process - continue the queue
          this.logger.info(
            `🎚️ Found ${remainingCount} new tracks added during processing, continuing...`
          );

          // Re-fetch and enqueue the new tracks
          const newPendingTracks = await this.drizzle.db
            .select({
              id: tracks.id,
              title: tracks.title,
              path: tracks.path,
            })
            .from(tracks)
            .where(isNull(tracks.lufsAnalyzedAt));

          this.totalToProcess += remainingCount;
          await this.enqueueTracksInBatches(newPendingTracks);
          this.emitProgress();
          return; // Don't finish, continue processing
        }

        // Queue is truly complete
        const duration = this.sessionStartedAt ? Date.now() - this.sessionStartedAt.getTime() : 0;
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
      this.logger.error(`❌ Error analyzing ${job.trackTitle}: ${(error as Error).message}`);

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
   * Emit current progress via WebSocket
   * Uses internal counters for real-time updates (faster than DB queries)
   */
  private emitProgress(): void {
    // Calculate pending based on internal counters
    // This is more accurate for real-time updates since new tracks may be added dynamically
    const pendingTracks = Math.max(0, this.totalToProcess - this.processedInSession);
    const estimatedTimeRemaining =
      this.isRunning && pendingTracks > 0
        ? this.formatDuration((pendingTracks / this.concurrency) * this.averageProcessingTime)
        : null;

    this.scannerGateway.emitLufsProgress({
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

      this.logger.info(`📀 Album gains calculated! Updated ${updatedAlbums} albums`);
    } catch (error) {
      this.logger.error(`❌ Error calculating album gains: ${(error as Error).message}`);
    }
  }
}
