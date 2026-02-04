import { Module } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { DjModule } from '@features/dj/dj.module';
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
 * Cache:
 * - Usa CachedTrackRepository (Decorator Pattern)
 * - Transparente para el dominio
 *
 * DrizzleService is provided globally via DrizzleModule
 */

@Module({
  imports: [
    CacheModule,
    DjModule,
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

    // Repository with cache (Decorator Pattern)
    {
      provide: TRACK_REPOSITORY,
      useClass: CachedTrackRepository,
    },
  ],
  exports: [TRACK_REPOSITORY],
})
export class TracksModule {}
