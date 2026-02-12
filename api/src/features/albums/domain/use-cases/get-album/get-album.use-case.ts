import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { Album } from '../../entities/album.entity';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetAlbumInput, GetAlbumOutput } from './get-album.dto';

@Injectable()
export class GetAlbumUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumInput): Promise<GetAlbumOutput> {
    if (!input.id || input.id.trim() === '') {
      throw new NotFoundError('Album', 'invalid-id');
    }

    const album = await this.albumRepository.findById(input.id);
    if (!album) {
      throw new NotFoundError('Album', input.id);
    }

    return {
      id: album.id,
      name: album.name,
      artistId: album.artistId,
      artistName: album.artistName,
      albumArtistId: album.albumArtistId,
      coverArtPath: album.coverArtPath,
      year: album.year,
      releaseDate: album.releaseDate,
      compilation: album.compilation,
      songCount: album.songCount,
      duration: album.duration,
      size: album.size,
      description: album.description,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    };
  }
}