import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { StreamingController } from './presentation/streaming.controller';
import { StreamTokenController } from './presentation/stream-token.controller';
import { StreamTrackUseCase } from './domain/use-cases';
import { StreamTokenService } from './domain/stream-token.service';
import { StreamTokenGuard } from './domain/stream-token.guard';

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
 * - Manejar descarga de archivos
 * - Gestionar tokens de streaming para autenticación
 *
 * Dependencias:
 * - TracksModule: Para acceder al repositorio de tracks
 * - DrizzleService: Global via DrizzleModule
 */
@Module({
  imports: [TracksModule],
  controllers: [StreamingController, StreamTokenController],
  providers: [StreamTrackUseCase, StreamTokenService, StreamTokenGuard],
  exports: [StreamTokenService],
})
export class StreamingModule {}
