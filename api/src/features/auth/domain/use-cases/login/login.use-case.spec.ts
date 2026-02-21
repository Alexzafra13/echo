import { LoginUseCase } from './login.use-case';
import { IUserRepository, IPasswordService, ITokenService } from '../../ports';
import { LogService } from '@features/logs/application/log.service';
import { UnauthorizedError, ValidationError } from '@shared/errors';
import { User } from '../../entities/user.entity';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockLogService: jest.Mocked<Partial<LogService>>;

  const validUser = {
    id: 'user-123',
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    isActive: true,
    isAdmin: false,
    avatarPath: null,
    mustChangePassword: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepo = {
      findByUsername: jest.fn(),
      updatePartial: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    mockPasswordService = {
      compare: jest.fn(),
    } as unknown as jest.Mocked<IPasswordService>;

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<ITokenService>;

    mockLogService = {
      info: jest.fn(),
      warning: jest.fn(),
    };

    useCase = new LoginUseCase(
      mockUserRepo,
      mockPasswordService,
      mockTokenService,
      mockLogService as unknown as LogService
    );
  });

  describe('execute', () => {
    it('should login successfully with valid credentials', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(validUser as unknown as User);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue('access-token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh-token');
      mockUserRepo.updatePartial.mockResolvedValue(undefined);

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.user.id).toBe('user-123');
      expect(result.user.username).toBe('testuser');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.mustChangePassword).toBe(false);
      expect(mockUserRepo.updatePartial).toHaveBeenCalledWith('user-123', {
        lastLoginAt: expect.any(Date),
        lastAccessAt: expect.any(Date),
      });
      expect(mockLogService.info).toHaveBeenCalled();
    });

    it('should throw ValidationError when username is missing', async () => {
      await expect(useCase.execute({ username: '', password: 'password123' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when password is missing', async () => {
      await expect(useCase.execute({ username: 'testuser', password: '' })).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw UnauthorizedError when user not found', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(null);

      await expect(
        useCase.execute({ username: 'nonexistent', password: 'password123' })
      ).rejects.toThrow(UnauthorizedError);

      expect(mockLogService.warning).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when account is inactive', async () => {
      const inactiveUser = { ...validUser, isActive: false };
      mockUserRepo.findByUsername.mockResolvedValue(inactiveUser as unknown as User);

      await expect(
        useCase.execute({ username: 'testuser', password: 'password123' })
      ).rejects.toThrow(UnauthorizedError);

      expect(mockLogService.warning).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(validUser as unknown as User);
      mockPasswordService.compare.mockResolvedValue(false);

      await expect(
        useCase.execute({ username: 'testuser', password: 'wrongpassword' })
      ).rejects.toThrow(UnauthorizedError);

      expect(mockLogService.warning).toHaveBeenCalled();
    });

    it('should return mustChangePassword flag when set', async () => {
      const userMustChange = { ...validUser, mustChangePassword: true };
      mockUserRepo.findByUsername.mockResolvedValue(userMustChange as unknown as User);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue('access-token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh-token');

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.mustChangePassword).toBe(true);
    });

    it('should return admin flag when user is admin', async () => {
      const adminUser = { ...validUser, isAdmin: true };
      mockUserRepo.findByUsername.mockResolvedValue(adminUser as unknown as User);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue('access-token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh-token');

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.user.isAdmin).toBe(true);
    });

    it('should not expose sensitive data in response', async () => {
      mockUserRepo.findByUsername.mockResolvedValue(validUser as unknown as User);
      mockPasswordService.compare.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue('access-token');
      mockTokenService.generateRefreshToken.mockResolvedValue('refresh-token');

      const result = await useCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('email');
    });
  });
});
