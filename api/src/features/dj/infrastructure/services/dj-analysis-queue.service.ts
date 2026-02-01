import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as os from 'os';
import { BullmqService } from '../../../../infrastructure/queue/bullmq.service';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djAnalysis, tracks } from '../../../../infrastructure/database/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { EssentiaAnalyzerService } from './essentia-analyzer.service';
import { DjAnalysis } from '../../domain/entities/dj-analysis.entity';

interface DjAnalysisJob {
  trackId: string;
  trackTitle: string;
  filePath: string;
}

const DJ_ANALYSIS_QUEUE = 'dj-analysis-queue';
const DJ_ANALYSIS_JOB = 'analyze-track';

function getOptimalConcurrency(): number {
  const cpuCores = os.cpus().length;
  const totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);

  // Essentia analysis is less intensive than stem separation
  let concurrency = Math.max(1, Math.floor(cpuCores / 2));

  // Each analysis uses ~500MB
  const maxByMemory = Math.max(1, Math.floor((totalMemoryGB - 1) / 0.5));
  concurrency = Math.min(concurrency, maxByMemory);

  return Math.min(concurrency, 8);
}

@Injectable()
export class DjAnalysisQueueService implements OnModuleInit {
  private readonly concurrency: number;
  private isRunning = false;
  private processedInSession = 0;
  private sessionStartedAt: Date | null = null;

  constructor(
    @InjectPinoLogger(DjAnalysisQueueService.name)
    private readonly logger: PinoLogger,
    private readonly bullmq: BullmqService,
    private readonly drizzle: DrizzleService,
    private readonly analyzer: EssentiaAnalyzerService,
  ) {
    this.concurrency = getOptimalConcurrency();
    this.logger.info({ concurrency: this.concurrency }, 'DJ Analysis queue initialized');
  }

  onModuleInit() {
    this.bullmq.registerProcessor(
      DJ_ANALYSIS_QUEUE,
      async (job) => {
        return this.processAnalysisJob(job.data as DjAnalysisJob);
      },
      { concurrency: this.concurrency },
    );
  }

  async startAnalysisQueue(tracks: Array<{ id: string; title: string; path: string }>): Promise<void> {
    if (tracks.length === 0) {
      return;
    }

    this.isRunning = true;
    this.processedInSession = 0;
    this.sessionStartedAt = new Date();

    this.logger.info(
      { trackCount: tracks.length },
      'Starting DJ analysis queue',
    );

    // Enqueue all tracks
    for (const track of tracks) {
      await this.bullmq.addJob(DJ_ANALYSIS_QUEUE, DJ_ANALYSIS_JOB, {
        trackId: track.id,
        trackTitle: track.title,
        filePath: track.path,
      });
    }
  }

  async enqueueTrack(track: { id: string; title: string; path: string }): Promise<void> {
    await this.bullmq.addJob(DJ_ANALYSIS_QUEUE, DJ_ANALYSIS_JOB, {
      trackId: track.id,
      trackTitle: track.title,
      filePath: track.path,
    });
  }

  private async processAnalysisJob(job: DjAnalysisJob): Promise<void> {
    this.logger.debug(
      { trackId: job.trackId, title: job.trackTitle },
      'Processing DJ analysis',
    );

    try {
      // Check if analysis already exists
      const existing = await this.drizzle.db
        .select()
        .from(djAnalysis)
        .where(eq(djAnalysis.trackId, job.trackId))
        .limit(1);

      if (existing.length > 0 && existing[0].status === 'completed') {
        this.logger.debug({ trackId: job.trackId }, 'Analysis already exists');
        return;
      }

      // Create or update analysis record
      const analysisId = existing[0]?.id || crypto.randomUUID();

      if (existing.length === 0) {
        await this.drizzle.db.insert(djAnalysis).values({
          id: analysisId,
          trackId: job.trackId,
          status: 'analyzing',
        });
      } else {
        await this.drizzle.db
          .update(djAnalysis)
          .set({ status: 'analyzing', updatedAt: new Date() })
          .where(eq(djAnalysis.id, analysisId));
      }

      // First, try to get BPM/Key from tracks table (ID3 tags)
      const trackData = await this.drizzle.db
        .select({ bpm: tracks.bpm, initialKey: tracks.initialKey })
        .from(tracks)
        .where(eq(tracks.id, job.trackId))
        .limit(1);

      const trackBpm = trackData[0]?.bpm || 0;
      const trackKey = trackData[0]?.initialKey || '';

      // Run audio analysis
      let analyzedBpm = 0;
      let analyzedKey = 'Unknown';
      let energy = 0.5;

      try {
        const result = await this.analyzer.analyze(job.filePath);
        analyzedBpm = result.bpm;
        analyzedKey = result.key;
        energy = result.energy;
      } catch (error) {
        this.logger.debug(
          { error: error instanceof Error ? error.message : 'Unknown' },
          'Audio analysis failed, using defaults',
        );
      }

      // Use ID3 tags first, fallback to Essentia analysis
      const finalBpm = trackBpm > 0 ? trackBpm : analyzedBpm;
      const finalKey = trackKey && trackKey !== 'Unknown' ? trackKey : analyzedKey;

      // Convert key to Camelot
      const camelotKey = DjAnalysis.keyToCamelot(finalKey);

      // Update with results
      await this.drizzle.db
        .update(djAnalysis)
        .set({
          bpm: finalBpm,
          key: finalKey,
          camelotKey: camelotKey || null,
          energy: energy,
          danceability: null,
          beatgrid: null,
          introEnd: null,
          outroStart: null,
          status: 'completed',
          analyzedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(djAnalysis.id, analysisId));

      this.processedInSession++;

      // Determine the source of BPM/Key
      let bpmSource = 'none';
      let keySource = 'none';
      if (trackBpm > 0) bpmSource = 'id3-tags';
      else if (analyzedBpm > 0) bpmSource = 'essentia';
      if (trackKey && trackKey !== 'Unknown') keySource = 'id3-tags';
      else if (analyzedKey && analyzedKey !== 'Unknown') keySource = 'essentia';

      this.logger.info(
        {
          trackId: job.trackId,
          bpm: finalBpm,
          key: finalKey,
          camelotKey,
          bpmSource,
          keySource,
        },
        'DJ analysis completed',
      );
    } catch (error) {
      this.logger.error(
        { trackId: job.trackId, error: error instanceof Error ? error.message : 'Unknown' },
        'DJ analysis failed',
      );

      // Update status to failed
      await this.drizzle.db
        .update(djAnalysis)
        .set({
          status: 'failed',
          analysisError: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(djAnalysis.trackId, job.trackId));

      throw error;
    }
  }

  async getQueueStats(): Promise<{
    isRunning: boolean;
    pendingTracks: number;
    processedInSession: number;
    startedAt: Date | null;
    concurrency: number;
    analyzerBackend: string;
  }> {
    const pending = await this.drizzle.db
      .select()
      .from(djAnalysis)
      .where(eq(djAnalysis.status, 'pending'));

    return {
      isRunning: this.isRunning,
      pendingTracks: pending.length,
      processedInSession: this.processedInSession,
      startedAt: this.sessionStartedAt,
      concurrency: this.concurrency,
      analyzerBackend: this.analyzer.getName(),
    };
  }

  async stopQueue(): Promise<void> {
    this.isRunning = false;
    this.logger.info('DJ analysis queue stopped');
  }
}
