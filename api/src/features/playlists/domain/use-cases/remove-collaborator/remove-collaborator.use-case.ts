import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { RemoveCollaboratorInput, RemoveCollaboratorOutput } from './remove-collaborator.dto';

@Injectable()
export class RemoveCollaboratorUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository,
  ) {}

  async execute(input: RemoveCollaboratorInput): Promise<RemoveCollaboratorOutput> {
    if (!input.playlistId?.trim()) {
      throw new ValidationError('Playlist ID is required');
    }
    if (!input.targetUserId?.trim()) {
      throw new ValidationError('Target user ID is required');
    }

    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // Owner can remove anyone; a collaborator can remove themselves
    const isOwner = playlist.ownerId === input.requesterId;
    const isSelf = input.targetUserId === input.requesterId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenError('Only the owner or the collaborator themselves can remove collaboration');
    }

    const deleted = await this.collaboratorRepository.deleteByPlaylistAndUser(
      input.playlistId,
      input.targetUserId,
    );

    if (!deleted) {
      throw new NotFoundError('Collaborator', input.targetUserId);
    }

    return {
      success: true,
      message: 'Collaborator removed successfully',
    };
  }
}
