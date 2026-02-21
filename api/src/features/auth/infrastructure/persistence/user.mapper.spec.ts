import { UserMapper } from './user.mapper';
import { User } from '../../domain/entities/user.entity';
import { User as UserDb } from '@infrastructure/database/schema/users';

describe('UserMapper', () => {
  const mockDbUser = {
    id: 'user-1',
    username: 'testuser',
    passwordHash: '$2b$12$hash',
    name: 'Test User',
    isActive: true,
    isAdmin: false,
    theme: 'dark',
    language: 'es',
    mustChangePassword: false,
    avatarPath: '/avatars/user.jpg',
    avatarMimeType: 'image/jpeg',
    avatarSize: 12345,
    avatarUpdatedAt: new Date('2024-01-15'),
    lastLoginAt: new Date('2024-06-01'),
    lastAccessAt: new Date('2024-06-15'),
    isPublicProfile: true,
    showTopTracks: true,
    showTopArtists: false,
    showTopAlbums: true,
    showPlaylists: false,
    bio: 'Hello world',
    homeSections: [{ id: 'recent-albums' as const, enabled: true, order: 0 }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  };

  describe('toDomain', () => {
    it('should convert DB user to domain User', () => {
      const user = UserMapper.toDomain(mockDbUser as unknown as UserDb);

      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe('user-1');
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBe('$2b$12$hash');
      expect(user.name).toBe('Test User');
      expect(user.isActive).toBe(true);
      expect(user.isAdmin).toBe(false);
      expect(user.theme).toBe('dark');
      expect(user.language).toBe('es');
      expect(user.isPublicProfile).toBe(true);
      expect(user.showTopArtists).toBe(false);
      expect(user.bio).toBe('Hello world');
    });

    it('should convert null optional fields to undefined', () => {
      const user = UserMapper.toDomain({
        ...mockDbUser,
        name: null,
        avatarPath: null,
        avatarMimeType: null,
        avatarSize: null,
        avatarUpdatedAt: null,
        lastLoginAt: null,
        lastAccessAt: null,
        bio: null,
      } as unknown as UserDb);

      expect(user.name).toBeUndefined();
      expect(user.avatarPath).toBeUndefined();
      expect(user.avatarMimeType).toBeUndefined();
      expect(user.avatarSize).toBeUndefined();
      expect(user.lastLoginAt).toBeUndefined();
      expect(user.bio).toBeUndefined();
    });

    it('should use default homeSections when null', () => {
      const user = UserMapper.toDomain({
        ...mockDbUser,
        homeSections: null,
      } as unknown as UserDb);

      expect(user.homeSections).toBeDefined();
      expect(user.homeSections.length).toBeGreaterThan(0);
    });

    it('should default isPublicProfile to false when null', () => {
      const user = UserMapper.toDomain({
        ...mockDbUser,
        isPublicProfile: null,
      } as unknown as UserDb);

      expect(user.isPublicProfile).toBe(false);
    });
  });

  describe('toPersistence', () => {
    it('should convert domain User to persistence format', () => {
      const user = UserMapper.toDomain(mockDbUser as unknown as UserDb);
      const persistence = UserMapper.toPersistence(user);

      expect(persistence.id).toBe('user-1');
      expect(persistence.username).toBe('testuser');
      expect(persistence.password_hash).toBe('$2b$12$hash');
      expect(persistence.is_active).toBe(true);
      expect(persistence.is_admin).toBe(false);
      expect(persistence.theme).toBe('dark');
      expect(persistence.language).toBe('es');
      expect(persistence.is_public_profile).toBe(true);
      expect(persistence.show_top_tracks).toBe(true);
    });

    it('should convert undefined optional fields to null', () => {
      const user = UserMapper.toDomain({
        ...mockDbUser,
        name: null,
        avatarPath: null,
        bio: null,
      } as unknown as UserDb);
      const persistence = UserMapper.toPersistence(user);

      expect(persistence.name).toBeNull();
      expect(persistence.avatar_path).toBeNull();
      expect(persistence.bio).toBeNull();
    });
  });

  describe('roundtrip', () => {
    it('should preserve data through toDomain -> toPersistence', () => {
      const user = UserMapper.toDomain(mockDbUser as unknown as UserDb);
      const persistence = UserMapper.toPersistence(user);

      expect(persistence.id).toBe(mockDbUser.id);
      expect(persistence.username).toBe(mockDbUser.username);
      expect(persistence.password_hash).toBe(mockDbUser.passwordHash);
    });
  });
});
