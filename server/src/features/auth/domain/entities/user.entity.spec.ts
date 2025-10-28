import { User } from './user.entity';

describe('User Entity', () => {
  describe('create', () => {
    it('debería crear un nuevo usuario', () => {
      // Act
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan García',
        isActive: true,
        isAdmin: false,
      });

      // Assert
      expect(user.id).toBeDefined();
      expect(user.username).toBe('juan');
      expect(user.email).toBe('juan@test.com');
      expect(user.passwordHash).toBe('$2b$12$hashed');
      expect(user.name).toBe('Juan García');
      expect(user.isActive).toBe(true);
      expect(user.isAdmin).toBe(false);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('debería generar IDs únicos para diferentes usuarios', () => {
      // Act
      const user1 = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      const user2 = User.create({
        username: 'maria',
        email: 'maria@test.com',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      // Assert
      expect(user1.id).not.toBe(user2.id);
    });

    it('debería tener isAdmin en false por defecto', () => {
      // Act
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      // Assert
      expect(user.isAdmin).toBe(false);
    });

    it('debería permitir crear sin email', () => {
      // Act
      const user = User.create({
        username: 'juan',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      // Assert
      expect(user.email).toBeUndefined();
      expect(user.username).toBe('juan');
    });
  });

  describe('reconstruct', () => {
    it('debería reconstruir un usuario desde BD', () => {
      // Arrange
      const now = new Date();
      const props = {
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      };

      // Act
      const user = User.reconstruct(props);

      // Assert
      expect(user.id).toBe('user-123');
      expect(user.username).toBe('juan');
      expect(user.email).toBe('juan@test.com');
      expect(user.passwordHash).toBe('$2b$12$hashed');
      expect(user.isActive).toBe(true);
    });

    it('debería preservar las fechas al reconstruir', () => {
      // Arrange
      const createdAt = new Date('2025-01-01');
      const updatedAt = new Date('2025-01-15');

      // Act
      const user = User.reconstruct({
        id: 'user-123',
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
        createdAt,
        updatedAt,
      });

      // Assert
      expect(user.createdAt).toEqual(createdAt);
      expect(user.updatedAt).toEqual(updatedAt);
    });
  });

  describe('getters', () => {
    it('debería retornar todas las propiedades', () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
      });

      // Assert
      expect(user.id).toBeDefined();
      expect(user.username).toBe('juan');
      expect(user.email).toBe('juan@test.com');
      expect(user.passwordHash).toBe('$2b$12$hashed');
      expect(user.name).toBe('Juan');
      expect(user.isActive).toBe(true);
      expect(user.isAdmin).toBe(false);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('debería retornar undefined para email si no existe', () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      // Assert
      expect(user.email).toBeUndefined();
    });

    it('debería retornar undefined para name si no existe', () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      // Assert
      expect(user.name).toBeUndefined();
    });
  });

  describe('toPrimitives', () => {
    it('debería convertir a objeto primitivo', () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
      });

      // Act
      const primitives = user.toPrimitives();

      // Assert
      expect(primitives.id).toBe(user.id);
      expect(primitives.username).toBe('juan');
      expect(primitives.email).toBe('juan@test.com');
      expect(primitives.passwordHash).toBe('$2b$12$hashed');
      expect(primitives.name).toBe('Juan');
      expect(primitives.isActive).toBe(true);
      expect(primitives.isAdmin).toBe(false);
    });

    it('debería retornar una copia, no referencia', () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
      });

      // Act
      const primitives1 = user.toPrimitives();
      const primitives2 = user.toPrimitives();

      // Assert
      expect(primitives1).not.toBe(primitives2);
      expect(primitives1).toEqual(primitives2);
    });

    it('debería poder reconstruir desde toPrimitives', () => {
      // Arrange
      const user1 = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        name: 'Juan',
        isActive: true,
        isAdmin: false,
      });

      // Act
      const primitives = user1.toPrimitives();
      const user2 = User.reconstruct(primitives);

      // Assert
      expect(user2.id).toBe(user1.id);
      expect(user2.username).toBe(user1.username);
      expect(user2.email).toBe(user1.email);
      expect(user2.passwordHash).toBe(user1.passwordHash);
    });
  });

  describe('immutability', () => {
    it('no debería permitir modificar propiedades directamente', () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      // Act & Assert
      expect(() => {
        (user as any).username = 'maria';
      }).toThrow();
    });
  });
});