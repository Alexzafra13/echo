import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { GetPlaylistsInput, GetPlaylistsOutput, PlaylistListItem } from './get-playlists.dto';

@Injectable()
export class GetPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: GetPlaylistsInput): Promise<GetPlaylistsOutput> {
    // 1. Validar pagination
    const skip = input.skip ?? 0;
    const take = input.take ?? 20;

    if (skip < 0) {
      throw new BadRequestException('Skip must be non-negative');
    }

    if (take <= 0 || take > 100) {
      throw new BadRequestException('Take must be between 1 and 100');
    }

    // 2. Obtener playlists según el filtro
    let playlists;
    let total;

    if (input.ownerId) {
      // Playlists del usuario
      playlists = await this.playlistRepository.findByOwnerId(input.ownerId, skip, take);
      total = await this.playlistRepository.countByOwnerId(input.ownerId);
    } else if (input.publicOnly) {
      // Solo playlists públicas
      playlists = await this.playlistRepository.findPublic(skip, take);
      total = await this.playlistRepository.count(); // Aproximación, podría ser más específico
    } else {
      // Todas las playlists (para admin)
      throw new BadRequestException('Must specify ownerId or publicOnly filter');
    }

    // 3. Obtener album IDs para cada playlist
    const playlistsWithAlbums = await Promise.all(
      playlists.map(async (playlist) => {
        const albumIds = await this.playlistRepository.getPlaylistAlbumIds(playlist.id);
        return {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          coverImageUrl: playlist.coverImageUrl,
          duration: playlist.duration,
          size: playlist.size,
          ownerId: playlist.ownerId,
          public: playlist.public,
          songCount: playlist.songCount,
          albumIds,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
        };
      }),
    );

    return {
      items: playlistsWithAlbums,
      total,
      skip,
      take,
    };
  }
}
