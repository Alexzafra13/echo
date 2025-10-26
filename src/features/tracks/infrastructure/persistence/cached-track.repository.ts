import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { PrismaTrackRepository } from './track.repository';

/**
 * CachedTrackRepository - Decorator Pattern con Redis Cache
 *
 * Wrapper transparente que agrega caching a PrismaTrackRepository
 * El dominio NO sabe que existe cache
 */
@Injectable()
export class CachedTrackRepository implements ITrackRepository {
  private readonly CACHE_TTL = parseInt(process.env.CACHE_TRACK_TTL || '3600');
  private readonly KEY_PREFIX = 'track:';
  private readonly LIST_KEY_PREFIX = 'tracks:';

  constructor(
    private readonly baseRepository: PrismaTrackRepository,
    private readonly cache: RedisService,
  ) {}

  /**
   * Busca track por ID con cache
   */
  async findById(id: string): Promise<Track | null> {
    const cacheKey = `${this.KEY_PREFIX}${id}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return Track.fromPrimitives ? Track.fromPrimitives(cached) : cached;
    }

    console.log(`❌ Cache MISS: ${cacheKey}`);

    const track = await this.baseRepository.findById(id);

    if (track) {
      const primitives = track.toPrimitives ? track.toPrimitives() : track;
      await this.cache.set(cacheKey, primitives, this.CACHE_TTL);
    }

    return track;
  }

  /**
   * Obtiene tracks por path con cache
   */
  async findByPath(path: string): Promise<Track | null> {
    const cacheKey = `${this.KEY_PREFIX}path:${path}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return Track.fromPrimitives ? Track.fromPrimitives(cached) : cached;
    }

    const track = await this.baseRepository.findByPath(path);

    if (track) {
      const primitives = track.toPrimitives ? track.toPrimitives() : track;
      await this.cache.set(cacheKey, primitives, this.CACHE_TTL);
    }

    return track;
  }

  /**
   * Listas paginadas - no se cachean (demasiadas variaciones)
   */
  async findAll(skip: number, take: number): Promise<Track[]> {
    return this.baseRepository.findAll(skip, take);
  }

  async search(title: string, skip: number, take: number): Promise<Track[]> {
    return this.baseRepository.search(title, skip, take);
  }

  /**
   * Tracks por álbum - se cachea
   */
  async findByAlbumId(
    albumId: string,
    skip: number,
    take: number,
  ): Promise<Track[]> {
    const cacheKey = `${this.LIST_KEY_PREFIX}album:${albumId}:${skip}:${take}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached.map((item: any) =>
        Track.fromPrimitives ? Track.fromPrimitives(item) : item,
      );
    }

    const tracks = await this.baseRepository.findByAlbumId(albumId, skip, take);

    if (tracks.length > 0) {
      const primitives = tracks.map((t) =>
        t.toPrimitives ? t.toPrimitives() : t,
      );
      await this.cache.set(cacheKey, primitives, this.CACHE_TTL);
    }

    return tracks;
  }

  /**
   * Tracks recientes - cache con TTL corto
   */
  async findRecent(take: number): Promise<Track[]> {
    const cacheKey = `${this.LIST_KEY_PREFIX}recent:${take}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
      return cached.map((item: any) =>
        Track.fromPrimitives ? Track.fromPrimitives(item) : item,
      );
    }

    const tracks = await this.baseRepository.findRecent(take);

    if (tracks.length > 0) {
      const primitives = tracks.map((t) =>
        t.toPrimitives ? t.toPrimitives() : t,
      );
      await this.cache.set(cacheKey, primitives, 300); // 5 minutos
    }

    return tracks;
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
  async create(track: Track): Promise<Track> {
    const created = await this.baseRepository.create(track);
    await this.invalidateListCaches();
    return created;
  }

  async update(id: string, track: Partial<Track>): Promise<Track | null> {
    const updated = await this.baseRepository.update(id, track);

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
      this.cache.del(`${this.LIST_KEY_PREFIX}count`),
    ]);
  }
}
