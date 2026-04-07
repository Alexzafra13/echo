import { MusicVideoProps, MatchMethod } from '../entities/music-video.entity';

export const MUSIC_VIDEO_REPOSITORY = Symbol('MUSIC_VIDEO_REPOSITORY');

export interface IMusicVideoRepository {
  findById(id: string): Promise<MusicVideoProps | null>;
  findByTrackId(trackId: string): Promise<MusicVideoProps | null>;
  findByPath(path: string): Promise<MusicVideoProps | null>;
  findAll(filter?: 'matched' | 'unmatched', limit?: number, offset?: number): Promise<MusicVideoProps[]>;
  findByArtistId(artistId: string): Promise<MusicVideoProps[]>;

  create(data: Omit<MusicVideoProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<MusicVideoProps>;
  update(id: string, data: Partial<MusicVideoProps>): Promise<void>;

  linkToTrack(videoId: string, trackId: string, method: MatchMethod): Promise<void>;
  unlinkFromTrack(videoId: string): Promise<void>;

  /** Get video IDs mapped by track ID (batch lookup) */
  getVideoIdsByTrackIds(trackIds: string[]): Promise<Map<string, string>>;

  /** Get all indexed video paths (for pruning) */
  getAllPaths(): Promise<{ id: string; path: string }[]>;
  /** Mark a video as missing */
  markMissing(id: string): Promise<void>;

  /** Find tracks by base filename (without extension) in the same directory */
  findTrackByBaseName(
    directory: string,
    baseName: string
  ): Promise<{ id: string; title: string; artistName: string | null } | null>;
  /** Find tracks by title + artist match */
  findTrackByTitleArtist(title: string, artistName: string): Promise<{ id: string } | null>;
}
