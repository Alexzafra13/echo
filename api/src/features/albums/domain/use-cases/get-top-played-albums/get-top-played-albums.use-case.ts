import { Injectable, Inject } from '@nestjs/common';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetTopPlayedAlbumsInput, GetTopPlayedAlbumsOutput } from './get-top-played-albums.dto';

@Injectable()
export class GetTopPlayedAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetTopPlayedAlbumsInput = {}): Promise<GetTopPlayedAlbumsOutput> {
    const take = Math.min(50, Math.max(1, input.take ?? 10));
    const albums = await this.albumRepository.findMostPlayed(take);

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
