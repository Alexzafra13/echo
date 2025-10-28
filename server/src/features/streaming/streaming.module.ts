import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { StreamingController } from './presentation/streaming.controller';
import { StreamTrackUseCase } from './domain/use-cases';

/**
 * StreamingModule - Módulo de streaming de audio
 *
 * Estructura:
 * - Domain Layer: Use cases para preparar streaming
 * - Presentation Layer: Controller con soporte HTTP Range requests
 *
 * Responsabilidades:
 * - Streamear archivos de audio con soporte para ranges
 * - Proporcionar metadata de archivos
 * - Manejar descarga de archivos
 *
 * Dependencias:
 * - TracksModule: Para acceder al repositorio de tracks
 */
@Module({
  imports: [TracksModule],
  controllers: [StreamingController],
  providers: [StreamTrackUseCase],
})
export class StreamingModule {}
