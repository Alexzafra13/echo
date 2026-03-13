import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { WebSocketModule } from '@infrastructure/websocket';
import { AlbumsModule } from '@features/albums/albums.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { DjModule } from '@features/dj';
import { NotificationsModule } from '@features/notifications/notifications.module';

import { ScannerController } from './presentation/controller/scanner.controller';
import { ScannerGateway } from './infrastructure/gateways/scanner.gateway';

import {
  StartScanUseCase,
  GetScanStatusUseCase,
  GetScansHistoryUseCase,
  SCAN_PROCESSOR,
} from './domain/use-cases';

import { SCANNER_REPOSITORY } from './domain/ports/scanner-repository.port';
import { SCAN_CONTROL } from './domain/ports/scan-control.port';

import { DrizzleScannerRepository } from './infrastructure/persistence/scanner.repository';

import { FileScannerService } from './infrastructure/services/file-scanner.service';
import { MetadataExtractorService } from './infrastructure/services/metadata-extractor.service';
import { ScanProcessorService } from './infrastructure/services/scan-processor.service';
import { PostScanTasksService } from './infrastructure/services/post-scan-tasks.service';
import { FileWatcherService } from './infrastructure/services/file-watcher.service';
import { LufsAnalyzerService } from './infrastructure/services/lufs-analyzer.service';
import { LufsAnalysisQueueService } from './infrastructure/services/lufs-analysis-queue.service';
import {
  EntityCreationService,
  LibraryStatsService,
  LibraryCleanupService,
  TrackGenreService,
  TrackProcessingService,
} from './infrastructure/services/scanning';
import { CoverArtService } from '@shared/services';

@Module({
  imports: [
    QueueModule,
    WebSocketModule,
    forwardRef(() => AlbumsModule),
    ExternalMetadataModule,
    forwardRef(() => DjModule),
    NotificationsModule,
  ],
  controllers: [ScannerController],
  providers: [
    StartScanUseCase,
    GetScanStatusUseCase,
    GetScansHistoryUseCase,
    DrizzleScannerRepository,
    FileScannerService,
    MetadataExtractorService,
    FileWatcherService,
    LufsAnalyzerService,
    LufsAnalysisQueueService,
    CoverArtService,
    EntityCreationService,
    LibraryStatsService,
    LibraryCleanupService,
    TrackGenreService,
    TrackProcessingService,
    PostScanTasksService,
    ScanProcessorService,
    ScannerGateway,
    {
      provide: SCANNER_REPOSITORY,
      useClass: DrizzleScannerRepository,
    },
    {
      provide: SCAN_PROCESSOR,
      useClass: ScanProcessorService,
    },
    {
      provide: SCAN_CONTROL,
      useExisting: ScanProcessorService,
    },
  ],
  exports: [SCANNER_REPOSITORY, ScannerGateway],
})
export class ScannerModule {}
