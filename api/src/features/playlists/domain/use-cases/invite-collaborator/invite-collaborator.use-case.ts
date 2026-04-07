import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '@shared/errors';
import { IPlaylistRepository, PLAYLIST_REPOSITORY } from '../../ports';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { IUserRepository, USER_REPOSITORY } from '@features/auth/domain/ports/user-repository.port';
import { PlaylistCollaborator } from '../../entities/playlist-collaborator.entity';
import { InviteCollaboratorInput, InviteCollaboratorOutput } from './invite-collaborator.dto';

@Injectable()
export class InviteCollaboratorUseCase {
  constructor(
    @Inject(PLAYLIST_REPOSITORY)
    private readonly playlistRepository: IPlaylistRepository,
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: InviteCollaboratorInput): Promise<InviteCollaboratorOutput> {
    if (!input.playlistId?.trim()) {
      throw new ValidationError('Playlist ID is required');
    }
    if (!input.targetUserId?.trim()) {
      throw new ValidationError('Target user ID is required');
    }
    if (!['editor', 'viewer'].includes(input.role)) {
      throw new ValidationError('Role must be editor or viewer');
    }

    // Verify playlist exists
    const playlist = await this.playlistRepository.findById(input.playlistId);
    if (!playlist) {
      throw new NotFoundError('Playlist', input.playlistId);
    }

    // Only the owner can invite collaborators
    if (playlist.ownerId !== input.inviterId) {
      throw new ForbiddenError('Only the playlist owner can invite collaborators');
    }

    // Cannot invite yourself
    if (input.targetUserId === input.inviterId) {
      throw new ValidationError('You cannot invite yourself as a collaborator');
    }

    // Verify target user exists
    const targetUser = await this.userRepository.findById(input.targetUserId);
    if (!targetUser) {
      throw new NotFoundError('User', input.targetUserId);
    }

    // Check if already a collaborator
    const existing = await this.collaboratorRepository.findByPlaylistAndUser(
      input.playlistId,
      input.targetUserId,
    );
    if (existing) {
      throw new ConflictError('User is already a collaborator on this playlist');
    }

    // Create collaboration
    const collaborator = PlaylistCollaborator.create({
      playlistId: input.playlistId,
      userId: input.targetUserId,
      role: input.role,
      status: 'pending',
      invitedBy: input.inviterId,
    });

    const created = await this.collaboratorRepository.create(collaborator);

    return {
      id: created.id,
      playlistId: created.playlistId,
      userId: created.userId,
      role: created.role,
      status: created.status,
      createdAt: created.createdAt,
      message: 'Collaboration invitation sent successfully',
    };
  }
}
