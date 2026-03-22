import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ConflictError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { JoinSessionInput, JoinSessionOutput } from './join-session.dto';

@Injectable()
export class JoinSessionUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  async execute(input: JoinSessionInput): Promise<JoinSessionOutput> {
    if (!input.inviteCode?.trim()) {
      throw new ValidationError('Invite code is required');
    }

    const session = await this.sessionRepository.findByInviteCode(input.inviteCode.toUpperCase());
    if (!session) {
      throw new NotFoundError('Session', `with invite code ${input.inviteCode}`);
    }

    if (!session.isActive) {
      throw new ValidationError('This listening session has ended');
    }

    // Check if already a participant
    const existing = await this.sessionRepository.getParticipant(session.id, input.userId);
    if (existing) {
      throw new ConflictError('You are already in this session');
    }

    // Join as listener by default
    await this.sessionRepository.addParticipant(session.id, input.userId, 'listener');

    return {
      sessionId: session.id,
      sessionName: session.name,
      hostId: session.hostId,
      role: 'listener',
      message: 'Joined listening session successfully',
    };
  }
}
