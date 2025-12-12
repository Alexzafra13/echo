import { Injectable, Inject } from '@nestjs/common';
import { validatePagination } from '@shared/utils';
import { Album } from '../../entities/album.entity';
import { ALBUM_REPOSITORY, IAlbumRepository } from '../../ports/album-repository.port';
import { GetAlbumsInput, GetAlbumsOutput } from './get-albums.dto';

@Injectable()
export class GetAlbumsUseCase {
  constructor(
    @Inject(ALBUM_REPOSITORY)
    private readonly albumRepository: IAlbumRepository,
  ) {}

  async execute(input: GetAlbumsInput): Promise<GetAlbumsOutput> {
    const { skip, take } = validatePagination(input.skip, input.take);

    // Ejecutar queries en paralelo para mejor rendimiento
    const [albums, total] = await Promise.all([
      this.albumRepository.findAll(skip, take),
      this.albumRepository.count(),
    ]);
    const hasMore = skip + take < total;

    return {
      data: albums.map((album) => ({
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
      })),
      total,
      skip,
      take,
      hasMore,
    };
  }
}