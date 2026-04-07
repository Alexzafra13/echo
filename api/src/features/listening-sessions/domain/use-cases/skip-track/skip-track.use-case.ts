import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { SkipTrackInput, SkipTrackOutput } from './skip-track.dto';

@Injectable()
export class SkipTrackUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  async execute(input: SkipTrackInput): Promise<SkipTrackOutput> {
    if (!input.sessionId?.trim()) {
      throw new ValidationError('Session ID is required');
    }

    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session', input.sessionId);
    }

    if (!session.isActive) {
      throw new ValidationError('This listening session has ended');
    }

    // Verify user is a participant with skip permissions
    const participant = await this.sessionRepository.getParticipant(input.sessionId, input.userId);
    if (!participant) {
      throw new ForbiddenError('You are not a participant in this session');
    }

    if (participant.role === 'listener') {
      throw new ForbiddenError('Listeners cannot skip tracks');
    }

    // Mark current track as played and get next
    if (session.currentTrackId) {
      // Find current position and mark as played
      const queue = await this.sessionRepository.getQueue(input.sessionId);
      const currentItem = queue.find(q => q.trackId === session.currentTrackId && !q.played);
      if (currentItem) {
        await this.sessionRepository.markPlayed(input.sessionId, currentItem.position);
      }
    }

    // Get next unplayed track
    const next = await this.sessionRepository.getNextUnplayed(input.sessionId);

    if (next) {
      // Update session current track
      const updatedSession = session;
      updatedSession.setCurrentTrack(next.trackId);
      await this.sessionRepository.update(input.sessionId, updatedSession);

      return {
        sessionId: input.sessionId,
        nextTrackId: next.trackId,
        nextTrackTitle: next.trackTitle,
        position: next.position,
        message: 'Skipped to next track',
      };
    }

    return {
      sessionId: input.sessionId,
      position: 0,
      message: 'No more tracks in queue',
    };
  }
}
