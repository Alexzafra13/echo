import { Module } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { TracksController } from './presentation/controller/tracks.controller';
import { GetTrackUseCase, GetTracksUseCase, SearchTracksUseCase, GetShuffledTracksUseCase } from './domain/use-cases';
import { DrizzleTrackRepository } from './infrastructure/persistence/track.repository';
import { CachedTrackRepository } from './infrastructure/persistence/cached-track.repository';
import { TRACK_REPOSITORY } from './domain/ports/track-repository.port';

/**
 * TracksModule - Módulo de gestión de tracks
 *
 * Estructura:
 * - Domain Layer: Use cases, entities, ports
 * - Infrastructure Layer: Repository (con cache), mapper
 * - Presentation Layer: Controller, DTOs
 *
 * Responsabilidades:
 * - Registrar providers (use cases, repositorio)
 * - Exportar controllers
 *
 * Cache:
 * - Usa CachedTrackRepository (Decorator Pattern)
 * - Transparente para el dominio
 * - Configurable con ENABLE_CACHE
 *
 * DrizzleService is provided globally via DrizzleModule
 */

const USE_CACHE = process.env.ENABLE_CACHE !== 'false';

@Module({
  imports: [
    CacheModule,
  ],
  controllers: [TracksController],
  providers: [
    // Use Cases
    GetTrackUseCase,
    GetTracksUseCase,
    SearchTracksUseCase,
    GetShuffledTracksUseCase,

    // Repositories
    DrizzleTrackRepository,
    CachedTrackRepository,

    // Implementación del port - CONFIGURABLE
    {
      provide: TRACK_REPOSITORY,
      useClass: USE_CACHE ? CachedTrackRepository : DrizzleTrackRepository,
    },
  ],
  exports: [TRACK_REPOSITORY],
})
export class TracksModule {}
