import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { GENRE_REPOSITORY, IGenreRepository } from '../../ports/genre-repository.port';
import { GetArtistsByGenreInput, GetArtistsByGenreOutput } from './get-artists-by-genre.dto';

@Injectable()
export class GetArtistsByGenreUseCase {
  constructor(
    @Inject(GENRE_REPOSITORY)
    private readonly genreRepository: IGenreRepository
  ) {}

  async execute(input: GetArtistsByGenreInput): Promise<GetArtistsByGenreOutput> {
    const skip = Math.max(0, input.skip);
    const take = Math.min(100, Math.max(1, input.take));

    const genre = await this.genreRepository.findById(input.genreId);
    if (!genre) {
      throw new NotFoundError('Genre', input.genreId);
    }

    const result = await this.genreRepository.findArtistsByGenre({
      genreId: input.genreId,
      skip,
      take,
      sort: input.sort,
      order: input.order,
    });

    return {
      data: result.data,
      total: result.total,
      skip,
      take,
      hasMore: skip + result.data.length < result.total,
    };
  }
}
