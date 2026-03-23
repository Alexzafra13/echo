import { Injectable, Inject } from '@nestjs/common';
import { NotFoundError, ValidationError, ForbiddenError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';
import { GetSessionInput, GetSessionOutput } from './get-session.dto';

@Injectable()
export class GetSessionUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
  ) {}

  /**
   * Buscar sesion activa donde el usuario es host o participante
   */
  async findActiveForUser(userId: string) {
    // Primero buscar como host
    const asHost = await this.sessionRepository.findActiveByHostId(userId);
    if (asHost) return asHost;

    // Buscar como participante en sesiones activas
    const asParticipant = await this.sessionRepository.findActiveByParticipantId(userId);
    return asParticipant;
  }

  async execute(input: GetSessionInput): Promise<GetSessionOutput> {
    if (!input.sessionId && !input.inviteCode) {
      throw new ValidationError('Session ID or invite code is required');
    }

    const session = input.sessionId
      ? await this.sessionRepository.findById(input.sessionId)
      : await this.sessionRepository.findByInviteCode(input.inviteCode!.toUpperCase());

    if (!session) {
      throw new NotFoundError('Session', input.sessionId || input.inviteCode || '');
    }

    // Verify user is a participant
    const participant = await this.sessionRepository.getParticipant(session.id, input.userId);
    if (!participant) {
      throw new ForbiddenError('You are not a participant in this session');
    }

    const [participants, queue] = await Promise.all([
      this.sessionRepository.getParticipants(session.id),
      this.sessionRepository.getQueue(session.id),
    ]);

    return {
      id: session.id,
      hostId: session.hostId,
      name: session.name,
      inviteCode: session.inviteCode,
      isActive: session.isActive,
      currentTrackId: session.currentTrackId,
      currentPosition: session.currentPosition,
      guestsCanControl: session.guestsCanControl,
      participants,
      queue,
      createdAt: session.createdAt,
    };
  }
}
