import { Injectable, Inject } from '@nestjs/common';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

export interface GetAlbumsAlphabeticallyInput {
  page: number;
  limit: number;
}

export interface GetAlbumsAlphabeticallyOutput {
  albums: Album[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GetAlbumsAlphabeticallyUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumsAlphabeticallyInput): Promise<GetAlbumsAlphabeticallyOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 20));
    const skip = (page - 1) * limit;

    const [albums, total] = await Promise.all([
      this.albumRepository.findAlphabetically(skip, limit),
      this.albumRepository.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      albums,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
