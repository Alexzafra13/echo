import { StreamTokenService } from './stream-token.service';
import { DrizzleService } from '@infrastructure/database/drizzle.service';

describe('StreamTokenService', () => {
  let service: StreamTokenService;
  let mockDrizzle: {
    db: {
      select: jest.Mock;
      insert: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    mockDrizzle = {
      db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new StreamTokenService(mockDrizzle as unknown as DrizzleService);
  });

  describe('generateToken', () => {
    it('debería generar un token de 64 caracteres', async () => {
      // Arrange
      const userId = 'user-123';
      mockDrizzle.db.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });
      mockDrizzle.db.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.generateToken(userId);

      // Assert
      expect(result.token).toHaveLength(64);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('debería eliminar tokens anteriores del usuario', async () => {
      // Arrange
      const userId = 'user-123';
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      mockDrizzle.db.delete.mockReturnValue({ where: mockWhere });
      mockDrizzle.db.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.generateToken(userId);

      // Assert
      expect(mockDrizzle.db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it('debería crear token con expiración de 24 horas (default)', async () => {
      // Arrange
      const userId = 'user-123';
      mockDrizzle.db.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });
      mockDrizzle.db.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const now = Date.now();

      // Act
      const result = await service.generateToken(userId);

      // Assert - default is 24 hours (STREAM_TOKEN_EXPIRY_HOURS)
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      const expectedExpiry = now + twentyFourHoursInMs;
      // Allow 1 second tolerance
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe('validateToken', () => {
    it('debería retornar userId para token válido', async () => {
      // Arrange
      const token = 'valid-token';
      const userId = 'user-123';
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  token: { id: 'token-id', userId, expiresAt: futureDate },
                  user: { id: userId, isActive: true },
                },
              ]),
            }),
          }),
        }),
      });

      mockDrizzle.db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      // Act
      const result = await service.validateToken(token);

      // Assert
      expect(result).toBe(userId);
    });

    it('debería retornar null para token inexistente', async () => {
      // Arrange
      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      // Act
      const result = await service.validateToken('invalid-token');

      // Assert
      expect(result).toBeNull();
    });

    it('debería retornar null y eliminar token expirado', async () => {
      // Arrange
      const expiredDate = new Date(Date.now() - 1000 * 60); // 1 minute ago

      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  token: { id: 'token-id', userId: 'user-123', expiresAt: expiredDate },
                  user: { id: 'user-123', isActive: true },
                },
              ]),
            }),
          }),
        }),
      });

      mockDrizzle.db.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.validateToken('expired-token');

      // Assert
      expect(result).toBeNull();
      expect(mockDrizzle.db.delete).toHaveBeenCalled();
    });

    it('debería retornar null para usuario inactivo', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);

      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  token: { id: 'token-id', userId: 'user-123', expiresAt: futureDate },
                  user: { id: 'user-123', isActive: false },
                },
              ]),
            }),
          }),
        }),
      });

      // Act
      const result = await service.validateToken('token');

      // Assert
      expect(result).toBeNull();
    });

    it('debería actualizar lastUsedAt para token válido', async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const mockSetWhere = jest.fn().mockResolvedValue(undefined);
      const mockSet = jest.fn().mockReturnValue({ where: mockSetWhere });

      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  token: { id: 'token-id', userId: 'user-123', expiresAt: futureDate },
                  user: { id: 'user-123', isActive: true },
                },
              ]),
            }),
          }),
        }),
      });

      mockDrizzle.db.update.mockReturnValue({ set: mockSet });

      // Act
      await service.validateToken('token');

      // Assert
      expect(mockDrizzle.db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ lastUsedAt: expect.any(Date) })
      );
    });
  });

  describe('getUserToken', () => {
    it('debería retornar token existente no expirado', async () => {
      // Arrange
      const userId = 'user-123';
      const token = 'existing-token';
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ token, expiresAt }]),
          }),
        }),
      });

      // Act
      const result = await service.getUserToken(userId);

      // Assert
      expect(result).toEqual({ token, expiresAt });
    });

    it('debería retornar null si no hay token', async () => {
      // Arrange
      mockDrizzle.db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Act
      const result = await service.getUserToken('user-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('revokeToken', () => {
    it('debería eliminar el token del usuario', async () => {
      // Arrange
      const userId = 'user-123';
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      mockDrizzle.db.delete.mockReturnValue({ where: mockWhere });

      // Act
      await service.revokeToken(userId);

      // Assert
      expect(mockDrizzle.db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('debería eliminar tokens expirados y retornar cantidad', async () => {
      // Arrange
      const deletedTokens = [{ id: '1' }, { id: '2' }, { id: '3' }];
      mockDrizzle.db.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(deletedTokens),
        }),
      });

      // Act
      const result = await service.cleanupExpiredTokens();

      // Assert
      expect(result).toBe(3);
    });

    it('debería retornar 0 si no hay tokens expirados', async () => {
      // Arrange
      mockDrizzle.db.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        }),
      });

      // Act
      const result = await service.cleanupExpiredTokens();

      // Assert
      expect(result).toBe(0);
    });
  });
});
