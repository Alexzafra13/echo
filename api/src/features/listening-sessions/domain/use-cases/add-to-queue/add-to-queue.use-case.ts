import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { TRACK_REPOSITORY } from '@features/tracks/domain/ports/track-repository.port';
import { ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
import { AddToQueueInput, AddToQueueOutput } from './add-to-queue.dto';

@Injectable()
export class AddToQueueUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
    @Inject(TRACK_REPOSITORY)
    private readonly trackRepository: ITrackRepository,
  ) {}

  async execute(input: AddToQueueInput): Promise<AddToQueueOutput> {
    if (!input.sessionId?.trim()) {
      throw new ValidationError('Session ID is required');
    }
    if (!input.trackId?.trim()) {
      throw new ValidationError('Track ID is required');
    }

    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session', input.sessionId);
    }

    if (!session.isActive) {
      throw new ValidationError('This listening session has ended');
    }

    // Verify user is a participant
    const participant = await this.sessionRepository.getParticipant(input.sessionId, input.userId);
    if (!participant) {
      throw new ForbiddenError('You are not a participant in this session');
    }

    // Only host and dj can add to queue
    if (participant.role === 'listener') {
      throw new ForbiddenError('Listeners cannot add tracks to the queue. Ask the host to promote you to DJ.');
    }

    // Verify track exists
    const track = await this.trackRepository.findById(input.trackId);
    if (!track) {
      throw new NotFoundError('Track', input.trackId);
    }

    const queueItem = await this.sessionRepository.addToQueue(
      input.sessionId,
      input.trackId,
      input.userId,
    );

    return {
      sessionId: queueItem.sessionId,
      trackId: queueItem.trackId,
      position: queueItem.position,
      addedBy: queueItem.addedBy,
      message: 'Track added to queue successfully',
    };
  }
}
