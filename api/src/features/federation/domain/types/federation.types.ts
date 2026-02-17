export interface FederationPermissions {
  canBrowse: boolean;
  canStream: boolean;
  canDownload: boolean;
}

export type ImportStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export type MutualFederationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface ConnectedServer {
  id: string;
  userId: string;
  name: string;
  baseUrl: string;
  authToken: string;
  isActive: boolean;
  isOnline: boolean;
  lastOnlineAt: Date | null;
  lastCheckedAt: Date | null;
  remoteAlbumCount: number;
  remoteTrackCount: number;
  remoteArtistCount: number;
  lastSyncAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewConnectedServer {
  userId: string;
  name: string;
  baseUrl: string;
  authToken: string;
  isActive?: boolean;
  isOnline?: boolean;
  lastOnlineAt?: Date | null;
  lastCheckedAt?: Date | null;
  remoteAlbumCount?: number;
  remoteTrackCount?: number;
  remoteArtistCount?: number;
  lastSyncAt?: Date | null;
}

export interface FederationToken {
  id: string;
  createdByUserId: string;
  token: string;
  name: string | null;
  isUsed: boolean;
  usedByServerName: string | null;
  usedByIp: string | null;
  usedAt: Date | null;
  expiresAt: Date;
  maxUses: number;
  currentUses: number;
  createdAt: Date;
}

export interface NewFederationToken {
  createdByUserId: string;
  token: string;
  name?: string | null;
  expiresAt: Date;
  maxUses?: number;
}

export interface FederationAccessToken {
  id: string;
  ownerId: string;
  token: string;
  serverName: string;
  serverUrl: string | null;
  permissions: FederationPermissions;
  isActive: boolean;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  expiresAt: Date | null;
  mutualInvitationToken: string | null;
  mutualStatus: MutualFederationStatus;
  mutualRespondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewFederationAccessToken {
  ownerId: string;
  token: string;
  serverName: string;
  serverUrl?: string | null;
  permissions?: FederationPermissions;
  mutualInvitationToken?: string | null;
  mutualStatus?: MutualFederationStatus;
}

export interface AlbumImportQueue {
  id: string;
  userId: string;
  connectedServerId: string;
  remoteAlbumId: string;
  albumName: string;
  artistName: string | null;
  status: ImportStatus;
  progress: number;
  totalTracks: number;
  downloadedTracks: number;
  totalSize: number;
  downloadedSize: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewAlbumImportQueue {
  userId: string;
  connectedServerId: string;
  remoteAlbumId: string;
  albumName: string;
  artistName?: string | null;
  status?: ImportStatus;
  progress?: number;
  totalTracks?: number;
  downloadedTracks?: number;
  totalSize?: number;
  downloadedSize?: number;
}
