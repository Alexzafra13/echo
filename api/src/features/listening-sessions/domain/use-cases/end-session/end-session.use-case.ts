import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { EndSessionInput, EndSessionOutput } from './end-session.dto';

@Injectable()
export class EndSessionUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  async execute(input: EndSessionInput): Promise<EndSessionOutput> {
    if (!input.sessionId?.trim()) {
      throw new ValidationError('Session ID is required');
    }

    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session', input.sessionId);
    }

    if (!session.isActive) {
      throw new ValidationError('This listening session has already ended');
    }

    // Only the host can end the session
    if (session.hostId !== input.userId) {
      throw new ForbiddenError('Only the host can end the session');
    }

    await this.sessionRepository.end(input.sessionId);

    return {
      success: true,
      message: 'Listening session ended successfully',
    };
  }
}
