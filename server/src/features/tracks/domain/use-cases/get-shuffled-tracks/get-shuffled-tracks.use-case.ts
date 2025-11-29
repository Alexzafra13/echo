import { Injectable, Inject } from '@nestjs/common';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { GetShuffledTracksOutput } from './get-shuffled-tracks.dto';

@Injectable()
export class GetShuffledTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(): Promise<GetShuffledTracksOutput> {
    const tracks = await this.trackRepository.findAllShuffled();

    const data = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      albumId: track.albumId,
      artistId: track.artistId,
      albumArtistId: track.albumArtistId,
      trackNumber: track.trackNumber,
      discNumber: track.discNumber,
      year: track.year,
      duration: track.duration,
      path: track.path,
      bitRate: track.bitRate,
      size: track.size,
      suffix: track.suffix,
      albumName: track.albumName,
      artistName: track.artistName,
      albumArtistName: track.albumArtistName,
      compilation: track.compilation,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));

    return {
      data,
      total: tracks.length,
    };
  }
}
