import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { ICollaboratorRepository, COLLABORATOR_REPOSITORY } from '../../ports';
import { AcceptCollaborationInput, AcceptCollaborationOutput } from './accept-collaboration.dto';

@Injectable()
export class AcceptCollaborationUseCase {
  constructor(
    @Inject(COLLABORATOR_REPOSITORY)
    private readonly collaboratorRepository: ICollaboratorRepository,
  ) {}

  async execute(input: AcceptCollaborationInput): Promise<AcceptCollaborationOutput> {
    if (!input.collaborationId?.trim()) {
      throw new ValidationError('Collaboration ID is required');
    }

    const collaboration = await this.collaboratorRepository.findById(input.collaborationId);
    if (!collaboration) {
      throw new NotFoundError('Collaboration', input.collaborationId);
    }

    // Only the invited user can accept
    if (collaboration.userId !== input.userId) {
      throw new ForbiddenError('Only the invited user can accept this collaboration');
    }

    if (collaboration.status === 'accepted') {
      throw new ValidationError('Collaboration is already accepted');
    }

    const updated = await this.collaboratorRepository.updateStatus(input.collaborationId, 'accepted');
    if (!updated) {
      throw new NotFoundError('Collaboration', input.collaborationId);
    }

    return {
      id: updated.id,
      playlistId: updated.playlistId,
      userId: updated.userId,
      role: updated.role,
      status: updated.status,
      message: 'Collaboration accepted successfully',
    };
  }
}
