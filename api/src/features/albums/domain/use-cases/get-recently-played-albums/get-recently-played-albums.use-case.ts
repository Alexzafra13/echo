import { Injectable, Inject } from '@nestjs/common';
import { IAlbumRepository, ALBUM_REPOSITORY } from '../../ports/album-repository.port';
import { Album } from '../../entities/album.entity';

export interface GetRecentlyPlayedAlbumsInput {
  userId: string;
  limit?: number;
}

export interface GetRecentlyPlayedAlbumsOutput {
  albums: Album[];
}

@Injectable()
export class GetRecentlyPlayedAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetRecentlyPlayedAlbumsInput): Promise<GetRecentlyPlayedAlbumsOutput> {
    const limit = Math.min(100, Math.max(1, input.limit || 20));
    const albums = await this.albumRepository.findRecentlyPlayed(input.userId, limit);

    return {
      albums,
    };
  }
}
