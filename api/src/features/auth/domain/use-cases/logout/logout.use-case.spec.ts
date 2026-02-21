import { LogoutUseCase } from './logout.use-case';
import { ITokenBlacklistService } from '../../ports';
import { LogService, LogCategory } from '@features/logs/application/log.service';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let mockTokenBlacklist: jest.Mocked<ITokenBlacklistService>;
  let mockLogService: jest.Mocked<Partial<LogService>>;

  beforeEach(() => {
    mockTokenBlacklist = {
      add: jest.fn(),
      isBlacklisted: jest.fn(),
    };

    mockLogService = {
      info: jest.fn(),
    };

    useCase = new LogoutUseCase(mockTokenBlacklist, mockLogService as unknown as LogService);
  });

  it('should add token to blacklist with expiration', async () => {
    await useCase.execute({
      token: 'jwt-token-123',
      userId: 'user-1',
      username: 'testuser',
      tokenExp: 1700000000,
    });

    expect(mockTokenBlacklist.add).toHaveBeenCalledWith('jwt-token-123', 1700000000);
  });

  it('should log the logout event', async () => {
    await useCase.execute({
      token: 'jwt-token-123',
      userId: 'user-1',
      username: 'testuser',
      tokenExp: 1700000000,
    });

    expect(mockLogService.info).toHaveBeenCalledWith(
      LogCategory.AUTH,
      'User logged out: testuser',
      { userId: 'user-1', username: 'testuser' }
    );
  });

  it('should propagate errors from blacklist service', async () => {
    mockTokenBlacklist.add.mockRejectedValue(new Error('Redis down'));

    await expect(
      useCase.execute({
        token: 'jwt-token',
        userId: 'user-1',
        username: 'testuser',
        tokenExp: 1700000000,
      })
    ).rejects.toThrow('Redis down');
  });
});
