import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { GetPlaylistInput, GetPlaylistOutput } from './get-playlist.dto';

@Injectable()
export class GetPlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: GetPlaylistInput): Promise<GetPlaylistOutput> {
    // 1. Validar input
    if (!input.id || input.id.trim() === '') {
      throw new BadRequestException('Playlist ID is required');
    }

    // 2. Buscar playlist
    const playlist = await this.playlistRepository.findById(input.id);

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${input.id} not found`);
    }

    // 3. Retornar output
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
      path: playlist.path,
      sync: playlist.sync,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  }
}
