import { Injectable } from '@nestjs/common';
import { eq, isNull, isNotNull, sql, and, inArray } from 'drizzle-orm';
import { DrizzleService } from '@infrastructure/database/drizzle.service';
import { musicVideos, tracks } from '@infrastructure/database/schema';
import { IMusicVideoRepository } from '../../domain/ports/music-video-repository.port';
import { MusicVideoProps, MatchMethod } from '../../domain/entities/music-video.entity';
import { MusicVideoMapper } from './music-video.mapper';
// path import removed - was unused

@Injectable()
export class DrizzleMusicVideoRepository implements IMusicVideoRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: string): Promise<MusicVideoProps | null> {
    const result = await this.drizzle.db
      .select()
      .from(musicVideos)
      .where(eq(musicVideos.id, id))
      .limit(1);
    return result[0] ? MusicVideoMapper.toDomain(result[0]) : null;
  }

  async findByTrackId(trackId: string): Promise<MusicVideoProps | null> {
    const result = await this.drizzle.db
      .select()
      .from(musicVideos)
      .where(eq(musicVideos.trackId, trackId))
      .limit(1);
    return result[0] ? MusicVideoMapper.toDomain(result[0]) : null;
  }

  async findByPath(videoPath: string): Promise<MusicVideoProps | null> {
    const result = await this.drizzle.db
      .select()
      .from(musicVideos)
      .where(eq(musicVideos.path, videoPath))
      .limit(1);
    return result[0] ? MusicVideoMapper.toDomain(result[0]) : null;
  }

  async findAll(
    filter?: 'matched' | 'unmatched',
    limit = 100,
    offset = 0
  ): Promise<MusicVideoProps[]> {
    const conditions = [];

    if (filter === 'matched') {
      conditions.push(isNotNull(musicVideos.trackId));
    } else if (filter === 'unmatched') {
      conditions.push(isNull(musicVideos.trackId));
    }

    const result = await this.drizzle.db
      .select()
      .from(musicVideos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(musicVideos.title)
      .limit(limit)
      .offset(offset);

    return result.map(MusicVideoMapper.toDomain);
  }

  async findByArtistId(artistId: string): Promise<MusicVideoProps[]> {
    const result = await this.drizzle.db
      .select({
        musicVideo: musicVideos,
      })
      .from(musicVideos)
      .innerJoin(tracks, eq(musicVideos.trackId, tracks.id))
      .where(eq(tracks.artistId, artistId))
      .orderBy(musicVideos.title);

    return result.map((r) => MusicVideoMapper.toDomain(r.musicVideo));
  }

  async create(
    data: Omit<MusicVideoProps, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MusicVideoProps> {
    const result = await this.drizzle.db
      .insert(musicVideos)
      .values({
        trackId: data.trackId,
        path: data.path,
        title: data.title,
        artistName: data.artistName,
        duration: data.duration,
        width: data.width,
        height: data.height,
        codec: data.codec,
        bitRate: data.bitRate,
        size: data.size,
        suffix: data.suffix,
        thumbnailPath: data.thumbnailPath,
        matchMethod: data.matchMethod,
        missingAt: data.missingAt,
      })
      .returning();

    return MusicVideoMapper.toDomain(result[0]);
  }

  async update(id: string, data: Partial<MusicVideoProps>): Promise<void> {
    // Exclude immutable fields to prevent accidental overwrites
    const { id: _id, createdAt: _createdAt, ...safeData } = data;
    await this.drizzle.db
      .update(musicVideos)
      .set({ ...safeData, updatedAt: new Date() })
      .where(eq(musicVideos.id, id));
  }

  async linkToTrack(videoId: string, trackId: string, method: MatchMethod): Promise<void> {
    await this.drizzle.db
      .update(musicVideos)
      .set({ trackId, matchMethod: method, updatedAt: new Date() })
      .where(eq(musicVideos.id, videoId));
  }

  async unlinkFromTrack(videoId: string): Promise<void> {
    await this.drizzle.db
      .update(musicVideos)
      .set({ trackId: null, matchMethod: null, updatedAt: new Date() })
      .where(eq(musicVideos.id, videoId));
  }

  async getVideoIdsByTrackIds(trackIds: string[]): Promise<Map<string, string>> {
    if (trackIds.length === 0) return new Map();

    const result = await this.drizzle.db
      .select({ trackId: musicVideos.trackId, videoId: musicVideos.id })
      .from(musicVideos)
      .where(inArray(musicVideos.trackId, trackIds));

    const map = new Map<string, string>();
    for (const r of result) {
      if (r.trackId) map.set(r.trackId, r.videoId);
    }
    return map;
  }

  async getAllPaths(): Promise<{ id: string; path: string }[]> {
    return this.drizzle.db.select({ id: musicVideos.id, path: musicVideos.path }).from(musicVideos);
  }

  async markMissing(id: string): Promise<void> {
    await this.drizzle.db
      .update(musicVideos)
      .set({ missingAt: new Date(), updatedAt: new Date() })
      .where(eq(musicVideos.id, id));
  }

  async findTrackByBaseName(
    directory: string,
    baseName: string
  ): Promise<{ id: string; title: string; artistName: string | null } | null> {
    // Escape LIKE wildcards (% and _) in user-derived values to prevent incorrect matches
    const escapedBaseName = baseName.replace(/[%_\\]/g, '\\$&');
    const pattern = `${directory}/${escapedBaseName}.%`;

    const result = await this.drizzle.db
      .select({
        id: tracks.id,
        title: tracks.title,
        artistName: tracks.artistName,
      })
      .from(tracks)
      .where(sql`${tracks.path} LIKE ${pattern} ESCAPE '\\'`)
      .limit(1);

    return result[0] || null;
  }

  async findTrackByTitleArtist(title: string, artistName: string): Promise<{ id: string } | null> {
    const result = await this.drizzle.db
      .select({ id: tracks.id })
      .from(tracks)
      .where(
        and(
          sql`LOWER(${tracks.title}) = LOWER(${title})`,
          sql`LOWER(${tracks.artistName}) = LOWER(${artistName})`
        )
      )
      .limit(1);

    return result[0] || null;
  }
}
