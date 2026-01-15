import { Module } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { TracksModule } from '@features/tracks/tracks.module';
import { AlbumsController } from './presentation/controller/albums.controller';
import { GetAlbumUseCase, GetAlbumsUseCase, SearchAlbumsUseCase, GetRecentAlbumsUseCase, GetTopPlayedAlbumsUseCase, GetFeaturedAlbumUseCase, GetAlbumTracksUseCase, GetAlbumCoverUseCase } from './domain/use-cases';
import { GetAlbumsAlphabeticallyUseCase } from './domain/use-cases/get-albums-alphabetically/get-albums-alphabetically.use-case';
import { GetAlbumsByArtistUseCase } from './domain/use-cases/get-albums-by-artist/get-albums-by-artist.use-case';
import { GetRecentlyPlayedAlbumsUseCase } from './domain/use-cases/get-recently-played-albums/get-recently-played-albums.use-case';
import { GetFavoriteAlbumsUseCase } from './domain/use-cases/get-favorite-albums/get-favorite-albums.use-case';
import { DrizzleAlbumRepository } from './infrastructure/persistence/album.repository';
import { CachedAlbumRepository } from './infrastructure/persistence/cached-album.repository';
import { ALBUM_REPOSITORY } from './domain/ports/album-repository.port';
import { CoverArtService } from '@shared/services';

/**
 * AlbumsModule - Módulo de gestión de álbumes
 *
 * Estructura:
 * - Domain Layer: Use cases, entities, ports
 * - Infrastructure Layer: Repository (con cache), mapper
 * - Presentation Layer: Controller, DTOs
 *
 * Cache:
 * - Usa CachedAlbumRepository (Decorator Pattern)
 * - Transparente para el dominio (usa misma interfaz IAlbumRepository)
 */

@Module({
  imports: [
    CacheModule, // Para RedisService
    TracksModule, // Para acceder al repositorio de tracks
  ],
  controllers: [AlbumsController],
  providers: [
    // Use Cases
    GetAlbumUseCase,
    GetAlbumsUseCase,
    SearchAlbumsUseCase,
    GetRecentAlbumsUseCase,
    GetTopPlayedAlbumsUseCase,
    GetFeaturedAlbumUseCase,
    GetAlbumTracksUseCase,
    GetAlbumCoverUseCase,
    GetAlbumsAlphabeticallyUseCase,
    GetAlbumsByArtistUseCase,
    GetRecentlyPlayedAlbumsUseCase,
    GetFavoriteAlbumsUseCase,

    // Repositories
    DrizzleAlbumRepository, // Base repository (sin cache)
    CachedAlbumRepository, // Wrapper con cache

    // Services
    CoverArtService,

    // Repository with cache (Decorator Pattern)
    {
      provide: ALBUM_REPOSITORY,
      useClass: CachedAlbumRepository,
    },
  ],
  exports: [ALBUM_REPOSITORY, CachedAlbumRepository],
})
export class AlbumsModule {}