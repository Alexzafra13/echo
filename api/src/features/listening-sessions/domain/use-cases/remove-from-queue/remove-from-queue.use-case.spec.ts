import { ForbiddenError, NotFoundError } from '@shared/errors';
import { RemoveFromQueueUseCase } from './remove-from-queue.use-case';
import { IListeningSessionRepository } from '../../ports';
import { ListeningSession } from '../../entities';

describe('RemoveFromQueueUseCase', () => {
  let useCase: RemoveFromQueueUseCase;
  let sessionRepository: jest.Mocked<
    Pick<IListeningSessionRepository, 'findById' | 'removeFromQueue'>
  >;

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
      removeFromQueue: jest.fn().mockResolvedValue(true),
    };

    useCase = new RemoveFromQueueUseCase(
      sessionRepository as unknown as IListeningSessionRepository
    );
  });

  it('should remove queue item when user is host', async () => {
    sessionRepository.findById.mockResolvedValue(createMockSession());

    await useCase.execute({
      sessionId: 'session-1',
      queueItemId: 'queue-item-1',
      userId: 'host-1',
    });

    expect(sessionRepository.removeFromQueue).toHaveBeenCalledWith('session-1', 'queue-item-1');
  });

  it('should throw NotFoundError when session does not exist', async () => {
    sessionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        sessionId: 'non-existent',
        queueItemId: 'queue-item-1',
        userId: 'host-1',
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError when user is not the host', async () => {
    sessionRepository.findById.mockResolvedValue(createMockSession());

    await expect(
      useCase.execute({
        sessionId: 'session-1',
        queueItemId: 'queue-item-1',
        userId: 'not-the-host',
      })
    ).rejects.toThrow(ForbiddenError);
  });
});
