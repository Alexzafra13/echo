import { Injectable } from '@nestjs/common';
import { RedisService } from '@infrastructure/cache/redis.service';
import { Track } from '../../domain/entities/track.entity';
import { ITrackRepository } from '../../domain/ports/track-repository.port';
import { PrismaTrackRepository } from './track.repository';

@Injectable()
export class CachedTrackRepository implements ITrackRepository {
  private readonly CACHE_TTL = parseInt(process.env.CACHE_TRACK_TTL || '3600');
  private readonly KEY_PREFIX = 'track:';

  constructor(
    private readonly baseRepository: PrismaTrackRepository,
    private readonly cache: RedisService,
  ) {}

  async findById(id: string): Promise<Track | null> {
    const cacheKey = `${this.KEY_PREFIX}${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return Track.reconstruct(cached);
    }
    const track = await this.baseRepository.findById(id);
    if (track) {
      await this.cache.set(cacheKey, track.toPrimitives(), this.CACHE_TTL);
    }
    return track;
  }

  async findAll(skip: number, take: number): Promise<Track[]> {
    return this.baseRepository.findAll(skip, take);
  }

  async search(title: string, skip: number, take: number): Promise<Track[]> {
    return this.baseRepository.search(title, skip, take);
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

  async create(track: Track): Promise<Track> {
    return this.baseRepository.create(track);
  }

  async update(id: string, track: Partial<Track>): Promise<Track | null> {
    const updated = await this.baseRepository.update(id, track);
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
