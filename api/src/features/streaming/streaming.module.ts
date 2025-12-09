import { Module } from '@nestjs/common';
import { TracksModule } from '@features/tracks/tracks.module';
import { AlbumsModule } from '@features/albums/albums.module';
import { StreamingController } from './presentation/streaming.controller';
import { StreamTokenController } from './presentation/stream-token.controller';
import { AlbumDownloadController } from './presentation/album-download.controller';
import { StreamTrackUseCase, DownloadAlbumUseCase } from './domain/use-cases';
import { StreamTokenService } from './domain/stream-token.service';
import { StreamTokenGuard } from './domain/stream-token.guard';
import { StreamTokenCleanupService } from './domain/stream-token-cleanup.service';
import { ArchiverService, ARCHIVE_SERVICE } from '@shared/services';

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
 * - Manejar descarga de archivos (tracks individuales y álbumes completos)
 * - Gestionar tokens de streaming para autenticación
 *
 * Dependencias:
 * - TracksModule: Para acceder al repositorio de tracks
 * - AlbumsModule: Para acceder al repositorio de álbumes
 * - DrizzleService: Global via DrizzleModule
 */
@Module({
  imports: [TracksModule, AlbumsModule],
  controllers: [StreamingController, StreamTokenController, AlbumDownloadController],
  providers: [
    StreamTrackUseCase,
    DownloadAlbumUseCase,
    StreamTokenService,
    StreamTokenGuard,
    StreamTokenCleanupService,
    // Archive service abstraction (can be swapped for different implementation)
    {
      provide: ARCHIVE_SERVICE,
      useClass: ArchiverService,
    },
  ],
  exports: [StreamTokenService],
})
export class StreamingModule {}
