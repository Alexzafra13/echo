import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { ArtistsController } from './presentation/controller/artists.controller';
import { GetArtistUseCase, GetArtistsUseCase, SearchArtistsUseCase } from './domain/use-cases';
import { PrismaArtistRepository } from './infrastructure/persistence/artist.repository';
import { CachedArtistRepository } from './infrastructure/persistence/cached-artist.repository';
import { ARTIST_REPOSITORY } from './domain/ports/artist-repository.port';

/**
 * ArtistsModule - Módulo de gestión de artistas
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
 * - Usa CachedArtistRepository (Decorator Pattern)
 * - Transparente para el dominio
 * - Configurable con ENABLE_CACHE
 */

const USE_CACHE = process.env.ENABLE_CACHE !== 'false';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
  ],
  controllers: [ArtistsController],
  providers: [
    // Use Cases
    GetArtistUseCase,
    GetArtistsUseCase,
    SearchArtistsUseCase,

    // Repositories
    PrismaArtistRepository,
    CachedArtistRepository,

    // Implementación del port - CONFIGURABLE
    {
      provide: ARTIST_REPOSITORY,
      useClass: USE_CACHE ? CachedArtistRepository : PrismaArtistRepository,
    },
  ],
  exports: [ARTIST_REPOSITORY],
})
export class ArtistsModule {}
