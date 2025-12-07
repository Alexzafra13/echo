import { User, UserProps } from './user.entity';
import { createMockUserProps } from '@shared/testing/mock.types';

describe('User Entity', () => {
  // Helper for User.create (only required fields for creation)
  const createUserInput = (overrides = {}) => ({
    username: 'testuser',
    passwordHash: '$2b$12$hashed',
    isActive: true,
    isAdmin: false,
    mustChangePassword: false,
    ...overrides,
  });

  describe('create', () => {
    it('debería crear un nuevo usuario', () => {
      // Act
      const user = User.create(createUserInput({
        username: 'juan',
        name: 'Juan García',
      }));

      // Assert
      expect(user.id).toBeDefined();
      expect(user.username).toBe('juan');
      expect(user.passwordHash).toBe('$2b$12$hashed');
      expect(user.name).toBe('Juan García');
      expect(user.isActive).toBe(true);
      expect(user.isAdmin).toBe(false);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('debería generar IDs únicos para diferentes usuarios', () => {
      // Act
      const user1 = User.create(createUserInput({ username: 'juan' }));
      const user2 = User.create(createUserInput({ username: 'maria' }));

      // Assert
      expect(user1.id).not.toBe(user2.id);
    });

    it('debería tener isAdmin en false por defecto', () => {
      // Act
      const user = User.create(createUserInput({ username: 'juan' }));

      // Assert
      expect(user.isAdmin).toBe(false);
    });
  });

  describe('reconstruct', () => {
    it('debería reconstruir un usuario desde BD', () => {
      // Arrange
      const now = new Date();

      // Act
      const user = User.reconstruct(createMockUserProps({
        id: 'user-123',
        username: 'juan',
        name: 'Juan',
        createdAt: now,
        updatedAt: now,
      }));

      // Assert
      expect(user.id).toBe('user-123');
      expect(user.username).toBe('juan');
      expect(user.passwordHash).toBe('$2b$12$hashed');
      expect(user.isActive).toBe(true);
    });

    it('debería preservar las fechas al reconstruir', () => {
      // Arrange
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-01-15');

      // Act
      const user = User.reconstruct(createMockUserProps({
        id: 'user-123',
        username: 'juan',
        name: 'Juan',
        createdAt,
        updatedAt,
      }));

      // Assert
      expect(user.createdAt).toEqual(createdAt);
      expect(user.updatedAt).toEqual(updatedAt);
    });
  });

  describe('getters', () => {
    it('debería retornar todas las propiedades', () => {
      // Arrange
      const user = User.create(createUserInput({
        username: 'juan',
        name: 'Juan',
      }));

      // Assert
      expect(user.id).toBeDefined();
      expect(user.username).toBe('juan');
      expect(user.passwordHash).toBe('$2b$12$hashed');
      expect(user.name).toBe('Juan');
      expect(user.isActive).toBe(true);
      expect(user.isAdmin).toBe(false);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('debería retornar undefined para name si no existe', () => {
      // Arrange
      const user = User.create(createUserInput({ username: 'juan' }));

      // Assert
      expect(user.name).toBeUndefined();
    });
  });

  describe('toPrimitives', () => {
    it('debería convertir a objeto primitivo', () => {
      // Arrange
      const user = User.create(createUserInput({
        username: 'juan',
        name: 'Juan',
      }));

      // Act
      const primitives = user.toPrimitives();

      // Assert
      expect(primitives.id).toBe(user.id);
      expect(primitives.username).toBe('juan');
      expect(primitives.passwordHash).toBe('$2b$12$hashed');
      expect(primitives.name).toBe('Juan');
      expect(primitives.isActive).toBe(true);
      expect(primitives.isAdmin).toBe(false);
    });

    it('debería retornar una copia, no referencia', () => {
      // Arrange
      const user = User.create(createUserInput({
        username: 'juan',
        name: 'Juan',
      }));

      // Act
      const primitives1 = user.toPrimitives();
      const primitives2 = user.toPrimitives();

      // Assert
      expect(primitives1).not.toBe(primitives2);
      expect(primitives1).toEqual(primitives2);
    });

    it('debería poder reconstruir desde toPrimitives', () => {
      // Arrange
      const user1 = User.create(createUserInput({
        username: 'juan',
        name: 'Juan',
      }));

      // Act
      const primitives = user1.toPrimitives();
      const user2 = User.reconstruct(primitives);

      // Assert
      expect(user2.id).toBe(user1.id);
      expect(user2.username).toBe(user1.username);
      expect(user2.passwordHash).toBe(user1.passwordHash);
    });
  });

  describe('immutability', () => {
    it('no debería permitir modificar propiedades directamente', () => {
      // Arrange
      const user = User.create(createUserInput({ username: 'juan' }));

      // Act & Assert
      expect(() => {
        (user as any).username = 'maria';
      }).toThrow();
    });
  });
});
