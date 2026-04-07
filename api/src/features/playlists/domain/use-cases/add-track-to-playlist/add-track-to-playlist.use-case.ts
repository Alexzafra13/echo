import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ConflictError } from '@shared/errors';
import { assertCanEditPlaylist } from '../../services/playlist-authorization';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { AddTrackToPlaylistInput, AddTrackToPlaylistOutput } from './add-track-to-playlist.dto';

@Injectable()
export class AddTrackToPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository
  ) {}

  async execute(input: AddTrackToPlaylistInput): Promise<AddTrackToPlaylistOutput> {
    // 1. Verificar que la playlist existe
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // 3. SEGURIDAD: Verificar que el usuario es el propietario o editor colaborador
    await assertCanEditPlaylist(playlist, input.userId, this.collaboratorRepository);

    // 4. Verificar que el track existe
    const track = await this.trackRepository.findById(input.trackId);
    if (!track) {
      throw new NotFoundError('Track', input.trackId);
    }

    // 4. Verificar que el track no está ya en la playlist
    const isInPlaylist = await this.playlistRepository.isTrackInPlaylist(
      input.playlistId,
      input.trackId
    );
    if (isInPlaylist) {
      throw new ConflictError('Esta canción ya está en la playlist');
    }

    // 5. Agregar track con auto-asignación de orden (race condition safe)
    const added = await this.playlistRepository.addTrackWithAutoOrder(
      input.playlistId,
      input.trackId
    );

    // 6. Recalcular metadata desde datos reales (evita desincronización)
    await this.playlistRepository.recalculateMetadata(input.playlistId);

    // 7. Retornar output
    return {
      playlistId: added.playlistId,
      trackId: added.trackId,
      trackOrder: added.trackOrder,
      createdAt: added.createdAt,
      message: 'Track added to playlist successfully',
    };
  }
}
