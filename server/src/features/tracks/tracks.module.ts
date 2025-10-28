import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { TracksController } from './presentation/controller/tracks.controller';
import { GetTrackUseCase, GetTracksUseCase, SearchTracksUseCase } from './domain/use-cases';
import { PrismaTrackRepository } from './infrastructure/persistence/track.repository';
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
 * - Importar dependencias globales (Prisma, Cache)
 * - Registrar providers (use cases, repositorio)
 * - Exportar controllers
 *
 * Cache:
 * - Usa CachedTrackRepository (Decorator Pattern)
 * - Transparente para el dominio
 * - Configurable con ENABLE_CACHE
 */

const USE_CACHE = process.env.ENABLE_CACHE !== 'false';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
  ],
  controllers: [TracksController],
  providers: [
    // Use Cases
    GetTrackUseCase,
    GetTracksUseCase,
    SearchTracksUseCase,

    // Repositories
    PrismaTrackRepository,
    CachedTrackRepository,

    // Implementación del port - CONFIGURABLE
    {
      provide: TRACK_REPOSITORY,
      useClass: USE_CACHE ? CachedTrackRepository : PrismaTrackRepository,
    },
  ],
  exports: [TRACK_REPOSITORY],
})
export class TracksModule {}
