import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';
import { BaseCachedRepository } from '@shared/base';
import { Album } from '../../domain/entities/album.entity';
import { IAlbumRepository } from '../../domain/ports/album-repository.port';
import { DrizzleAlbumRepository } from './album.repository';
import { cacheConfig } from '@config/cache.config';

@Injectable()
export class CachedAlbumRepository
  extends BaseCachedRepository<Album, IAlbumRepository>
  implements IAlbumRepository
{
  private readonly RECENT_TTL = cacheConfig.ttl.recent;
  private readonly MOST_PLAYED_TTL = cacheConfig.ttl.mostPlayed;
  private readonly COUNT_TTL = cacheConfig.ttl.count;

  constructor(
    baseRepository: DrizzleAlbumRepository,
    cache: RedisService,
    @InjectPinoLogger(CachedAlbumRepository.name)
    logger: PinoLogger,
  ) {
    super(
      baseRepository,
      cache,
      logger,
      {
        keyPrefix: 'album:',
        searchKeyPrefix: 'albums:search:',
        listKeyPrefix: 'albums:',
        entityTtl: cacheConfig.ttl.album,
        searchTtl: cacheConfig.ttl.search,
      },
      Album.reconstruct,
    );
  }

  async findByArtistId(
    artistId: string,
    skip: number,
    take: number,
  ): Promise<Album[]> {
    const cacheKey = `${this.config.listKeyPrefix}artist:${artistId}:${skip}:${take}`;

    return this.getCachedOrFetch(
      cacheKey,
      () => this.baseRepository.findByArtistId(artistId, skip, take),
      this.entityTtl,
      true,
    );
  }

  async findRecent(take: number): Promise<Album[]> {
    const cacheKey = `${this.config.listKeyPrefix}recent:${take}`;

    return this.getCachedOrFetch(
      cacheKey,
      () => this.baseRepository.findRecent(take),
      this.RECENT_TTL,
      true,
    );
  }

  async findMostPlayed(take: number): Promise<Album[]> {
    const cacheKey = `${this.config.listKeyPrefix}most-played:${take}`;

    return this.getCachedOrFetch(
      cacheKey,
      () => this.baseRepository.findMostPlayed(take),
      this.MOST_PLAYED_TTL,
      true,
    );
  }

  override async count(): Promise<number> {
    const cacheKey = `${this.config.listKeyPrefix}count`;

    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      return cached as number;
    }

    const count = await this.baseRepository.count();
    await this.cache.set(cacheKey, count, this.COUNT_TTL);

    return count;
  }

  async countByArtistId(artistId: string): Promise<number> {
    const cacheKey = `${this.config.listKeyPrefix}count:artist:${artistId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      return cached as number;
    }

    const count = await this.baseRepository.countByArtistId(artistId);
    await this.cache.set(cacheKey, count, this.COUNT_TTL);

    return count;
  }

  // Sin caché - rápido con índice de BD
  async findAlphabetically(skip: number, take: number): Promise<Album[]> {
    return this.baseRepository.findAlphabetically(skip, take);
  }

  // Sin caché - rápido con índice de BD
  async findByArtistName(skip: number, take: number): Promise<Album[]> {
    return this.baseRepository.findByArtistName(skip, take);
  }

  // Sin caché - específico por usuario y cambia frecuentemente
  async findRecentlyPlayed(userId: string, take: number): Promise<Album[]> {
    return this.baseRepository.findRecentlyPlayed(userId, take);
  }

  // Sin caché - específico por usuario
  async findFavorites(
    userId: string,
    skip: number,
    take: number,
  ): Promise<Album[]> {
    return this.baseRepository.findFavorites(userId, skip, take);
  }

  override async create(album: Album): Promise<Album> {
    const created = await this.baseRepository.create(album);
    await this.invalidateListCaches();
    return created;
  }

  override async update(
    id: string,
    album: Partial<Album>,
  ): Promise<Album | null> {
    const updated = await this.baseRepository.update(id, album);

    if (updated) {
      await this.cache.del(`${this.config.keyPrefix}${id}`);
      await this.invalidateListCaches();
    }

    return updated;
  }

  override async delete(id: string): Promise<boolean> {
    const deleted = await this.baseRepository.delete(id);

    if (deleted) {
      await this.cache.del(`${this.config.keyPrefix}${id}`);
      await this.invalidateListCaches();
    }

    return deleted;
  }

  async invalidateListCaches(): Promise<void> {
    await Promise.all([
      this.invalidatePattern(`${this.config.keyPrefix}*`),
      this.invalidatePattern(`${this.config.listKeyPrefix}recent:*`),
      this.invalidatePattern(`${this.config.listKeyPrefix}most-played:*`),
      this.invalidatePattern(`${this.config.listKeyPrefix}artist:*`),
      this.invalidatePattern(`${this.config.searchKeyPrefix}*`),
      this.invalidateKey(`${this.config.listKeyPrefix}count`),
    ]);
    this.logger?.info('Album caches invalidated');
  }
}
