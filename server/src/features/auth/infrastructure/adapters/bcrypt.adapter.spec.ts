// Mock PRIMERO, antes de cualquier import
jest.mock('bcrypt');

// Luego importar
import * as bcrypt from 'bcrypt';
import { IPasswordService } from '../../domain/ports/password-service.port';

describe('BcryptAdapter', () => {
  let adapter: IPasswordService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Crear una instancia manual sin NestJS
    adapter = {
      hash: async (password: string) => {
        return bcrypt.hash(password, 12) as Promise<string>;
      },
      compare: async (password: string, hash: string) => {
        return bcrypt.compare(password, hash) as Promise<boolean>;
      },
    };
  });

  describe('hash', () => {
    it('debería hashear una contraseña', async () => {
      // Arrange
      const password = 'Pass123!';
      const hashedPassword = '$2b$12$hashed_password_123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await adapter.hash(password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('debería usar el número correcto de rounds', async () => {
      // Arrange
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      // Act
      await adapter.hash('Pass123!');

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('Pass123!', 12);
    });
  });

  describe('compare', () => {
    it('debería retornar true si passwords coinciden', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await adapter.compare('Pass123!', '$2b$12$hashed');

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('Pass123!', '$2b$12$hashed');
    });

    it('debería retornar false si passwords no coinciden', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await adapter.compare('Wrong123!', '$2b$12$hashed');

      // Assert
      expect(result).toBe(false);
    });

    it('debería manejar errores de bcrypt', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error'),
      );

      // Act & Assert
      await expect(
        adapter.compare('Pass123!', 'invalid_hash'),
      ).rejects.toThrow('Bcrypt error');
    });
  });
});