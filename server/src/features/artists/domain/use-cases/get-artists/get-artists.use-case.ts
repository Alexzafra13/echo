import { Injectable, Inject } from '@nestjs/common';
import { validatePagination } from '@shared/utils';
import { ARTIST_REPOSITORY, IArtistRepository } from '../../ports/artist-repository.port';
import { GetArtistsInput, GetArtistsOutput } from './get-artists.dto';

@Injectable()
export class GetArtistsUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepository: IArtistRepository,
  ) {}

  async execute(input: GetArtistsInput): Promise<GetArtistsOutput> {
    const { skip, take } = validatePagination(input.skip, input.take);

    const [artists, total] = await Promise.all([
      this.artistRepository.findAll(skip, take),
      this.artistRepository.count(),
    ]);

    const data = artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      albumCount: artist.albumCount,
      songCount: artist.songCount,
      mbzArtistId: artist.mbzArtistId,
      biography: artist.biography,
      smallImageUrl: artist.smallImageUrl,
      mediumImageUrl: artist.mediumImageUrl,
      largeImageUrl: artist.largeImageUrl,
      externalUrl: artist.externalUrl,
      externalInfoUpdatedAt: artist.externalInfoUpdatedAt,
      orderArtistName: artist.orderArtistName,
      size: artist.size,
      createdAt: artist.createdAt,
      updatedAt: artist.updatedAt,
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
