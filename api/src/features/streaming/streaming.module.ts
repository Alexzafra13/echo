import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { DjModule } from '@features/dj/dj.module';
import { StreamingController } from './presentation/streaming.controller';
import { StreamTokenController } from './presentation/stream-token.controller';
import { DownloadController } from './presentation/download.controller';
import { StreamTrackUseCase } from './domain/use-cases';
import { StreamTokenGuard } from './presentation/guards';
import { StreamTokenService } from './infrastructure/services/stream-token.service';
import { StreamTokenCleanupService } from './infrastructure/services/stream-token-cleanup.service';
import { DownloadService } from './infrastructure/services/download.service';

/**
 * StreamingModule - Módulo de streaming de audio
 *
 * Estructura:
 * - Domain Layer: Use cases para preparar streaming, servicio de tokens
 * - Presentation Layer: Controllers con soporte HTTP Range requests
 *
 * Responsabilidades:
 * - Streamear archivos de audio con soporte para ranges
 * - Proporcionar metadata de archivos
 * - Manejar descarga de archivos (tracks y álbumes como ZIP)
 * - Gestionar tokens de streaming para autenticación
 *
 * Dependencias:
 * - TracksModule: Para acceder al repositorio de tracks
 * - DrizzleService: Global via DrizzleModule
 */
@Module({
  imports: [TracksModule, DjModule],
  controllers: [StreamingController, StreamTokenController, DownloadController],
  providers: [
    StreamTrackUseCase,
    StreamTokenService,
    StreamTokenGuard,
    StreamTokenCleanupService,
    DownloadService,
  ],
  exports: [StreamTokenService],
})
export class StreamingModule {}
