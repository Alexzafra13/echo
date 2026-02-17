import { User as UserDb } from '@infrastructure/database/schema/users';
import { User } from '../../domain/entities/user.entity';

export class UserMapper {
  private static readonly DEFAULT_HOME_SECTIONS = [
    { id: 'recent-albums' as const, enabled: true, order: 0 },
    { id: 'artist-mix' as const, enabled: true, order: 1 },
    { id: 'genre-mix' as const, enabled: false, order: 2 },
    { id: 'recently-played' as const, enabled: false, order: 3 },
    { id: 'my-playlists' as const, enabled: false, order: 4 },
    { id: 'top-played' as const, enabled: false, order: 5 },
    { id: 'favorite-radios' as const, enabled: false, order: 6 },
    { id: 'surprise-me' as const, enabled: false, order: 7 },
    { id: 'shared-albums' as const, enabled: false, order: 8 },
  ];

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
      homeSections: raw.homeSections ?? this.DEFAULT_HOME_SECTIONS,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(user: User) {
    const primitives = user.toPrimitives();
    return {
      id: primitives.id,
      username: primitives.username,
      password_hash: primitives.passwordHash,
      name: primitives.name || null,
      is_active: primitives.isActive,
      is_admin: primitives.isAdmin,
      theme: primitives.theme,
      language: primitives.language,
      must_change_password: primitives.mustChangePassword,
      avatar_path: primitives.avatarPath || null,
      avatar_mime_type: primitives.avatarMimeType || null,
      avatar_size: primitives.avatarSize || null,
      avatar_updated_at: primitives.avatarUpdatedAt || null,
      last_login_at: primitives.lastLoginAt || null,
      last_access_at: primitives.lastAccessAt || null,
      is_public_profile: primitives.isPublicProfile,
      show_top_tracks: primitives.showTopTracks,
      show_top_artists: primitives.showTopArtists,
      show_top_albums: primitives.showTopAlbums,
      show_playlists: primitives.showPlaylists,
      bio: primitives.bio || null,
      home_sections: primitives.homeSections,
      created_at: primitives.createdAt,
      updated_at: primitives.updatedAt,
    };
  }
}
