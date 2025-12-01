import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { UpdatePlaylistInput, UpdatePlaylistOutput } from './update-playlist.dto';

@Injectable()
export class UpdatePlaylistUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
  ) {}

  async execute(input: UpdatePlaylistInput): Promise<UpdatePlaylistOutput> {
    // 1. Validar input
    if (!input.id || input.id.trim() === '') {
      throw new BadRequestException('Playlist ID is required');
    }

    // 2. Verificar que la playlist existe
    const existing = await this.playlistRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Playlist with ID ${input.id} not found`);
    }

    // 3. SEGURIDAD: Verificar que el usuario es el propietario
    if (existing.ownerId !== input.userId) {
      throw new ForbiddenException('You do not have permission to modify this playlist');
    }

    // 3. Preparar datos para actualizar
    const updates: any = {};

    if (input.name !== undefined) {
      if (input.name.trim() === '') {
        throw new BadRequestException('Playlist name cannot be empty');
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
      throw new NotFoundException(`Playlist with ID ${input.id} not found`);
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
