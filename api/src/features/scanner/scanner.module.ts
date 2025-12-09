import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from '@infrastructure/queue/queue.module';
import { AlbumsModule } from '@features/albums/albums.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';

// Presentation Layer
import { ScannerController } from './presentation/controller/scanner.controller';

// Domain Layer (Services)
import { ScannerEventsService } from './domain/services/scanner-events.service';

// Domain Layer (Use Cases)
import {
  StartScanUseCase,
  GetScanStatusUseCase,
  GetScansHistoryUseCase,
  SCAN_PROCESSOR,
} from './domain/use-cases';

// Domain Layer (Ports)
import { SCANNER_REPOSITORY } from './domain/ports/scanner-repository.port';

// Infrastructure Layer (Persistence)
import { DrizzleScannerRepository } from './infrastructure/persistence/scanner.repository';

// Infrastructure Layer (Services)
import { FileScannerService } from './infrastructure/services/file-scanner.service';
import { MetadataExtractorService } from './infrastructure/services/metadata-extractor.service';
import { ScanProcessorService } from './infrastructure/services/scan-processor.service';
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

/**
 * ScannerModule - Módulo de escaneo de librería musical
 *
 * Estructura (Hexagonal Architecture):
 * - Domain Layer: Use cases, entities, ports
 * - Infrastructure Layer: Repository, file scanner, metadata extractor, queue processor
 * - Presentation Layer: Controller, DTOs
 *
 * Responsabilidades:
 * - Escanear directorios en busca de archivos de música
 * - Extraer metadatos de archivos (ID3, Vorbis, etc.)
 * - Crear/actualizar tracks en la BD
 * - Procesar escaneos en background con BullMQ
 * - Proveer endpoints REST para administrar escaneos
 *
 * Seguridad:
 * - Solo usuarios administradores pueden escanear
 */
@Module({
  imports: [
    QueueModule, // Para BullMQ
    forwardRef(() => AlbumsModule), // Para invalidar caché después del scan
    ExternalMetadataModule, // Para auto-enriquecimiento de metadatos
  ],
  controllers: [ScannerController],
  providers: [
    // Use Cases
    StartScanUseCase,
    GetScanStatusUseCase,
    GetScansHistoryUseCase,

    // Repository
    DrizzleScannerRepository,

    // Core Services
    FileScannerService,
    MetadataExtractorService,
    FileWatcherService,
    LufsAnalyzerService,
    LufsAnalysisQueueService,
    CoverArtService,

    // Scanning Services (SRP extraction)
    EntityCreationService,
    LibraryStatsService,
    LibraryCleanupService,
    TrackGenreService,
    TrackProcessingService,
    ScanProcessorService,

    // Event Service (replaces WebSocket gateway)
    ScannerEventsService,

    // Port implementations
    {
      provide: SCANNER_REPOSITORY,
      useClass: DrizzleScannerRepository,
    },
    {
      provide: SCAN_PROCESSOR,
      useClass: ScanProcessorService,
    },
  ],
  exports: [SCANNER_REPOSITORY, ScannerEventsService],
})
export class ScannerModule {}
