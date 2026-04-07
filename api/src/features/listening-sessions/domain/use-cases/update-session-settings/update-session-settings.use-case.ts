import { Injectable, Inject } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '@shared/errors';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../ports';

export interface UpdateSessionSettingsInput {
  sessionId: string;
  userId: string;
  guestsCanControl?: boolean;
}

@Injectable()
export class UpdateSessionSettingsUseCase {
  constructor(
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository
  ) {}

  async execute(input: UpdateSessionSettingsInput): Promise<{ guestsCanControl?: boolean }> {
    const session = await this.sessionRepository.findById(input.sessionId);
    if (!session) throw new NotFoundError('Session', input.sessionId);
    if (session.hostId !== input.userId) {
      throw new ForbiddenError('Only the host can change settings');
    }

    if (input.guestsCanControl !== undefined) {
      session.updateSettings({ guestsCanControl: input.guestsCanControl });
      await this.sessionRepository.update(input.sessionId, session);
    }

    return { guestsCanControl: input.guestsCanControl };
  }
}
