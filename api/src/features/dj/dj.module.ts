import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { WebSocketModule } from '@infrastructure/websocket';
import { DJ_ANALYSIS_REPOSITORY, AUDIO_ANALYZER } from './domain/ports';
import { DrizzleDjAnalysisRepository } from './infrastructure/persistence';
import { EssentiaAnalyzerService, DjAnalysisQueueService } from './infrastructure/services';
import { DjCompatibilityService } from './domain/services/dj-compatibility.service';
import { ScannerModule } from '@features/scanner/scanner.module';

@Module({
  imports: [
    QueueModule,
    WebSocketModule,
    forwardRef(() => ScannerModule),
  ],
  providers: [
    { provide: DJ_ANALYSIS_REPOSITORY, useClass: DrizzleDjAnalysisRepository },
    { provide: AUDIO_ANALYZER, useClass: EssentiaAnalyzerService },
    EssentiaAnalyzerService,
    DjAnalysisQueueService,
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
