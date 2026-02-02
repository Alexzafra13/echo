import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Infrastructure
import { DrizzleModule } from '../../infrastructure/database/drizzle.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { ScannerModule } from '../scanner/scanner.module';

// Controllers
import { DjController } from './presentation/controllers/dj.controller';

// Services
import { EssentiaAnalyzerService } from './infrastructure/services/essentia-analyzer.service';
import { OnnxStemSeparatorService } from './infrastructure/services/onnx-stem-separator.service';
import { DjAnalysisQueueService } from './infrastructure/services/dj-analysis-queue.service';
import { StemQueueService } from './infrastructure/services/stem-queue.service';
import { TransitionEngineService } from './infrastructure/services/transition-engine.service';
import { TempoCacheService } from './infrastructure/services/tempo-cache.service';

// Repositories
import { DrizzleDjAnalysisRepository } from './infrastructure/persistence/dj-analysis.repository';
import { DrizzleDjSessionRepository } from './infrastructure/persistence/dj-session.repository';

// Services
import { DjCompatibilityService } from './domain/services/dj-compatibility.service';

// Use Cases
import { GetDjSuggestionsUseCase } from './application/use-cases/get-dj-suggestions.use-case';

// Ports
import { DJ_ANALYSIS_REPOSITORY } from './domain/ports/dj-analysis.repository.port';
import { AUDIO_ANALYZER } from './domain/ports/audio-analyzer.port';
import { STEM_SEPARATOR } from './domain/ports/stem-separator.port';

/**
 * DjModule - DJ Features for Echo Music Server
 *
 * Provides:
 * - Audio analysis (BPM, Key, Energy) using Essentia.js
 * - Stem separation (vocals, drums, bass, other) using ONNX/Demucs
 * - Harmonic mixing recommendations (Camelot wheel)
 * - Transition calculations for DJ mixing
 * - Async processing queues for heavy operations
 */
@Module({
  imports: [
    ConfigModule,
    DrizzleModule,
    QueueModule,
    forwardRef(() => ScannerModule), // For ScannerGateway WebSocket events
  ],
  controllers: [DjController],
  providers: [
    // Services
    EssentiaAnalyzerService,
    OnnxStemSeparatorService,
    DjAnalysisQueueService,
    StemQueueService,
    TransitionEngineService,
    TempoCacheService,
    DjCompatibilityService,

    // Repositories
    DrizzleDjAnalysisRepository,
    DrizzleDjSessionRepository,

    // Use Cases
    GetDjSuggestionsUseCase,

    // Port implementations (Dependency Injection)
    {
      provide: DJ_ANALYSIS_REPOSITORY,
      useClass: DrizzleDjAnalysisRepository,
    },
    {
      provide: AUDIO_ANALYZER,
      useClass: EssentiaAnalyzerService,
    },
    {
      provide: STEM_SEPARATOR,
      useClass: OnnxStemSeparatorService,
    },
  ],
  exports: [
    DJ_ANALYSIS_REPOSITORY,
    AUDIO_ANALYZER,
    STEM_SEPARATOR,
    DjAnalysisQueueService,
    StemQueueService,
    TransitionEngineService,
    TempoCacheService,
  ],
})
export class DjModule {}
