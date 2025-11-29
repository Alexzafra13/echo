import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { DrizzleArtistRepository } from './artist.repository';

@Injectable()
export class CachedArtistRepository implements IArtistRepository {
  private readonly CACHE_TTL = parseInt(process.env.CACHE_ARTIST_TTL || '7200');
  private readonly SEARCH_CACHE_TTL = 60; // 1 minuto para búsquedas
  private readonly KEY_PREFIX = 'artist:';
  private readonly SEARCH_KEY_PREFIX = 'artists:search:';

  constructor(
    private readonly baseRepository: DrizzleArtistRepository,
    private readonly cache: RedisService,
  ) {}

  async findById(id: string): Promise<Artist | null> {
    const cacheKey = `${this.KEY_PREFIX}${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return Artist.reconstruct(cached);
    }
    const artist = await this.baseRepository.findById(id);
    if (artist) {
      await this.cache.set(cacheKey, artist.toPrimitives(), this.CACHE_TTL);
    }
    return artist;
  }

  async findAll(skip: number, take: number): Promise<Artist[]> {
    return this.baseRepository.findAll(skip, take);
  }

  /**
   * Busca artistas por nombre con cache
   * TTL corto (60s) porque los resultados pueden cambiar
   */
  async search(name: string, skip: number, take: number): Promise<Artist[]> {
    // Normalizar query para clave consistente
    const normalizedQuery = name.toLowerCase().trim();
    const cacheKey = `${this.SEARCH_KEY_PREFIX}${normalizedQuery}:${skip}:${take}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached.map((item: any) => Artist.reconstruct(item));
    }

    // Fetch from DB
    const artists = await this.baseRepository.search(name, skip, take);

    // Store in cache (even empty results to prevent repeated DB hits)
    const primitives = artists.map((a: Artist) => a.toPrimitives());
    await this.cache.set(cacheKey, primitives, this.SEARCH_CACHE_TTL);

    return artists;
  }

  async count(): Promise<number> {
    return this.baseRepository.count();
  }

  async create(artist: Artist): Promise<Artist> {
    const created = await this.baseRepository.create(artist);
    // Invalidar cache de búsquedas
    await this.cache.delPattern(`${this.SEARCH_KEY_PREFIX}*`);
    return created;
  }

  async update(id: string, artist: Partial<Artist>): Promise<Artist | null> {
    const updated = await this.baseRepository.update(id, artist);
    if (updated) {
      await Promise.all([
        this.cache.del(`${this.KEY_PREFIX}${id}`),
        this.cache.delPattern(`${this.SEARCH_KEY_PREFIX}*`), // Invalidar búsquedas
      ]);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.baseRepository.delete(id);
    if (deleted) {
      await Promise.all([
        this.cache.del(`${this.KEY_PREFIX}${id}`),
        this.cache.delPattern(`${this.SEARCH_KEY_PREFIX}*`), // Invalidar búsquedas
      ]);
    }
    return deleted;
  }
}
