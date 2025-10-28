import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ReorderPlaylistTracksInput, ReorderPlaylistTracksOutput } from './reorder-playlist-tracks.dto';

@Injectable()
export class ReorderPlaylistTracksUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: ReorderPlaylistTracksInput): Promise<ReorderPlaylistTracksOutput> {
    // 1. Validar input
    if (!input.playlistId || input.playlistId.trim() === '') {
      throw new BadRequestException('Playlist ID is required');
    }

    if (!input.trackOrders || input.trackOrders.length === 0) {
      throw new BadRequestException('Track orders array is required and cannot be empty');
    }

    // 2. Verificar que la playlist existe
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${input.playlistId} not found`);
    }

    // 3. Validar que los órdenes sean válidos
    for (const item of input.trackOrders) {
      if (!item.trackId || item.trackId.trim() === '') {
        throw new BadRequestException('Track ID is required for each track order');
      }
      if (item.order < 0) {
        throw new BadRequestException('Track order must be non-negative');
      }
    }

    // 4. Verificar que todos los tracks están en la playlist
    for (const item of input.trackOrders) {
      const isInPlaylist = await this.playlistRepository.isTrackInPlaylist(input.playlistId, item.trackId);
      if (!isInPlaylist) {
        throw new NotFoundException(`Track ${item.trackId} is not in playlist ${input.playlistId}`);
      }
    }

    // 5. Reordenar tracks
    const reordered = await this.playlistRepository.reorderTracks(input.playlistId, input.trackOrders);

    if (!reordered) {
      throw new BadRequestException(`Failed to reorder tracks in playlist ${input.playlistId}`);
    }

    // 6. Retornar output
    return {
      success: true,
      message: `Tracks in playlist ${input.playlistId} reordered successfully`,
      playlistId: input.playlistId,
    };
  }
}
