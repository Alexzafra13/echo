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
    alphabetical: (params?: Record<string, unknown>) =>
      [...queryKeys.albums.all, 'alphabetical', params] as const,
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
    search: (query: string, params?: Record<string, unknown>) =>
      [...queryKeys.tracks.all, 'search', query, params] as const,
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
    history: (page?: number, limit?: number) =>
      [...queryKeys.scanner.all, 'history', page, limit] as const,
  },

  // Metadata
  metadata: {
    all: ['metadata'] as const,
    settings: () => [...queryKeys.metadata.all, 'settings'] as const,
    conflicts: (params?: Record<string, unknown>) =>
      [...queryKeys.metadata.all, 'conflicts', params] as const,
    entity: (entityType: string, entityId: string) =>
      [...queryKeys.metadata.all, 'entity', entityType, entityId] as const,
  },

  // Recommendations
  recommendations: {
    all: ['recommendations'] as const,
    waveMix: (id?: string) => [...queryKeys.recommendations.all, 'wave-mix', id] as const,
    dailyMix: () => [...queryKeys.recommendations.all, 'daily-mix'] as const,
    artistPlaylists: (artistId?: string) =>
      [...queryKeys.recommendations.all, 'artist', artistId] as const,
    autoPlaylists: () => [...queryKeys.recommendations.all, 'auto-playlists'] as const,
  },

  // Radio
  radio: {
    all: ['radio'] as const,
    stations: (params?: Record<string, unknown>) =>
      [...queryKeys.radio.all, 'stations', params] as const,
    favorites: () => [...queryKeys.radio.all, 'favorites'] as const,
    isFavorite: (stationUuid: string) =>
      [...queryKeys.radio.all, 'is-favorite', stationUuid] as const,
    search: (params?: Record<string, unknown>) =>
      [...queryKeys.radio.all, 'search', params] as const,
    topVoted: (limit?: number) => [...queryKeys.radio.all, 'top-voted', limit] as const,
    popular: (limit?: number) => [...queryKeys.radio.all, 'popular', limit] as const,
    byCountry: (countryCode: string, limit?: number) =>
      [...queryKeys.radio.all, 'by-country', countryCode, limit] as const,
    byTag: (tag: string, limit?: number) => [...queryKeys.radio.all, 'by-tag', tag, limit] as const,
    tags: (limit?: number) => [...queryKeys.radio.all, 'tags', limit] as const,
    countries: () => [...queryKeys.radio.all, 'countries'] as const,
  },

  // Social
  social: {
    all: ['social'] as const,
    overview: () => [...queryKeys.social.all, 'overview'] as const,
    friends: () => [...queryKeys.social.all, 'friends'] as const,
    pending: () => [...queryKeys.social.all, 'pending'] as const,
    listening: () => [...queryKeys.social.all, 'listening'] as const,
    activity: (limit?: number) => [...queryKeys.social.all, 'activity', limit] as const,
    search: (query: string) => [...queryKeys.social.all, 'search', query] as const,
  },

  // Federation
  federation: {
    all: ['federation'] as const,
    invitations: () => [...queryKeys.federation.all, 'invitations'] as const,
    servers: () => [...queryKeys.federation.all, 'servers'] as const,
    serverById: (id: string) => [...queryKeys.federation.all, 'servers', id] as const,
    library: (serverId: string, page: number, limit: number) =>
      [...queryKeys.federation.all, 'library', serverId, page, limit] as const,
    albums: (serverId: string, page: number, limit: number, search?: string) =>
      [...queryKeys.federation.all, 'albums', serverId, page, limit, search] as const,
    album: (serverId: string, albumId: string) =>
      [...queryKeys.federation.all, 'album', serverId, albumId] as const,
    accessTokens: () => [...queryKeys.federation.all, 'access-tokens'] as const,
    pendingMutual: () => [...queryKeys.federation.all, 'pending-mutual'] as const,
    sharedAlbums: (params?: Record<string, unknown>) =>
      [...queryKeys.federation.all, 'shared-albums', params] as const,
    sharedAlbumsHome: (limit?: number) =>
      [...queryKeys.federation.all, 'shared-albums', 'home', limit] as const,
    imports: () => [...queryKeys.federation.all, 'imports'] as const,
    remoteAlbum: (serverId: string, albumId: string) =>
      [...queryKeys.federation.all, 'remote-album', serverId, albumId] as const,
  },

  // Explore
  explore: {
    all: ['explore'] as const,
    unplayed: (limit: number, offset: number) =>
      [...queryKeys.explore.all, 'unplayed', limit, offset] as const,
    forgotten: (limit: number, offset: number, monthsAgo?: number) =>
      [...queryKeys.explore.all, 'forgotten', limit, offset, monthsAgo] as const,
    hiddenGems: (limit: number) => [...queryKeys.explore.all, 'hidden-gems', limit] as const,
    randomAlbums: (count: number) => [...queryKeys.explore.all, 'random-albums', count] as const,
  },

  // Settings
  settings: {
    privacy: () => ['privacy-settings'] as const,
    homePreferences: () => ['home-preferences'] as const,
    libraryAnalysis: () => ['library-analysis-settings'] as const,
  },

  // Media (covers, avatars, custom images)
  media: {
    albumCovers: (albumId: string) => ['albumCovers', albumId] as const,
    customAlbumCovers: (albumId: string) => ['customAlbumCovers', albumId] as const,
    artistAvatars: (artistId: string) => ['artistAvatars', artistId] as const,
    customArtistImages: (artistId: string) => ['customArtistImages', artistId] as const,
  },

  // Enrichment
  enrichment: {
    logs: (filters?: Record<string, unknown>) => ['enrichmentLogs', filters] as const,
    stats: (period?: string) => ['enrichmentStats', period] as const,
    autoSearchConfig: () => ['autoSearchConfig'] as const,
    autoSearchStats: () => ['autoSearchStats'] as const,
  },

  // Public profiles
  publicProfile: {
    byId: (userId: string) => ['public-profile', userId] as const,
  },

  // Trending
  trending: {
    byRange: (timeRange: string) => ['trending', timeRange] as const,
  },

  // Player
  player: {
    streamToken: () => ['stream-token'] as const,
  },

  // User country (for radio)
  userCountry: () => ['user-country'] as const,
} as const;
