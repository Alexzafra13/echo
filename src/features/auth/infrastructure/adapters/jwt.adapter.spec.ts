import { User } from '../../domain/entities/user.entity';
import { JwtAdapter } from './jwt.adapter';

describe('JwtAdapter', () => {
  let adapter: JwtAdapter;
  let mockJwtService: any;

  beforeEach(() => {
    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    adapter = new JwtAdapter(mockJwtService);
  });

  describe('generateAccessToken', () => {
    it('debería generar access token válido', async () => {
      // Arrange
      const user = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: 'hash',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
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
      const user = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: 'hash',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
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