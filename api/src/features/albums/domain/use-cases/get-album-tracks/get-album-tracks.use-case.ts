import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { validatePagination } from '@shared/utils';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { GetAlbumTracksInput, GetAlbumTracksOutput } from './get-album-tracks.dto';

@Injectable()
export class GetAlbumTracksUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: GetAlbumTracksInput): Promise<GetAlbumTracksOutput> {
    if (!input.albumId || input.albumId.trim() === '') {
      throw new NotFoundError('Album', 'ID is required');
    }

    const album = await this.albumRepository.findById(input.albumId);
    if (!album) {
      throw new NotFoundError('Album', input.albumId);
    }

    const { skip, take } = validatePagination(input.skip, input.take);
    const [tracks, total] = await Promise.all([
      this.trackRepository.findByAlbumId(input.albumId, true, skip, take),
      this.trackRepository.countByAlbumId(input.albumId),
    ]);

    return {
      tracks,
      albumId: input.albumId,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }
}
