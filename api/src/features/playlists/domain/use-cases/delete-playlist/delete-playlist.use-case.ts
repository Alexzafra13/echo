import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { DeletePlaylistInput, DeletePlaylistOutput } from './delete-playlist.dto';

@Injectable()
export class DeletePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: DeletePlaylistInput): Promise<DeletePlaylistOutput> {
    // 1. Validar input
    if (!input.id || input.id.trim() === '') {
      throw new ValidationError('Playlist ID is required');
    }

    // 2. Verificar que la playlist existe
    const existing = await this.playlistRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundError('Playlist', input.id);
    }

    // 3. SEGURIDAD: Verificar que el usuario es el propietario
    if (existing.ownerId !== input.userId) {
      throw new ForbiddenError('You do not have permission to delete this playlist');
    }

    // 4. Eliminar playlist (cascade eliminará los tracks)
    const deleted = await this.playlistRepository.delete(input.id);

    if (!deleted) {
      throw new NotFoundError('Playlist', input.id);
    }

    // 4. Retornar output
    return {
      success: true,
      message: `Playlist ${input.id} deleted successfully`,
    };
  }
}
