import { Injectable, Inject } from '@nestjs/common';
import { validatePagination } from '@shared/utils';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { GetPlaylistsByArtistInput, GetPlaylistsByArtistOutput } from './get-playlists-by-artist.dto';

@Injectable()
export class GetPlaylistsByArtistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: GetPlaylistsByArtistInput): Promise<GetPlaylistsByArtistOutput> {
    const { skip, take } = validatePagination(input.skip, input.take ?? 20);

    const playlists = await this.playlistRepository.findPublicByArtistId(input.artistId, skip, take);
    const total = await this.playlistRepository.countPublicByArtistId(input.artistId);

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
