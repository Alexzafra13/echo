import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { GetCollaboratorsInput, GetCollaboratorsOutput } from './get-collaborators.dto';

@Injectable()
export class GetCollaboratorsUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository,
  ) {}

  async execute(input: GetCollaboratorsInput): Promise<GetCollaboratorsOutput> {
    if (!input.playlistId?.trim()) {
      throw new ValidationError('Playlist ID is required');
    }

    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // Only owner and collaborators can see the collaborator list
    const isOwner = playlist.ownerId === input.requesterId;
    const isCollaborator = await this.collaboratorRepository.hasAccess(
      input.playlistId,
      input.requesterId,
    );

    if (!isOwner && !isCollaborator) {
      throw new ForbiddenError('You do not have access to view collaborators');
    }

    const collaborators = await this.collaboratorRepository.findByPlaylistId(input.playlistId);

    return {
      playlistId: input.playlistId,
      collaborators,
    };
  }
}
