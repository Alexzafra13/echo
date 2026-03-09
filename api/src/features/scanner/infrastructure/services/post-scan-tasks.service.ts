import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SettingsService } from '@features/external-metadata/infrastructure/services/settings.service';
import { EnrichmentQueueService } from '@features/external-metadata/infrastructure/services/enrichment-queue.service';
import { LufsAnalysisQueueService } from './lufs-analysis-queue.service';
import { DjAnalysisQueueService } from '@features/dj/infrastructure/services/dj-analysis-queue.service';

/**
 * Orchestrates post-scan tasks: metadata enrichment, LUFS analysis, and DJ analysis.
 * Extracted from ScanProcessorService to reduce its dependency count.
 */
@Injectable()
export class PostScanTasksService {
  constructor(
    private readonly enrichmentQueueService: EnrichmentQueueService,
    private readonly lufsAnalysisQueue: LufsAnalysisQueueService,
    private readonly djAnalysisQueue: DjAnalysisQueueService,
    private readonly settingsService: SettingsService,
    @InjectPinoLogger(PostScanTasksService.name)
    private readonly logger: PinoLogger
  ) {}

  /**
   * Run all post-scan tasks: enrichment, LUFS, and DJ analysis.
   */
  async runAll(): Promise<void> {
    await this.performAutoEnrichment();
    await this.startLufsAnalysis();
    await this.startDjAnalysis();
  }

  /**
   * Trigger auto-enrichment after scan
   */
  async performAutoEnrichment(): Promise<void> {
    try {
      const autoEnrichEnabled = await this.settingsService.getBoolean(
        'metadata.auto_enrich.enabled',
        true
      );

      if (!autoEnrichEnabled) {
        this.logger.info('Auto-enriquecimiento deshabilitado en configuración');
        return;
      }

      const result = await this.enrichmentQueueService.startEnrichmentQueue();

      if (result.started) {
        this.logger.info(`🚀 Cola de enriquecimiento iniciada: ${result.pending} items pendientes`);
      } else {
        this.logger.info(`ℹ️ ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Error al iniciar cola de enriquecimiento: ${(error as Error).message}`,
        (error as Error).stack
      );
    }
  }

  /**
   * Trigger LUFS analysis after scan
   */
  async startLufsAnalysis(): Promise<void> {
    try {
      const lufsAnalysisEnabled = await this.settingsService.getBoolean(
        'lufs.auto_analysis.enabled',
        true
      );

      if (!lufsAnalysisEnabled) {
        this.logger.info('🎚️ Análisis LUFS deshabilitado en configuración');
        return;
      }

      const result = await this.lufsAnalysisQueue.startLufsAnalysisQueue();

      if (result.started) {
        this.logger.info(`🎚️ Cola de análisis LUFS iniciada: ${result.pending} tracks pendientes`);
      } else if (result.pending > 0) {
        this.logger.info(`ℹ️ ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Error al iniciar cola de análisis LUFS: ${(error as Error).message}`,
        (error as Error).stack
      );
    }
  }

  /**
   * Trigger DJ analysis (BPM, Key, Energy) after scan
   */
  async startDjAnalysis(): Promise<void> {
    try {
      const djAnalysisEnabled = await this.settingsService.getBoolean(
        'dj.auto_analysis.enabled',
        true
      );

      if (!djAnalysisEnabled) {
        this.logger.info('🎧 Análisis DJ deshabilitado en configuración');
        return;
      }

      const result = await this.djAnalysisQueue.startAnalysisQueue();

      if (result.started) {
        this.logger.info(`🎧 Cola de análisis DJ iniciada: ${result.pending} tracks pendientes`);
      } else if (result.pending > 0) {
        this.logger.info(`ℹ️ ${result.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Error al iniciar cola de análisis DJ: ${(error as Error).message}`,
        (error as Error).stack
      );
    }
  }
}
