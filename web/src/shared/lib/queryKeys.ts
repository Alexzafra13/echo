/**
 * Centralized Query Keys Factory
 *
 * This file provides a standardized way to create query keys for React Query.
 * Using a factory pattern ensures consistency and makes cache invalidation predictable.
 *
 * @example
 * // In a hook:
 * import { queryKeys } from '@shared/lib/queryKeys';
 *
 * const { data } = useQuery({
 *   queryKey: queryKeys.albums.byId(albumId),
 *   queryFn: () => fetchAlbum(albumId),
 * });
 *
 * // For invalidation:
 * queryClient.invalidateQueries({ queryKey: queryKeys.albums.all });
 */

export const queryKeys = {
  // Albums
  albums: {
    all: ['albums'] as const,
    recent: (take?: number) => [...queryKeys.albums.all, 'recent', take] as const,
    featured: () => [...queryKeys.albums.all, 'featured'] as const,
    topPlayed: (take?: number) => [...queryKeys.albums.all, 'top-played', take] as const,
    byId: (id: string) => [...queryKeys.albums.all, id] as const,
    tracks: (albumId: string) => [...queryKeys.albums.byId(albumId), 'tracks'] as const,
    search: (query: string) => [...queryKeys.albums.all, 'search', query] as const,
    alphabetical: (params?: Record<string, unknown>) => [...queryKeys.albums.all, 'alphabetical', params] as const,
    coverMetadata: (id: string) => ['album-cover-metadata', id] as const,
  },

  // Artists
  artists: {
    all: ['artists'] as const,
    byId: (id: string) => [...queryKeys.artists.all, id] as const,
    albums: (artistId: string) => [...queryKeys.artists.byId(artistId), 'albums'] as const,
    images: (artistId: string) => [...queryKeys.artists.byId(artistId), 'images'] as const,
    search: (query: string) => [...queryKeys.artists.all, 'search', query] as const,
  },

  // Tracks
  tracks: {
    all: ['tracks'] as const,
    search: (query: string, params?: Record<string, unknown>) => [...queryKeys.tracks.all, 'search', query, params] as const,
    byAlbum: (albumId: string) => [...queryKeys.tracks.all, 'album', albumId] as const,
  },

  // Playlists
  playlists: {
    all: ['playlists'] as const,
    byId: (id: string) => [...queryKeys.playlists.all, id] as const,
    tracks: (playlistId: string) => [...queryKeys.playlists.byId(playlistId), 'tracks'] as const,
    user: () => [...queryKeys.playlists.all, 'user'] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
    stats: () => [...queryKeys.user.all, 'stats'] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    users: (skip?: number, take?: number) => [...queryKeys.admin.all, 'users', skip, take] as const,
    logs: (params?: Record<string, unknown>) => [...queryKeys.admin.all, 'logs', params] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
  },

  // Scanner
  scanner: {
    all: ['scanner'] as const,
    status: (scanId?: string) => [...queryKeys.scanner.all, 'status', scanId] as const,
    history: (page?: number, limit?: number) => [...queryKeys.scanner.all, 'history', page, limit] as const,
  },

  // Metadata
  metadata: {
    all: ['metadata'] as const,
    settings: () => [...queryKeys.metadata.all, 'settings'] as const,
    conflicts: (params?: Record<string, unknown>) => [...queryKeys.metadata.all, 'conflicts', params] as const,
    entity: (entityType: string, entityId: string) => [...queryKeys.metadata.all, 'entity', entityType, entityId] as const,
  },

  // Recommendations
  recommendations: {
    all: ['recommendations'] as const,
    waveMix: (id?: string) => [...queryKeys.recommendations.all, 'wave-mix', id] as const,
    dailyMix: () => [...queryKeys.recommendations.all, 'daily-mix'] as const,
    artistPlaylists: (artistId?: string) => [...queryKeys.recommendations.all, 'artist', artistId] as const,
  },

  // Radio
  radio: {
    all: ['radio'] as const,
    stations: (params?: Record<string, unknown>) => [...queryKeys.radio.all, 'stations', params] as const,
    favorites: () => [...queryKeys.radio.all, 'favorites'] as const,
  },
} as const;
