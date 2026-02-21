import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { UpdatePlaylistInput, UpdatePlaylistOutput } from './update-playlist.dto';

@Injectable()
export class UpdatePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository
  ) {}

  async execute(input: UpdatePlaylistInput): Promise<UpdatePlaylistOutput> {
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
      throw new ForbiddenError('You do not have permission to modify this playlist');
    }

    // 3. Preparar datos para actualizar
    const updates: Record<string, string | boolean | undefined> = {};

    if (input.name !== undefined) {
      if (input.name.trim() === '') {
        throw new ValidationError('Playlist name cannot be empty');
      }
      updates.name = input.name.trim();
      existing.updateName(updates.name);
    }

    if (input.description !== undefined) {
      updates.description = input.description?.trim();
      existing.updateDescription(updates.description);
    }

    if (input.coverImageUrl !== undefined) {
      updates.coverImageUrl = input.coverImageUrl?.trim();
      existing.updateCoverImage(updates.coverImageUrl);
    }

    if (input.public !== undefined) {
      updates.public = input.public;
      existing.setPublic(updates.public);
    }

    // 4. Actualizar en base de datos
    const updated = await this.playlistRepository.update(input.id, existing);

    if (!updated) {
      throw new NotFoundError('Playlist', input.id);
    }

    // 5. Retornar output
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      coverImageUrl: updated.coverImageUrl,
      duration: updated.duration,
      size: updated.size,
      ownerId: updated.ownerId,
      public: updated.public,
      songCount: updated.songCount,
      path: updated.path,
      sync: updated.sync,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
