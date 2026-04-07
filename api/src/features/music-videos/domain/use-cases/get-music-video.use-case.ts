import { Injectable, Inject } from '@nestjs/common';
import {
  MUSIC_VIDEO_REPOSITORY,
  IMusicVideoRepository,
} from '../ports/music-video-repository.port';
import type { MusicVideoProps } from '../entities/music-video.entity';

@Injectable()
export class GetMusicVideoUseCase {
  constructor(
    @Inject(MUSIC_VIDEO_REPOSITORY)
    private readonly repository: IMusicVideoRepository
  ) {}

  async getByTrackId(trackId: string): Promise<MusicVideoProps | null> {
    return this.repository.findByTrackId(trackId);
  }

  async getById(id: string): Promise<MusicVideoProps | null> {
    return this.repository.findById(id);
  }

  async listAll(
    filter?: 'matched' | 'unmatched',
    limit?: number,
    offset?: number
  ): Promise<MusicVideoProps[]> {
    return this.repository.findAll(filter, limit, offset);
  }

  async getByArtistId(artistId: string): Promise<MusicVideoProps[]> {
    return this.repository.findByArtistId(artistId);
  }

  async linkToTrack(videoId: string, trackId: string): Promise<void> {
    await this.repository.linkToTrack(videoId, trackId, 'manual');
  }

  async unlinkFromTrack(videoId: string): Promise<void> {
    await this.repository.unlinkFromTrack(videoId);
  }
}
