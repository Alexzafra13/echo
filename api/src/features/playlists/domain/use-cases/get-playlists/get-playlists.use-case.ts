import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { validatePagination } from '@shared/utils';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { GetPlaylistsInput, GetPlaylistsOutput, PlaylistListItem } from './get-playlists.dto';

@Injectable()
export class GetPlaylistsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: GetPlaylistsInput): Promise<GetPlaylistsOutput> {
    const { skip, take } = validatePagination(input.skip, input.take ?? 20);

    let playlists;
    let total;

    if (input.ownerId) {
      playlists = await this.playlistRepository.findByOwnerId(input.ownerId, skip, take);
      total = await this.playlistRepository.countByOwnerId(input.ownerId);
    } else if (input.publicOnly) {
      playlists = await this.playlistRepository.findPublic(skip, take);
      total = await this.playlistRepository.count();
    } else {
      throw new ValidationError('Must specify ownerId or publicOnly filter');
    }

    const playlistIds = playlists.map(p => p.id);
    const albumIdsMap = await this.playlistRepository.getBatchPlaylistAlbumIds(playlistIds);

    const playlistsWithAlbums = playlists.map((playlist) => {
      const albumIds = albumIdsMap.get(playlist.id) || [];
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
    });

    return {
      items: playlistsWithAlbums,
      total,
      skip,
      take,
    };
  }
}
