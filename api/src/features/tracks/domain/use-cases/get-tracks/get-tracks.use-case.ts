import { Injectable, Inject } from '@nestjs/common';
import { validatePagination } from '@shared/utils';
import { TRACK_REPOSITORY, ITrackRepository } from '../../ports/track-repository.port';
import { GetTracksInput, GetTracksOutput } from './get-tracks.dto';

@Injectable()
export class GetTracksUseCase {
  constructor(
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: GetTracksInput): Promise<GetTracksOutput> {
    const { skip, take } = validatePagination(input.skip, input.take);

    const [tracks, total] = await Promise.all([
      this.trackRepository.findAll(skip, take),
      this.trackRepository.count(),
    ]);

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
      lyrics: track.lyrics,
      comment: track.comment,
      albumName: track.albumName,
      artistName: track.artistName,
      albumArtistName: track.albumArtistName,
      compilation: track.compilation,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    }));

    const hasMore = skip + take < total;

    return {
      data,
      total,
      skip,
      take,
      hasMore,
    };
  }
}
