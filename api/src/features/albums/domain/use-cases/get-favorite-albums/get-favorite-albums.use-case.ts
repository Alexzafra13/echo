import { Injectable, Inject } from '@nestjs/common';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

export interface GetFavoriteAlbumsInput {
  userId: string;
  page: number;
  limit: number;
}

export interface GetFavoriteAlbumsOutput {
  albums: Album[];
  page: number;
  limit: number;
  hasMore: boolean;
}

@Injectable()
export class GetFavoriteAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetFavoriteAlbumsInput): Promise<GetFavoriteAlbumsOutput> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 20));
    const skip = (page - 1) * limit;

    // Traemos limit + 1 para detectar si hay más páginas
    const albums = await this.albumRepository.findFavorites(input.userId, skip, limit + 1);

    const hasMore = albums.length > limit;
    const albumsToReturn = hasMore ? albums.slice(0, limit) : albums;

    return {
      albums: albumsToReturn,
      page,
      limit,
      hasMore,
    };
  }
}
