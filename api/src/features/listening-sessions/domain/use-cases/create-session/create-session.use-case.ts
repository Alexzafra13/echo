import { Injectable, Inject } from '@nestjs/common';
import { ValidationError, ConflictError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { ListeningSession } from '../../entities';
import { CreateSessionInput, CreateSessionOutput } from './create-session.dto';

@Injectable()
export class CreateSessionUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  async execute(input: CreateSessionInput): Promise<CreateSessionOutput> {
    if (!input.name?.trim()) {
      throw new ValidationError('Session name is required');
    }

    // Check if user already has an active session
    const existing = await this.sessionRepository.findActiveByHostId(input.hostId);
    if (existing) {
      throw new ConflictError('You already have an active listening session');
    }

    const session = ListeningSession.create({
      hostId: input.hostId,
      name: input.name.trim(),
    });

    const created = await this.sessionRepository.create(session);

    // Add host as participant with 'host' role
    await this.sessionRepository.addParticipant(created.id, input.hostId, 'host');

    return {
      id: created.id,
      hostId: created.hostId,
      name: created.name,
      inviteCode: created.inviteCode,
      isActive: created.isActive,
      createdAt: created.createdAt,
      message: 'Listening session created successfully',
    };
  }
}
