import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetFeaturedAlbumOutput } from './get-featured-album.dto';

@Injectable()
export class GetFeaturedAlbumUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(): Promise<GetFeaturedAlbumOutput> {
    const mostPlayed = await this.albumRepository.findMostPlayed(1);

    if (mostPlayed.length > 0) {
      const album = mostPlayed[0];
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

    // Si no hay álbumes reproducidos, usa el más reciente
    const recent = await this.albumRepository.findRecent(1);
    if (recent.length > 0) {
      const album = recent[0];
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

    throw new NotFoundError('Album', 'No albums found in the library');
  }
}
