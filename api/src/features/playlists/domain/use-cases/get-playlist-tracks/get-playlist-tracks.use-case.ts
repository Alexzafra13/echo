import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { validatePagination } from '@shared/utils';
import { assertCanViewPlaylist } from '../../services/playlist-authorization';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { GetPlaylistTracksInput, GetPlaylistTracksOutput } from './get-playlist-tracks.dto';
import { mapPlaylistTrack } from '../../services/playlist-track-mapper';

@Injectable()
export class GetPlaylistTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository
  ) {}

  async execute(input: GetPlaylistTracksInput): Promise<GetPlaylistTracksOutput> {
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    await assertCanViewPlaylist(playlist, input.requesterId, this.collaboratorRepository);

    const { skip, take } = validatePagination(input.skip, input.take);
    const [tracks, total] = await Promise.all([
      this.playlistRepository.getPlaylistTracks(input.playlistId, skip, take),
      this.playlistRepository.countPlaylistTracks(input.playlistId),
    ]);

    const items = tracks.map((track) => mapPlaylistTrack(track));

    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      tracks: items,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    };
  }
}
