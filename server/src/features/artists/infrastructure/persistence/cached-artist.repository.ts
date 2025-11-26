import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Artist } from '../../domain/entities/artist.entity';
import { IArtistRepository } from '../../domain/ports/artist-repository.port';
import { DrizzleArtistRepository } from './artist.repository';

@Injectable()
export class CachedArtistRepository implements IArtistRepository {
  private readonly CACHE_TTL = parseInt(process.env.CACHE_ARTIST_TTL || '7200');
  private readonly KEY_PREFIX = 'artist:';

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

  async search(name: string, skip: number, take: number): Promise<Artist[]> {
    return this.baseRepository.search(name, skip, take);
  }

  async count(): Promise<number> {
    return this.baseRepository.count();
  }

  async create(artist: Artist): Promise<Artist> {
    return this.baseRepository.create(artist);
  }

  async update(id: string, artist: Partial<Artist>): Promise<Artist | null> {
    const updated = await this.baseRepository.update(id, artist);
    if (updated) {
      await this.cache.del(`${this.KEY_PREFIX}${id}`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.baseRepository.delete(id);
    if (deleted) {
      await this.cache.del(`${this.KEY_PREFIX}${id}`);
    }
    return deleted;
  }
}
