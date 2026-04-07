import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { AlbumsModule } from '@features/albums/albums.module';
import { PlayTrackingModule } from '@features/play-tracking/play-tracking.module';
import { ExternalMetadataModule } from '@features/external-metadata/external-metadata.module';
import { ArtistsController } from './presentation/controller/artists.controller';
import {
  GetArtistUseCase,
  GetArtistsUseCase,
  GetArtistAlbumsUseCase,
  SearchArtistsUseCase,
  GetRelatedArtistsUseCase,
  GetArtistTopTracksUseCase,
  GetArtistStatsUseCase,
} from './domain/use-cases';
import { DrizzleArtistRepository } from './infrastructure/persistence/artist.repository';
import { CachedArtistRepository } from './infrastructure/persistence/cached-artist.repository';
import { ARTIST_REPOSITORY } from './domain/ports/artist-repository.port';
import { SIMILAR_ARTISTS_PROVIDER } from './domain/ports/similar-artists.port';
import { LastfmAgent } from '@features/external-metadata/infrastructure/agents/lastfm.agent';

/**
 * ArtistsModule - Módulo de gestión de artistas
 *
 * Estructura:
 * - Domain Layer: Use cases, entities, ports
 * - Infrastructure Layer: Repository (con cache), mapper
 * - Presentation Layer: Controller, DTOs
 *
 * Cache:
 * - Usa CachedArtistRepository (Decorator Pattern)
 * - Transparente para el dominio
 */

@Module({
  imports: [
    CacheModule,
    forwardRef(() => AlbumsModule), // For GetArtistAlbumsUseCase
    PlayTrackingModule, // For artist global stats
    ExternalMetadataModule, // For LastfmAgent (similar artists)
  ],
  controllers: [ArtistsController],
  providers: [
    // Use Cases
    GetArtistUseCase,
    GetArtistsUseCase,
    GetArtistAlbumsUseCase,
    SearchArtistsUseCase,
    GetRelatedArtistsUseCase,
    GetArtistTopTracksUseCase,
    GetArtistStatsUseCase,

    // Repositories
    DrizzleArtistRepository,
    CachedArtistRepository,

    // Repository with cache (Decorator Pattern)
    {
      provide: ARTIST_REPOSITORY,
      useClass: CachedArtistRepository,
    },
    // Similar artists provider (uses LastfmAgent from ExternalMetadataModule)
    {
      provide: SIMILAR_ARTISTS_PROVIDER,
      useExisting: LastfmAgent,
    },
  ],
  exports: [ARTIST_REPOSITORY],
})
export class ArtistsModule {}
