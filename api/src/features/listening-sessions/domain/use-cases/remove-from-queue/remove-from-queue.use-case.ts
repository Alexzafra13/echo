import { Injectable, Inject } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';

export interface RemoveFromQueueInput {
  sessionId: string;
  queueItemId: string;
  userId: string;
}

@Injectable()
export class RemoveFromQueueUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository
  ) {}

  async execute(input: RemoveFromQueueInput): Promise<void> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) throw new NotFoundError('Session', input.sessionId);
    if (session.hostId !== input.userId) {
      throw new ForbiddenError('Only the host can remove tracks from the queue');
    }
    await this.sessionRepository.removeFromQueue(input.sessionId, input.queueItemId);
  }
}
