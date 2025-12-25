import { Injectable, Inject } from '@nestjs/common';
import { ValidationError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { Playlist } from '../../entities';
import { CreatePlaylistInput, CreatePlaylistOutput } from './create-playlist.dto';

@Injectable()
export class CreatePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: CreatePlaylistInput): Promise<CreatePlaylistOutput> {
    // 1. Validar input
    if (!input.name || input.name.trim() === '') {
      throw new ValidationError('Playlist name is required');
    }

    if (!input.ownerId || input.ownerId.trim() === '') {
      throw new ValidationError('Owner ID is required');
    }

    // 2. Crear entidad Playlist
    const playlist = Playlist.create({
      name: input.name.trim(),
      description: input.description?.trim(),
      coverImageUrl: input.coverImageUrl?.trim(),
      duration: 0,
      size: Number(0),
      ownerId: input.ownerId,
      public: input.public ?? false,
      songCount: 0,
      path: input.path?.trim(),
      sync: false,
    });

    // 3. Guardar en base de datos
    const created = await this.playlistRepository.create(playlist);

    // 4. Retornar output
    return {
      id: created.id,
      name: created.name,
      description: created.description,
      coverImageUrl: created.coverImageUrl,
      duration: created.duration,
      size: created.size,
      ownerId: created.ownerId,
      public: created.public,
      songCount: created.songCount,
      path: created.path,
      sync: created.sync,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }
}
