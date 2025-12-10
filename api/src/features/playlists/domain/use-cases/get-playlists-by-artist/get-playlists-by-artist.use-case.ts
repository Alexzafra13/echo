import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { validatePagination } from '@shared/utils';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { IUserRepository, USER_REPOSITORY } from '@features/auth/domain/ports/user-repository.port';
import {
  GetPlaylistsByArtistInput,
  GetPlaylistsByArtistOutput,
  PlaylistByArtistItem,
} from './get-playlists-by-artist.dto';

@Injectable()
export class GetPlaylistsByArtistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: GetPlaylistsByArtistInput): Promise<GetPlaylistsByArtistOutput> {
    // 1. Validar input
    if (!input.artistId || input.artistId.trim() === '') {
      throw new BadRequestException('Artist ID is required');
    }

    if (!input.userId || input.userId.trim() === '') {
      throw new BadRequestException('User ID is required');
    }

    const { skip, take } = validatePagination(input.skip, input.take ?? 20);

    // 2. Buscar playlists que contengan tracks del artista
    const { playlists, total } = await this.playlistRepository.findByArtistId(
      input.artistId,
      input.userId,
      skip,
      take,
    );

    // 3. Obtener album IDs para cada playlist (para mostrar covers)
    const playlistIds = playlists.map((p) => p.id);
    const albumIdsMap = await this.playlistRepository.getBatchPlaylistAlbumIds(playlistIds);

    // 4. Obtener owner names para todas las playlists
    const ownerIds = [...new Set(playlists.map((p) => p.ownerId))];
    const ownerMap = new Map<string, string>();

    for (const ownerId of ownerIds) {
      const owner = await this.userRepository.findById(ownerId);
      if (owner) {
        ownerMap.set(ownerId, owner.name || owner.username || 'Unknown');
      }
    }

    // 5. Construir respuesta
    const items: PlaylistByArtistItem[] = playlists.map((playlist) => {
      const albumIds = albumIdsMap.get(playlist.id) || [];
      return {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverImageUrl: playlist.coverImageUrl,
        duration: playlist.duration,
        size: playlist.size,
        ownerId: playlist.ownerId,
        ownerName: ownerMap.get(playlist.ownerId),
        public: playlist.public,
        songCount: playlist.songCount,
        albumIds,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
      };
    });

    return {
      items,
      total,
      skip,
      take,
    };
  }
}
