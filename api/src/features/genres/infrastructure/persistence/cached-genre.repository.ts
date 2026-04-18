import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';
import { cacheConfig } from '@config/cache.config';
import { Genre, GenreProps } from '../../domain/entities/genre.entity';
import {
  IGenreRepository,
  ListGenresParams,
  GenreAlbumsQuery,
  GenreTracksQuery,
  GenreArtistsQuery,
  PaginatedResult,
} from '../../domain/ports/genre-repository.port';
import { DrizzleGenreRepository } from './genre.repository';
import { Album } from '@features/albums/domain/entities/album.entity';
import { Track } from '@features/tracks/domain/entities/track.entity';
import { Artist } from '@features/artists/domain/entities/artist.entity';

const KEY_PREFIX = 'genre:';
const LIST_KEY_PREFIX = 'genres:list:';
const COUNT_KEY_PREFIX = 'genres:count:';

@Injectable()
export class CachedGenreRepository implements IGenreRepository {
  private readonly ttl = cacheConfig.ttl.genre;

  constructor(
    private readonly baseRepository: DrizzleGenreRepository,
    private readonly cache: RedisService,
    @InjectPinoLogger(CachedGenreRepository.name)
    private readonly logger: PinoLogger
  ) {}

  async list(params: ListGenresParams): Promise<Genre[]> {
    const key = `${LIST_KEY_PREFIX}${params.sort}:${params.order}:${params.skip}:${params.take}:${params.search ?? ''}`;
    const cached = await this.cache.get<GenreProps[]>(key);
    if (cached) {
      return cached.map((p) => Genre.reconstruct(this.deserialize(p)));
    }

    const genres = await this.baseRepository.list(params);
    await this.cache.set(
      key,
      genres.map((g) => g.toPrimitives()),
      this.ttl
    );
    return genres;
  }

  async count(search?: string): Promise<number> {
    const key = `${COUNT_KEY_PREFIX}${search ?? ''}`;
    const cached = await this.cache.get<number>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const total = await this.baseRepository.count(search);
    await this.cache.set(key, total, this.ttl);
    return total;
  }

  async findById(id: string): Promise<Genre | null> {
    const key = `${KEY_PREFIX}${id}`;
    const cached = await this.cache.get<GenreProps>(key);
    if (cached) {
      return Genre.reconstruct(this.deserialize(cached));
    }

    const genre = await this.baseRepository.findById(id);
    if (genre) {
      await this.cache.set(key, genre.toPrimitives(), this.ttl);
    }
    return genre;
  }

  async findAlbumsByGenre(query: GenreAlbumsQuery): Promise<PaginatedResult<Album>> {
    return this.baseRepository.findAlbumsByGenre(query);
  }

  async findTracksByGenre(query: GenreTracksQuery): Promise<PaginatedResult<Track>> {
    return this.baseRepository.findTracksByGenre(query);
  }

  async findArtistsByGenre(query: GenreArtistsQuery): Promise<PaginatedResult<Artist>> {
    return this.baseRepository.findArtistsByGenre(query);
  }

  async invalidate(): Promise<void> {
    await Promise.all([
      this.cache.delPattern(`${KEY_PREFIX}*`),
      this.cache.delPattern(`${LIST_KEY_PREFIX}*`),
      this.cache.delPattern(`${COUNT_KEY_PREFIX}*`),
    ]);
    this.logger.debug('Genre cache invalidated');
  }

  private deserialize(props: GenreProps): GenreProps {
    return {
      ...props,
      coverAlbumUpdatedAt: props.coverAlbumUpdatedAt
        ? new Date(props.coverAlbumUpdatedAt)
        : undefined,
      coverAlbumExternalInfoUpdatedAt: props.coverAlbumExternalInfoUpdatedAt
        ? new Date(props.coverAlbumExternalInfoUpdatedAt)
        : undefined,
    };
  }
}
