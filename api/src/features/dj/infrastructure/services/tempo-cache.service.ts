/**
 * Tempo Cache Service
 *
 * Generates and manages BPM-adjusted versions of audio files for seamless DJ transitions.
 * Uses FFmpeg atempo filter for time-stretching while preserving pitch.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { eq, and, lt, sql, inArray } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { BullmqService } from '../../../../infrastructure/queue/bullmq.service';
import { tempoCache, djAnalysis } from '../../../../infrastructure/database/schema';
import { SettingsService } from '../../../external-metadata/infrastructure/services/settings.service';

const TEMPO_CACHE_QUEUE = 'tempo-cache-queue';
const CLEANUP_JOB = 'cleanup-old-cache';

interface TempoCacheResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

interface GenerateCacheParams {
  trackId: string;
  originalBpm: number;
  targetBpm: number;
  sessionId?: string;
  sourceFilePath: string;
}

@Injectable()
export class TempoCacheService implements OnModuleInit {
  private cacheDir!: string;
  private readonly MAX_TEMPO_CHANGE = 0.5; // FFmpeg atempo limit per filter (0.5 to 2.0)

  constructor(
    @InjectPinoLogger(TempoCacheService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
    private readonly bullmq: BullmqService,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit() {
    // Get cache directory from settings or use default
    const dataDir = await this.settingsService.getString('storage.data_dir', '/data');
    this.cacheDir = path.join(dataDir, 'tempo-cache');

    // Ensure cache directory exists
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      this.logger.info(`Tempo cache directory: ${this.cacheDir}`);
    } catch (error) {
      // In production, directories are created by entrypoint
      // This is just a fallback for development
      this.logger.warn(`Could not create ${this.cacheDir}: ${(error as Error).message}`);
    }

    // Register BullMQ processor for cleanup jobs
    this.bullmq.registerProcessor(
      TEMPO_CACHE_QUEUE,
      async (job) => {
        if (job.name === CLEANUP_JOB) {
          return this.handleScheduledCleanup();
        }
      },
      { concurrency: 1 },
    );

    // Schedule repeatable cleanup job (daily at 3:30 AM)
    await this.bullmq.addJob(TEMPO_CACHE_QUEUE, CLEANUP_JOB, {}, {
      repeat: {
        pattern: '30 3 * * *',
      },
      jobId: 'tempo-cache-cleanup-scheduled',
    });

    this.logger.info('Tempo cache cleanup job scheduled (daily at 3:30 AM)');
  }

  /**
   * Get or generate a tempo-adjusted version of a track
   */
  async getOrGenerate(params: GenerateCacheParams): Promise<TempoCacheResult> {
    const { trackId, originalBpm, targetBpm, sessionId, sourceFilePath } = params;

    // Check if we already have this version cached
    const existing = await this.drizzle.db.query.tempoCache.findFirst({
      where: and(
        eq(tempoCache.trackId, trackId),
        eq(tempoCache.targetBpm, targetBpm),
      ),
    });

    if (existing) {
      // Update last used timestamp
      await this.drizzle.db
        .update(tempoCache)
        .set({ lastUsedAt: new Date() })
        .where(eq(tempoCache.id, existing.id));

      // Verify file still exists
      try {
        await fs.access(existing.filePath);
        return { success: true, filePath: existing.filePath };
      } catch {
        // File was deleted, remove record and regenerate
        await this.drizzle.db.delete(tempoCache).where(eq(tempoCache.id, existing.id));
      }
    }

    // Generate new tempo-adjusted file
    return this.generate(params);
  }

  /**
   * Generate a tempo-adjusted version of a track
   */
  private async generate(params: GenerateCacheParams): Promise<TempoCacheResult> {
    const { trackId, originalBpm, targetBpm, sessionId, sourceFilePath } = params;

    // Calculate tempo ratio
    const tempoRatio = targetBpm / originalBpm;

    // Validate tempo change is within reasonable bounds (50% to 200%)
    if (tempoRatio < 0.5 || tempoRatio > 2.0) {
      return {
        success: false,
        error: `Tempo change too extreme: ${originalBpm} → ${targetBpm} (ratio: ${tempoRatio.toFixed(2)})`,
      };
    }

    // Generate output filename
    const outputFileName = `${trackId}_${Math.round(targetBpm)}bpm.mp3`;
    const outputPath = path.join(this.cacheDir, outputFileName);

    try {
      // Build atempo filter chain (FFmpeg atempo only supports 0.5-2.0 per filter)
      const atempoFilters = this.buildAtempoFilters(tempoRatio);

      // Run FFmpeg
      await this.runFfmpeg(sourceFilePath, outputPath, atempoFilters);

      // Get file size
      const stats = await fs.stat(outputPath);

      // Save to database
      await this.drizzle.db.insert(tempoCache).values({
        trackId,
        sessionId,
        originalBpm,
        targetBpm,
        filePath: outputPath,
        fileSizeBytes: stats.size,
      });

      this.logger.info(
        `Generated tempo cache: ${trackId} @ ${targetBpm} BPM (${(stats.size / 1024 / 1024).toFixed(1)} MB)`,
      );

      return { success: true, filePath: outputPath };
    } catch (error) {
      this.logger.error(`Failed to generate tempo cache: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Build atempo filter chain for FFmpeg
   * FFmpeg's atempo filter only supports values between 0.5 and 2.0,
   * so we chain multiple filters for larger changes
   */
  private buildAtempoFilters(ratio: number): string {
    const filters: string[] = [];
    let remaining = ratio;

    while (remaining < this.MAX_TEMPO_CHANGE || remaining > 2.0) {
      if (remaining < this.MAX_TEMPO_CHANGE) {
        filters.push(`atempo=${this.MAX_TEMPO_CHANGE}`);
        remaining /= this.MAX_TEMPO_CHANGE;
      } else if (remaining > 2.0) {
        filters.push('atempo=2.0');
        remaining /= 2.0;
      }
    }

    filters.push(`atempo=${remaining.toFixed(6)}`);
    return filters.join(',');
  }

  /**
   * Run FFmpeg to generate tempo-adjusted audio
   */
  private runFfmpeg(input: string, output: string, atempoFilters: string): Promise<void> {
    const FFMPEG_TIMEOUT = 5 * 60 * 1000; // 5 minutes max per file

    return new Promise((resolve, reject) => {
      const args = [
        '-i', input,
        '-filter:a', atempoFilters,
        '-vn', // No video
        '-c:a', 'libmp3lame',
        '-q:a', '2', // High quality VBR
        '-y', // Overwrite output
        output,
      ];

      const ffmpeg = spawn('ffmpeg', args);
      let settled = false;

      const cleanup = () => {
        if (!ffmpeg.killed) {
          ffmpeg.kill('SIGKILL');
        }
      };

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(`FFmpeg timeout after ${FFMPEG_TIMEOUT / 1000}s for: ${input}`));
        }
      }, FFMPEG_TIMEOUT);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      ffmpeg.on('error', (err) => {
        clearTimeout(timeout);
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });
    });
  }

  /**
   * Generate tempo cache for all tracks in a DJ session
   */
  async generateForSession(sessionId: string, tracks: Array<{ trackId: string; filePath: string }>): Promise<void> {
    if (tracks.length < 2) return;

    const trackIds = tracks.map((t) => t.trackId);

    // Get DJ analysis for all tracks
    const analyses = await this.drizzle.db
      .select({ trackId: djAnalysis.trackId, bpm: djAnalysis.bpm })
      .from(djAnalysis)
      .where(inArray(djAnalysis.trackId, trackIds));

    const bpmMap = new Map<string, number>();
    for (const a of analyses) {
      if (a.bpm !== null) {
        bpmMap.set(a.trackId, a.bpm);
      }
    }

    // For each transition, generate cache for the incoming track at the outgoing track's BPM
    for (let i = 0; i < tracks.length - 1; i++) {
      const currentTrack = tracks[i];
      const nextTrack = tracks[i + 1];

      const currentBpm = bpmMap.get(currentTrack.trackId);
      const nextBpm = bpmMap.get(nextTrack.trackId);

      if (!currentBpm || !nextBpm) continue;

      // Only generate if BPMs are different enough (> 1%)
      const bpmDiff = Math.abs(currentBpm - nextBpm) / currentBpm;
      if (bpmDiff < 0.01) continue;

      // Generate next track at current track's BPM
      await this.getOrGenerate({
        trackId: nextTrack.trackId,
        originalBpm: nextBpm,
        targetBpm: currentBpm,
        sessionId,
        sourceFilePath: nextTrack.filePath,
      });
    }
  }

  /**
   * Get cached file path for a track at a specific BPM
   */
  async getCachedPath(trackId: string, targetBpm: number): Promise<string | null> {
    const cached = await this.drizzle.db.query.tempoCache.findFirst({
      where: and(
        eq(tempoCache.trackId, trackId),
        eq(tempoCache.targetBpm, targetBpm),
      ),
    });

    if (!cached) return null;

    // Verify file exists
    try {
      await fs.access(cached.filePath);
      // Update last used
      await this.drizzle.db
        .update(tempoCache)
        .set({ lastUsedAt: new Date() })
        .where(eq(tempoCache.id, cached.id));
      return cached.filePath;
    } catch {
      // File missing, clean up record
      await this.drizzle.db.delete(tempoCache).where(eq(tempoCache.id, cached.id));
      return null;
    }
  }

  /**
   * Delete all cached files for a session
   */
  async deleteForSession(sessionId: string): Promise<number> {
    const cached = await this.drizzle.db.query.tempoCache.findMany({
      where: eq(tempoCache.sessionId, sessionId),
    });

    let deleted = 0;
    for (const entry of cached) {
      try {
        await fs.unlink(entry.filePath);
        deleted++;
      } catch {
        // File already gone
      }
    }

    await this.drizzle.db.delete(tempoCache).where(eq(tempoCache.sessionId, sessionId));

    this.logger.info(`Deleted ${deleted} tempo cache files for session ${sessionId}`);
    return deleted;
  }

  /**
   * Clean up old cache entries not used in the last N days
   */
  async cleanupOldCache(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldEntries = await this.drizzle.db.query.tempoCache.findMany({
      where: lt(tempoCache.lastUsedAt, cutoffDate),
    });

    let deleted = 0;
    for (const entry of oldEntries) {
      try {
        await fs.unlink(entry.filePath);
        deleted++;
      } catch {
        // File already gone
      }
    }

    await this.drizzle.db.delete(tempoCache).where(lt(tempoCache.lastUsedAt, cutoffDate));

    if (deleted > 0) {
      this.logger.info(`Cleaned up ${deleted} old tempo cache files (> ${daysOld} days)`);
    }

    return deleted;
  }

  /**
   * Get total cache size in bytes
   */
  async getTotalSize(): Promise<number> {
    const result = await this.drizzle.db
      .select({ total: sql<number>`COALESCE(SUM(${tempoCache.fileSizeBytes}), 0)` })
      .from(tempoCache);

    return result[0]?.total ?? 0;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalFiles: number; totalSizeBytes: number; oldestEntry: Date | null }> {
    const countResult = await this.drizzle.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tempoCache);

    const sizeResult = await this.drizzle.db
      .select({ total: sql<number>`COALESCE(SUM(${tempoCache.fileSizeBytes}), 0)` })
      .from(tempoCache);

    const oldestResult = await this.drizzle.db
      .select({ oldest: sql<Date>`MIN(${tempoCache.createdAt})` })
      .from(tempoCache);

    return {
      totalFiles: countResult[0]?.count ?? 0,
      totalSizeBytes: sizeResult[0]?.total ?? 0,
      oldestEntry: oldestResult[0]?.oldest ?? null,
    };
  }

  /**
   * Scheduled cleanup of old cache entries
   * Runs daily at 3:30 AM via BullMQ repeatable job
   */
  async handleScheduledCleanup(): Promise<void> {
    try {
      this.logger.info('Starting scheduled tempo cache cleanup');
      const deleted = await this.cleanupOldCache(30);
      if (deleted > 0) {
        this.logger.info(`Scheduled cleanup completed: removed ${deleted} old tempo cache files`);
      }
    } catch (error) {
      this.logger.error(`Scheduled tempo cache cleanup failed: ${(error as Error).message}`);
    }
  }
}
