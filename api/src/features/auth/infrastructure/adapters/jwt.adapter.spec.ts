import { JwtService } from '@nestjs/jwt';
import { User, UserProps } from '../../domain/entities/user.entity';
import { JwtAdapter } from './jwt.adapter';
import { SecuritySecretsService } from '@config/security-secrets.service';
import { createMockUserProps } from '@shared/testing/mock.types';

interface MockJwtService {
  sign: jest.Mock;
  verify: jest.Mock;
}

interface MockSecretsService {
  jwtSecret: string;
  jwtRefreshSecret: string;
}

// Helper para crear mock de usuario
const createMockUser = (overrides: Partial<UserProps> = {}): User => {
  return User.reconstruct(createMockUserProps(overrides));
};

describe('JwtAdapter', () => {
  let adapter: JwtAdapter;
  let mockJwtService: MockJwtService;
  let mockSecretsService: MockSecretsService;

  beforeEach(() => {
    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    mockSecretsService = {
      jwtSecret: 'test-jwt-secret',
      jwtRefreshSecret: 'test-refresh-secret',
    };

    adapter = new JwtAdapter(
      mockJwtService as unknown as JwtService,
      mockSecretsService as unknown as SecuritySecretsService,
    );
  });

  describe('generateAccessToken', () => {
    it('debería generar access token válido', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        username: 'juan',
        name: 'Juan',
      });

      mockJwtService.sign.mockReturnValue('access_token_123');

      // Act
      const token = await adapter.generateAccessToken(user);

      // Assert
      expect(token).toBe('access_token_123');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });

  describe('generateRefreshToken', () => {
    it('debería generar refresh token válido', async () => {
      // Arrange
      const user = createMockUser({
        id: 'user-123',
        username: 'juan',
        name: 'Juan',
      });

      mockJwtService.sign.mockReturnValue('refresh_token_123');

      // Act
      const token = await adapter.generateRefreshToken(user);

      // Assert
      expect(token).toBe('refresh_token_123');
    });
  });

  describe('verifyAccessToken', () => {
    it('debería verificar access token válido', async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue({
        userId: 'user-123',
        username: 'juan',
      });

      // Act
      const payload = await adapter.verifyAccessToken('valid_token');

      // Assert
      expect(payload.userId).toBe('user-123');
      expect(payload.username).toBe('juan');
    });

    it('debería lanzar error si token es inválido', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(
        adapter.verifyAccessToken('invalid_token'),
      ).rejects.toThrow();
    });
  });
});