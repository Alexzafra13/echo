import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
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
      throw new BadRequestException('Playlist ID is required');
    }

    // 2. Verificar que la playlist existe
    const existing = await this.playlistRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Playlist with ID ${input.id} not found`);
    }

    // 3. Eliminar playlist (cascade eliminará los tracks)
    const deleted = await this.playlistRepository.delete(input.id);

    if (!deleted) {
      throw new NotFoundException(`Playlist with ID ${input.id} not found`);
    }

    // 4. Retornar output
    return {
      success: true,
      message: `Playlist ${input.id} deleted successfully`,
    };
  }
}
