import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { DrizzleTrackRepository } from './track.repository';

@Injectable()
export class CachedTrackRepository implements ITrackRepository {
  private readonly CACHE_TTL = parseInt(process.env.CACHE_TRACK_TTL || '3600');
  private readonly SEARCH_CACHE_TTL = 60; // 1 minuto para búsquedas
  private readonly KEY_PREFIX = 'track:';
  private readonly SEARCH_KEY_PREFIX = 'tracks:search:';

  constructor(
    private readonly baseRepository: DrizzleTrackRepository,
    private readonly cache: RedisService,
    @InjectPinoLogger(CachedTrackRepository.name)
    private readonly logger: PinoLogger,
  ) {}

  async findById(id: string): Promise<Track | null> {
    const cacheKey = `${this.KEY_PREFIX}${id}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      this.logger.debug({ trackId: id }, 'Cache hit for track');
      return Track.reconstruct(cached);
    }

    this.logger.debug({ trackId: id }, 'Cache miss for track');
    const track = await this.baseRepository.findById(id);

    if (track) {
      await this.cache.set(cacheKey, track.toPrimitives(), this.CACHE_TTL);
    }

    return track;
  }

  async findByIds(ids: string[]): Promise<Track[]> {
    return this.baseRepository.findByIds(ids);
  }

  async findAll(skip: number, take: number): Promise<Track[]> {
    return this.baseRepository.findAll(skip, take);
  }

  /**
   * Busca tracks por título con cache
   * TTL corto (60s) porque los resultados pueden cambiar
   */
  async search(title: string, skip: number, take: number): Promise<Track[]> {
    // Normalizar query para clave consistente
    const normalizedQuery = title.toLowerCase().trim();
    const cacheKey = `${this.SEARCH_KEY_PREFIX}${normalizedQuery}:${skip}:${take}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey, type: 'HIT' }, 'Track search cache hit');
      return cached.map((item: any) => Track.reconstruct(item));
    }

    this.logger.debug({ cacheKey, type: 'MISS' }, 'Track search cache miss');

    // Fetch from DB
    const tracks = await this.baseRepository.search(title, skip, take);

    // Store in cache (even empty results to prevent repeated DB hits)
    const primitives = tracks.map((t: Track) => t.toPrimitives());
    await this.cache.set(cacheKey, primitives, this.SEARCH_CACHE_TTL);

    return tracks;
  }

  async findByAlbumId(albumId: string): Promise<Track[]> {
    return this.baseRepository.findByAlbumId(albumId);
  }

  async findByArtistId(artistId: string, skip: number, take: number): Promise<Track[]> {
    return this.baseRepository.findByArtistId(artistId, skip, take);
  }

  async count(): Promise<number> {
    return this.baseRepository.count();
  }

  async findAllShuffled(): Promise<Track[]> {
    // No cache for shuffled tracks - always fresh random order
    return this.baseRepository.findAllShuffled();
  }

  async create(track: Track): Promise<Track> {
    const created = await this.baseRepository.create(track);
    // Invalidar cache de búsquedas
    await this.cache.delPattern(`${this.SEARCH_KEY_PREFIX}*`);
    this.logger.debug('Search cache invalidated after create');
    return created;
  }

  async update(id: string, track: Partial<Track>): Promise<Track | null> {
    const updated = await this.baseRepository.update(id, track);

    if (updated) {
      await Promise.all([
        this.cache.del(`${this.KEY_PREFIX}${id}`),
        this.cache.delPattern(`${this.SEARCH_KEY_PREFIX}*`), // Invalidar búsquedas
      ]);
      this.logger.debug({ trackId: id }, 'Cache invalidated after update');
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
      this.logger.debug({ trackId: id }, 'Cache invalidated after delete');
    }

    return deleted;
  }
}
