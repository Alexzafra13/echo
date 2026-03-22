import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { UpdateParticipantRoleInput, UpdateParticipantRoleOutput } from './update-participant-role.dto';

@Injectable()
export class UpdateParticipantRoleUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  async execute(input: UpdateParticipantRoleInput): Promise<UpdateParticipantRoleOutput> {
    if (!input.sessionId?.trim()) {
      throw new ValidationError('Session ID is required');
    }
    if (!['dj', 'listener'].includes(input.role)) {
      throw new ValidationError('Role must be dj or listener');
    }

    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session', input.sessionId);
    }

    if (!session.isActive) {
      throw new ValidationError('This listening session has ended');
    }

    // Only host can change roles
    if (session.hostId !== input.requesterId) {
      throw new ForbiddenError('Only the host can change participant roles');
    }

    // Cannot change host role
    if (input.targetUserId === session.hostId) {
      throw new ValidationError('Cannot change the host role');
    }

    const participant = await this.sessionRepository.getParticipant(input.sessionId, input.targetUserId);
    if (!participant) {
      throw new NotFoundError('Participant', input.targetUserId);
    }

    await this.sessionRepository.updateParticipantRole(input.sessionId, input.targetUserId, input.role);

    return {
      userId: input.targetUserId,
      role: input.role,
      message: 'Participant role updated successfully',
    };
  }
}
