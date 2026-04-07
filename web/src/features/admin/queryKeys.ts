/**
 * Query keys centralizadas para el feature Admin.
 * Usar estas constantes en lugar de arrays inline para evitar typos
 * en invalidaciones cruzadas.
 */

export const adminKeys = {
  // Dashboard
  dashboard: ['admin', 'dashboard', 'stats'] as const,

  // Users
  users: {
    all: ['admin', 'users'] as const,
    list: (skip: number, take: number) => ['admin', 'users', skip, take] as const,
  },

  // Logs
  logs: {
    all: ['admin', 'logs'] as const,
    list: (params: Record<string, unknown>) => ['admin', 'logs', params] as const,
    retention: ['admin', 'logs', 'retention'] as const,
  },

  // Missing files
  missingFiles: ['admin', 'missing-files'] as const,

  // Federation
  federation: {
    invitations: ['federation', 'invitations'] as const,
    servers: {
      all: ['federation', 'servers'] as const,
      detail: (id: string) => ['federation', 'servers', id] as const,
    },
    library: (serverId: string, page: number, limit: number) =>
      ['federation', 'library', serverId, page, limit] as const,
    albums: (serverId: string, page: number, limit: number, search?: string) =>
      ['federation', 'albums', serverId, page, limit, search] as const,
    album: (serverId: string, albumId: string) =>
      ['federation', 'album', serverId, albumId] as const,
    accessTokens: ['federation', 'access-tokens'] as const,
    pendingMutual: ['federation', 'pending-mutual'] as const,
  },

  // Scanner
  scanner: {
    all: ['scanner'] as const,
    status: (scanId: string) => ['scanner', 'status', scanId] as const,
    history: (page: number, limit: number) => ['scanner', 'history', page, limit] as const,
    lufsStatus: ['scanner', 'lufs-status'] as const,
  },

  // Metadata
  metadata: {
    conflicts: {
      all: ['metadata-conflicts'] as const,
      list: (params: Record<string, unknown>) => ['metadata-conflicts', params] as const,
      entity: (entityType: string, entityId: string) =>
        ['metadata-conflicts', 'entity', entityType, entityId] as const,
    },
    enrichmentLogs: (filters?: Record<string, unknown>) =>
      filters ? (['enrichmentLogs', filters] as const) : (['enrichmentLogs'] as const),
    enrichmentStats: (period?: string) =>
      period ? (['enrichmentStats', period] as const) : (['enrichmentStats'] as const),
  },

  // Maintenance
  maintenance: {
    storageStats: ['admin', 'maintenance', 'storage-stats'] as const,
    storagePaths: ['admin', 'maintenance', 'storage-paths'] as const,
  },

  // Server identity
  serverIdentity: ['admin', 'server-identity'] as const,

  // Album covers
  albumCovers: (albumId: string) => ['albumCovers', albumId] as const,
  customAlbumCovers: (albumId: string) => ['customAlbumCovers', albumId] as const,

  // Artist avatars
  artistAvatars: (artistId: string) => ['artistAvatars', artistId] as const,
  customArtistImages: (artistId: string) => ['customArtistImages', artistId] as const,

  // Radio favicons
  radioFavicons: {
    stats: ['admin', 'radio-favicons', 'stats'] as const,
    list: ['admin', 'radio-favicons', 'list'] as const,
  },
} as const;
