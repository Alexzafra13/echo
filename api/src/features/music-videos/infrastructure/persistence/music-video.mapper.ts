import type { MusicVideo } from '@infrastructure/database/schema';
import type { MusicVideoProps, MatchMethod } from '../../domain/entities/music-video.entity';

export class MusicVideoMapper {
  static toDomain(row: MusicVideo): MusicVideoProps {
    return {
      id: row.id,
      trackId: row.trackId,
      path: row.path,
      title: row.title,
      artistName: row.artistName,
      duration: row.duration,
      width: row.width,
      height: row.height,
      codec: row.codec,
      bitRate: row.bitRate,
      size: row.size,
      suffix: row.suffix,
      thumbnailPath: row.thumbnailPath,
      matchMethod: row.matchMethod as MatchMethod | null,
      missingAt: row.missingAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
