import { Injectable, Inject } from '@nestjs/common';
import { validatePagination } from '@shared/utils';
import { ALBUM_REPOSITORY, IAlbumRepository } from '@features/albums/domain/ports/album-repository.port';
import { GetArtistAlbumsInput, GetArtistAlbumsOutput } from './get-artist-albums.dto';

/**
 * GetArtistAlbumsUseCase - Get albums for a specific artist
 *
 * Returns paginated list of albums belonging to the specified artist
 */
@Injectable()
export class GetArtistAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetArtistAlbumsInput): Promise<GetArtistAlbumsOutput> {
    const { skip, take } = validatePagination(input.skip ?? 0, input.take ?? 100);

    const albums = await this.albumRepository.findByArtistId(input.artistId, skip, take);

    // Get total count for this artist (fetch one more to check hasMore)
    const allAlbums = await this.albumRepository.findByArtistId(input.artistId, 0, 1000);
    const total = allAlbums.length;
    const hasMore = skip + take < total;

    return {
      data: albums.map((album) => ({
        id: album.id,
        name: album.name,
        artistId: album.artistId,
        artistName: album.artistName,
        coverArtPath: album.coverArtPath,
        year: album.year,
        songCount: album.songCount,
        duration: album.duration,
        createdAt: album.createdAt,
        updatedAt: album.updatedAt,
      })),
      total,
      skip,
      take,
      hasMore,
    };
  }
}
