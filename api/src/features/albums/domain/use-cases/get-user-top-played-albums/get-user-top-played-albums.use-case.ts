import { Injectable, Inject } from '@nestjs/common';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import {
  GetUserTopPlayedAlbumsInput,
  GetUserTopPlayedAlbumsOutput,
} from './get-user-top-played-albums.dto';

@Injectable()
export class GetUserTopPlayedAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository
  ) {}

  async execute(input: GetUserTopPlayedAlbumsInput): Promise<GetUserTopPlayedAlbumsOutput[]> {
    const take = Math.min(50, Math.max(1, input.take ?? 10));
    const albums = await this.albumRepository.findMostPlayedByUser(input.userId, take);

    return albums.map((album) => ({
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
    }));
  }
}
