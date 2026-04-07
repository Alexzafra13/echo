import { ForbiddenError, NotFoundError } from '@shared/errors';
import { UpdateSessionSettingsUseCase } from './update-session-settings.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ListeningSession } from '../../entities';

describe('UpdateSessionSettingsUseCase', () => {
  let useCase: UpdateSessionSettingsUseCase;
  let sessionRepository: jest.Mocked<Pick<IListeningSessionRepository, 'findById' | 'update'>>;

  const createMockSession = (overrides = {}) =>
    ListeningSession.fromPrimitives({
      id: 'session-1',
      hostId: 'host-1',
      name: 'Test Session',
      inviteCode: 'ABC123',
      isActive: true,
      mode: 'sync' as const,
      currentPosition: 0,
      guestsCanControl: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  beforeEach(() => {
    sessionRepository = {
      findById: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new UpdateSessionSettingsUseCase(
      sessionRepository as unknown as IListeningSessionRepository
    );
  });

  it('should update guestsCanControl when user is host', async () => {
    sessionRepository.findById.mockResolvedValue(createMockSession({ guestsCanControl: true }));

    const result = await useCase.execute({
      sessionId: 'session-1',
      userId: 'host-1',
      guestsCanControl: false,
    });

    expect(result.guestsCanControl).toBe(false);
    expect(sessionRepository.update).toHaveBeenCalledWith('session-1', expect.any(Object));
  });

  it('should throw NotFoundError when session does not exist', async () => {
    sessionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        sessionId: 'non-existent',
        userId: 'host-1',
        guestsCanControl: false,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError when user is not the host', async () => {
    sessionRepository.findById.mockResolvedValue(createMockSession());

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        userId: 'not-host',
        guestsCanControl: false,
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('should not call update when guestsCanControl is undefined', async () => {
    sessionRepository.findById.mockResolvedValue(createMockSession());

    await useCase.execute({
      sessionId: 'session-1',
      userId: 'host-1',
    });

    expect(sessionRepository.update).not.toHaveBeenCalled();
  });
});
