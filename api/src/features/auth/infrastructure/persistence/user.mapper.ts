import { User as UserDb } from '@infrastructure/database/schema/users';
import { User } from '../../domain/entities/user.entity';
import { DEFAULT_HOME_SECTIONS } from '@shared/types/home-section.types';

export class UserMapper {
  static toDomain(raw: UserDb): User {
    return User.reconstruct({
      id: raw.id,
      username: raw.username,
      passwordHash: raw.passwordHash,
      name: raw.name || undefined,
      isActive: raw.isActive,
      isAdmin: raw.isAdmin,
      theme: raw.theme,
      language: raw.language,
      mustChangePassword: raw.mustChangePassword,
      avatarPath: raw.avatarPath || undefined,
      avatarMimeType: raw.avatarMimeType || undefined,
      avatarSize: raw.avatarSize || undefined,
      avatarUpdatedAt: raw.avatarUpdatedAt || undefined,
      lastLoginAt: raw.lastLoginAt || undefined,
      lastAccessAt: raw.lastAccessAt || undefined,
      isPublicProfile: raw.isPublicProfile ?? false,
      showTopTracks: raw.showTopTracks ?? true,
      showTopArtists: raw.showTopArtists ?? true,
      showTopAlbums: raw.showTopAlbums ?? true,
      showPlaylists: raw.showPlaylists ?? true,
      bio: raw.bio || undefined,
      homeSections: raw.homeSections ?? DEFAULT_HOME_SECTIONS,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(user: User) {
    const primitives = user.toPrimitives();
    return {
      id: primitives.id,
      username: primitives.username,
      passwordHash: primitives.passwordHash,
      name: primitives.name || null,
      isActive: primitives.isActive,
      isAdmin: primitives.isAdmin,
      theme: primitives.theme,
      language: primitives.language,
      mustChangePassword: primitives.mustChangePassword,
      avatarPath: primitives.avatarPath || null,
      avatarMimeType: primitives.avatarMimeType || null,
      avatarSize: primitives.avatarSize || null,
      avatarUpdatedAt: primitives.avatarUpdatedAt || null,
      lastLoginAt: primitives.lastLoginAt || null,
      lastAccessAt: primitives.lastAccessAt || null,
      isPublicProfile: primitives.isPublicProfile,
      showTopTracks: primitives.showTopTracks,
      showTopArtists: primitives.showTopArtists,
      showTopAlbums: primitives.showTopAlbums,
      showPlaylists: primitives.showPlaylists,
      bio: primitives.bio || null,
      homeSections: primitives.homeSections,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
