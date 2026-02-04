import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { WebSocketModule } from '@infrastructure/websocket';
import { DJ_ANALYSIS_REPOSITORY, AUDIO_ANALYZER } from './domain/ports';
import { DrizzleDjAnalysisRepository } from './infrastructure/persistence';
import { EssentiaAnalyzerService, DjAnalysisQueueService } from './infrastructure/services';
import { DjCompatibilityService } from './domain/services/dj-compatibility.service';
import { ScannerModule } from '@features/scanner/scanner.module';

/**
 * DjModule - Harmonic analysis for DJ mixing
 *
 * Provides:
 * - Audio analysis (BPM, Key, Camelot) via Essentia.js
 * - DJ compatibility scoring for harmonic mixing
 * - Analysis queue for background processing
 */
@Module({
  imports: [
    QueueModule,
    WebSocketModule,
    forwardRef(() => ScannerModule), // For ScannerGateway (circular dep with Scanner)
  ],
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
