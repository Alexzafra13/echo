import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { GENRE_REPOSITORY, IGenreRepository } from '../../ports/genre-repository.port';
import { GetGenreInput, GetGenreOutput } from './get-genre.dto';

@Injectable()
export class GetGenreUseCase {
  constructor(
    @Inject(GENRE_REPOSITORY)
    private readonly genreRepository: IGenreRepository
  ) {}

  async execute(input: GetGenreInput): Promise<GetGenreOutput> {
    if (!input.id || input.id.trim() === '') {
      throw new NotFoundError('Genre', 'invalid-id');
    }

    const genre = await this.genreRepository.findById(input.id);
    if (!genre) {
      throw new NotFoundError('Genre', input.id);
    }

    return genre;
  }
}
