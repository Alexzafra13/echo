import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { AlbumsModule } from '@features/albums/albums.module';
import { TracksModule } from '@features/tracks/tracks.module';
import { ArtistsController } from './presentation/controller/artists.controller';
import { GetArtistUseCase, GetArtistsUseCase, GetArtistAlbumsUseCase, SearchArtistsUseCase } from './domain/use-cases';
import { DrizzleArtistRepository } from './infrastructure/persistence/artist.repository';
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
 * - Importar dependencias globales (Drizzle, Cache)
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
    CacheModule,
    forwardRef(() => AlbumsModule), // For GetArtistAlbumsUseCase
    TracksModule, // For top tracks endpoint
  ],
  controllers: [ArtistsController],
  providers: [
    // Use Cases
    GetArtistUseCase,
    GetArtistsUseCase,
    GetArtistAlbumsUseCase,
    SearchArtistsUseCase,

    // Repositories
    DrizzleArtistRepository,
    CachedArtistRepository,

    // Implementación del port - CONFIGURABLE
    {
      provide: ARTIST_REPOSITORY,
      useClass: USE_CACHE ? CachedArtistRepository : DrizzleArtistRepository,
    },
  ],
  exports: [ARTIST_REPOSITORY],
})
export class ArtistsModule {}
