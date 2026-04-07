import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { UpdateCollaboratorRoleInput, UpdateCollaboratorRoleOutput } from './update-collaborator-role.dto';

@Injectable()
export class UpdateCollaboratorRoleUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository,
  ) {}

  async execute(input: UpdateCollaboratorRoleInput): Promise<UpdateCollaboratorRoleOutput> {
    if (!input.playlistId?.trim()) {
      throw new ValidationError('Playlist ID is required');
    }
    if (!['editor', 'viewer'].includes(input.role)) {
      throw new ValidationError('Role must be editor or viewer');
    }

    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    if (playlist.ownerId !== input.requesterId) {
      throw new ForbiddenError('Only the playlist owner can change collaborator roles');
    }

    const collaborator = await this.collaboratorRepository.findByPlaylistAndUser(
      input.playlistId,
      input.targetUserId,
    );
    if (!collaborator) {
      throw new NotFoundError('Collaborator', input.targetUserId);
    }

    const updated = await this.collaboratorRepository.updateRole(collaborator.id, input.role);
    if (!updated) {
      throw new NotFoundError('Collaborator', collaborator.id);
    }

    return {
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      message: 'Collaborator role updated successfully',
    };
  }
}
