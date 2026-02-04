import { Module } from '@nestjs/common';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { WebSocketModule } from '@infrastructure/websocket';
import { DJ_ANALYSIS_REPOSITORY, AUDIO_ANALYZER } from './domain/ports';
import { DrizzleDjAnalysisRepository } from './infrastructure/persistence';
import { EssentiaAnalyzerService, DjAnalysisQueueService } from './infrastructure/services';
import { DjCompatibilityService } from './domain/services/dj-compatibility.service';

/**
 * DjModule - Simplified version for harmonic analysis only
 *
 * Provides:
 * - Audio analysis (BPM, Key, Camelot) via Essentia.js
 * - DJ compatibility scoring for harmonic mixing
 * - Analysis queue for background processing
 *
 * Does NOT include:
 * - Stem separation
 * - DJ Sessions
 * - Tempo cache
 */
@Module({
  imports: [QueueModule, WebSocketModule],
  providers: [
    // Repository
    { provide: DJ_ANALYSIS_REPOSITORY, useClass: DrizzleDjAnalysisRepository },

    // Audio Analyzer
    { provide: AUDIO_ANALYZER, useClass: EssentiaAnalyzerService },
    EssentiaAnalyzerService,

    // Queue Service
    DjAnalysisQueueService,

    // Compatibility Service
    DjCompatibilityService,
  ],
  exports: [
    DJ_ANALYSIS_REPOSITORY,
    AUDIO_ANALYZER,
    DjAnalysisQueueService,
    DjCompatibilityService,
  ],
})
export class DjModule {}
