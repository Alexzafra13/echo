import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

// Presentation Layer
import { ScannerController } from './presentation/controller/scanner.controller';

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
import { PrismaScannerRepository } from './infrastructure/persistence/scanner.repository';

// Infrastructure Layer (Services)
import { FileScannerService } from './infrastructure/services/file-scanner.service';
import { MetadataExtractorService } from './infrastructure/services/metadata-extractor.service';
import { ScanProcessorService } from './infrastructure/services/scan-processor.service';

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
    PrismaModule, // Para acceso a BD
    QueueModule, // Para BullMQ
  ],
  controllers: [ScannerController],
  providers: [
    // Use Cases
    StartScanUseCase,
    GetScanStatusUseCase,
    GetScansHistoryUseCase,

    // Repository
    PrismaScannerRepository,

    // Services
    FileScannerService,
    MetadataExtractorService,
    ScanProcessorService,

    // Port implementations
    {
      provide: SCANNER_REPOSITORY,
      useClass: PrismaScannerRepository,
    },
    {
      provide: SCAN_PROCESSOR,
      useClass: ScanProcessorService,
    },
  ],
  exports: [SCANNER_REPOSITORY],
})
export class ScannerModule {}
