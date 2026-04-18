import { Module } from '@nestjs/common';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { GenresController } from './presentation/controller/genres.controller';
import {
  ListGenresUseCase,
  GetGenreUseCase,
  GetAlbumsByGenreUseCase,
  GetTracksByGenreUseCase,
  GetArtistsByGenreUseCase,
} from './domain/use-cases';
import { DrizzleGenreRepository } from './infrastructure/persistence/genre.repository';
import { CachedGenreRepository } from './infrastructure/persistence/cached-genre.repository';
import { GENRE_REPOSITORY } from './domain/ports/genre-repository.port';

@Module({
  imports: [CacheModule],
  controllers: [GenresController],
  providers: [
    ListGenresUseCase,
    GetGenreUseCase,
    GetAlbumsByGenreUseCase,
    GetTracksByGenreUseCase,
    GetArtistsByGenreUseCase,
    DrizzleGenreRepository,
    CachedGenreRepository,
    {
      provide: GENRE_REPOSITORY,
      useClass: CachedGenreRepository,
    },
  ],
  exports: [GENRE_REPOSITORY, CachedGenreRepository],
})
export class GenresModule {}
