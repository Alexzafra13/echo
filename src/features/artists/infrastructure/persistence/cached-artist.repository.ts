import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { PrismaArtistRepository } from './artist.repository';

/**
 * CachedArtistRepository - Decorator Pattern con Redis Cache
 *
 * Wrapper transparente que agrega caching a PrismaArtistRepository
 */
@Injectable()
export class CachedArtistRepository implements IArtistRepository {
  private readonly CACHE_TTL = parseInt(
    process.env.CACHE_ARTIST_TTL || '7200',
  ); // 2 horas
  private readonly KEY_PREFIX = 'artist:';
  private readonly LIST_KEY_PREFIX = 'artists:';

  constructor(
    private readonly baseRepository: PrismaArtistRepository,
    private readonly cache: RedisService,
  ) {}

  /**
   * Busca artista por ID con cache
   */
  async findById(id: string): Promise<Artist | null> {
    const cacheKey = `${this.KEY_PREFIX}${id}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return Artist.fromPrimitives ? Artist.fromPrimitives(cached) : cached;
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);

    const artist = await this.baseRepository.findById(id);

    if (artist) {
      const primitives = artist.toPrimitives ? artist.toPrimitives() : artist;
      await this.cache.set(cacheKey, primitives, this.CACHE_TTL);
    }

    return artist;
  }

  /**
   * Listas - no cacheadas
   */
  async findAll(skip: number, take: number): Promise<Artist[]> {
    return this.baseRepository.findAll(skip, take);
  }

  async search(name: string, skip: number, take: number): Promise<Artist[]> {
    return this.baseRepository.search(name, skip, take);
  }

  /**
   * Artistas recientes - cache con TTL corto
   */
  async findRecent(take: number): Promise<Artist[]> {
    const cacheKey = `${this.LIST_KEY_PREFIX}recent:${take}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached.map((item: any) =>
        Artist.fromPrimitives ? Artist.fromPrimitives(item) : item,
      );
    }

    const artists = await this.baseRepository.findRecent(take);

    if (artists.length > 0) {
      const primitives = artists.map((a) =>
        a.toPrimitives ? a.toPrimitives() : a,
      );
      await this.cache.set(cacheKey, primitives, 300); // 5 minutos
    }

    return artists;
  }

  /**
   * Artistas top - cache
   */
  async findTopArtists(take: number): Promise<Artist[]> {
    const cacheKey = `${this.LIST_KEY_PREFIX}top:${take}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached.map((item: any) =>
        Artist.fromPrimitives ? Artist.fromPrimitives(item) : item,
      );
    }

    const artists = await this.baseRepository.findTopArtists(take);

    if (artists.length > 0) {
      const primitives = artists.map((a) =>
        a.toPrimitives ? a.toPrimitives() : a,
      );
      await this.cache.set(cacheKey, primitives, 600); // 10 minutos
    }

    return artists;
  }

  async count(): Promise<number> {
    const cacheKey = `${this.LIST_KEY_PREFIX}count`;

    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached;
    }

    const count = await this.baseRepository.count();
    await this.cache.set(cacheKey, count, 1800); // 30 minutos

    return count;
  }

  /**
   * Escrituras - invalidan cache
   */
  async create(artist: Artist): Promise<Artist> {
    const created = await this.baseRepository.create(artist);
    await this.invalidateListCaches();
    return created;
  }

  async update(id: string, artist: Partial<Artist>): Promise<Artist | null> {
    const updated = await this.baseRepository.update(id, artist);

    if (updated) {
      await this.cache.del(`${this.KEY_PREFIX}${id}`);
      await this.invalidateListCaches();
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.baseRepository.delete(id);

    if (deleted) {
      await this.cache.del(`${this.KEY_PREFIX}${id}`);
      await this.invalidateListCaches();
    }

    return deleted;
  }

  private async invalidateListCaches(): Promise<void> {
    await Promise.all([
      this.cache.del(`${this.LIST_KEY_PREFIX}recent:*`),
      this.cache.del(`${this.LIST_KEY_PREFIX}top:*`),
      this.cache.del(`${this.LIST_KEY_PREFIX}count`),
    ]);
  }
}
