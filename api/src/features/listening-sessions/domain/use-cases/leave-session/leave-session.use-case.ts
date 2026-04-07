import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { LeaveSessionInput, LeaveSessionOutput } from './leave-session.dto';

@Injectable()
export class LeaveSessionUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  async execute(input: LeaveSessionInput): Promise<LeaveSessionOutput> {
    if (!input.sessionId?.trim()) {
      throw new ValidationError('Session ID is required');
    }

    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session', input.sessionId);
    }

    // If host leaves, end the session
    if (session.hostId === input.userId) {
      await this.sessionRepository.end(input.sessionId);
      return {
        success: true,
        message: 'Session ended because the host left',
      };
    }

    const removed = await this.sessionRepository.removeParticipant(input.sessionId, input.userId);
    if (!removed) {
      throw new NotFoundError('Participant', input.userId);
    }

    return {
      success: true,
      message: 'Left listening session successfully',
    };
  }
}
