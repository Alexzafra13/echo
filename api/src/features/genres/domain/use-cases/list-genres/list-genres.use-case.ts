import { Injectable, Inject } from '@nestjs/common';
import { GENRE_REPOSITORY, IGenreRepository } from '../../ports/genre-repository.port';
import { ListGenresInput, ListGenresOutput } from './list-genres.dto';

@Injectable()
export class ListGenresUseCase {
  constructor(
    @Inject(GENRE_REPOSITORY)
    private readonly genreRepository: IGenreRepository
  ) {}

  async execute(input: ListGenresInput): Promise<ListGenresOutput> {
    const skip = Math.max(0, input.skip);
    const take = Math.min(100, Math.max(1, input.take));
    const search = input.search?.trim() || undefined;

    const [data, total] = await Promise.all([
      this.genreRepository.list({
        skip,
        take,
        sort: input.sort,
        order: input.order,
        search,
      }),
      this.genreRepository.count(search),
    ]);

    return {
      data,
      total,
      skip,
      take,
      hasMore: skip + data.length < total,
    };
  }
}
