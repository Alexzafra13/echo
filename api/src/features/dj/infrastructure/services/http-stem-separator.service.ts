import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  IStemSeparator,
  StemSeparationResult,
  StemSeparationOptions,
} from '../../domain/ports/stem-separator.port';
import { DJ_CONFIG } from '../../config/dj.config';

/**
 * HTTP Stem Separator Service
 *
 * Communicates with the stems plugin container via HTTP API.
 * The plugin runs Demucs (Python) in a separate container.
 */
@Injectable()
export class HttpStemSeparatorService implements IStemSeparator, OnModuleInit {
  private isAvailableFlag = false;
  private initError: string | null = null;
  private pluginUrl: string;
  private stemsDir: string;

  constructor(
    @InjectPinoLogger(HttpStemSeparatorService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    // Plugin URL - defaults to Docker service name
    this.pluginUrl = this.configService.get<string>(
      'STEMS_PLUGIN_URL',
      'http://echo-stems:5000',
    );
    this.stemsDir = this.configService.get<string>(
      DJ_CONFIG.envVars.stemsDir,
      path.join(process.cwd(), 'data', DJ_CONFIG.directories.stems),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.checkPluginAvailability();
  }

  private async checkPluginAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.pluginUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const health = await response.json();
        this.isAvailableFlag = health.model_loaded === true;

        if (this.isAvailableFlag) {
          this.logger.info(
            { pluginUrl: this.pluginUrl, health },
            'Stems plugin connected successfully',
          );
        } else {
          this.initError = 'Plugin model not loaded';
          this.logger.warn(
            { health },
            'Stems plugin connected but model not loaded',
          );
        }
      } else {
        this.initError = `Plugin returned ${response.status}`;
        this.logger.warn(
          { status: response.status },
          'Stems plugin returned error',
        );
      }
    } catch (error) {
      this.initError = error instanceof Error ? error.message : 'Connection failed';
      this.logger.info(
        { pluginUrl: this.pluginUrl, error: this.initError },
        'Stems plugin not available (this is optional)',
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    // Re-check availability periodically
    if (!this.isAvailableFlag) {
      await this.checkPluginAvailability();
    }
    return this.isAvailableFlag;
  }

  getName(): string {
    return this.isAvailableFlag ? 'demucs-plugin' : 'none';
  }

  getError(): string | null {
    return this.initError;
  }

  estimateProcessingTime(durationSeconds: number): number {
    // Plugin processes at ~1-2x realtime
    return durationSeconds * 1.5;
  }

  async separate(
    inputPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    if (!this.isAvailableFlag) {
      throw new Error(`Stem separator not available: ${this.initError || 'Plugin not connected'}`);
    }

    const outputDir = path.join(options.outputDir, options.trackId);
    fs.mkdirSync(outputDir, { recursive: true });

    this.logger.info(
      { inputPath, outputDir, trackId: options.trackId },
      'Starting stem separation via plugin',
    );

    try {
      // Upload file to plugin
      const jobId = await this.uploadAndStartJob(inputPath);

      // Wait for completion
      const stems = await this.waitForCompletion(jobId);

      // Download stems
      const stemPaths = await this.downloadStems(jobId, stems, outputDir);

      // Cleanup job on plugin
      await this.deleteJob(jobId);

      // Calculate total size
      let totalSize = 0;
      for (const stemPath of Object.values(stemPaths)) {
        if (fs.existsSync(stemPath)) {
          totalSize += fs.statSync(stemPath).size;
        }
      }

      this.logger.info(
        { trackId: options.trackId, totalSizeMB: (totalSize / 1024 / 1024).toFixed(1) },
        'Stem separation completed',
      );

      return {
        vocalsPath: stemPaths.vocals,
        drumsPath: stemPaths.drums,
        bassPath: stemPaths.bass,
        otherPath: stemPaths.other,
        totalSizeBytes: totalSize,
        modelUsed: 'demucs-plugin',
      };
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown', inputPath },
        'Stem separation failed',
      );
      throw error;
    }
  }

  /**
   * Upload audio file and start separation job
   */
  private async uploadAndStartJob(inputPath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(inputPath);
    const fileName = path.basename(inputPath);

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);

    const response = await fetch(`${this.pluginUrl}/separate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start separation: ${error}`);
    }

    const result = await response.json();
    this.logger.debug({ jobId: result.job_id }, 'Separation job started');

    return result.job_id;
  }

  /**
   * Poll for job completion
   */
  private async waitForCompletion(
    jobId: string,
    timeoutMs = 30 * 60 * 1000, // 30 minutes max
    pollIntervalMs = 2000,
  ): Promise<Record<string, string>> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(`${this.pluginUrl}/job/${jobId}`);

      if (!response.ok) {
        throw new Error(`Failed to check job status: ${response.status}`);
      }

      const status = await response.json();

      if (status.status === 'completed') {
        this.logger.debug({ jobId, stems: Object.keys(status.stems) }, 'Job completed');
        return status.stems;
      }

      if (status.status === 'failed') {
        throw new Error(`Separation failed: ${status.error}`);
      }

      // Log progress
      if (status.progress !== undefined) {
        this.logger.debug(
          { jobId, progress: Math.round(status.progress * 100) },
          'Separation progress',
        );
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Separation timed out');
  }

  /**
   * Download stem files from plugin
   */
  private async downloadStems(
    jobId: string,
    stems: Record<string, string>,
    outputDir: string,
  ): Promise<{ vocals: string; drums: string; bass: string; other: string }> {
    const stemNames = ['vocals', 'drums', 'bass', 'other'] as const;
    const result: Record<string, string> = {};

    for (const stemName of stemNames) {
      if (!stems[stemName]) {
        throw new Error(`Stem '${stemName}' not found in job output`);
      }

      const outputPath = path.join(outputDir, `${stemName}.wav`);

      const response = await fetch(`${this.pluginUrl}/job/${jobId}/stem/${stemName}`);

      if (!response.ok) {
        throw new Error(`Failed to download ${stemName}: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));

      result[stemName] = outputPath;
      this.logger.debug({ stemName, outputPath }, 'Downloaded stem');
    }

    return result as { vocals: string; drums: string; bass: string; other: string };
  }

  /**
   * Delete job from plugin (cleanup)
   */
  private async deleteJob(jobId: string): Promise<void> {
    try {
      await fetch(`${this.pluginUrl}/job/${jobId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      // Non-critical, just log
      this.logger.warn({ jobId, error }, 'Failed to cleanup job on plugin');
    }
  }
}
