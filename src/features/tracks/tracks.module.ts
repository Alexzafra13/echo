import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { TracksController } from './presentation/controller/tracks.controller';
import { GetTrackUseCase, GetTracksUseCase, SearchTracksUseCase } from './domain/use-cases';
import { PrismaTrackRepository } from './infrastructure/persistence/track.repository';
import { TRACK_REPOSITORY } from './domain/ports/track-repository.port';

/**
 * TracksModule - Módulo de gestión de tracks
 *
 * Estructura:
 * - Domain Layer: Use cases, entities, ports
 * - Infrastructure Layer: Repository, mapper
 * - Presentation Layer: Controller, DTOs
 *
 * Responsabilidades:
 * - Importar dependencias globales (Prisma)
 * - Registrar providers (use cases, repositorio)
 * - Exportar controllers
 */
@Module({
  imports: [PrismaModule],
  controllers: [TracksController],
  providers: [
    // Use Cases
    GetTrackUseCase,
    GetTracksUseCase,
    SearchTracksUseCase,

    // Repository
    PrismaTrackRepository,

    // Implementación del port
    {
      provide: TRACK_REPOSITORY,
      useClass: PrismaTrackRepository,
    },
  ],
  exports: [TRACK_REPOSITORY],
})
export class TracksModule {}
