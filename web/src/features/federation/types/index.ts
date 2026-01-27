// Federation Types

/**
 * Remote album from a specific server's library
 * Used when browsing a server's content via API
 */
export interface RemoteAlbum {
  id: string;
  name: string;
  artistName: string;
  artistId: string;
  year?: number;
  songCount: number;
  duration: number;
  size: number;
  coverUrl?: string;
  genres?: string[];
}

/**
 * Shared album with server identification
 * Extends RemoteAlbum with server info for federated browsing across multiple servers
 */
export interface SharedAlbum extends RemoteAlbum {
  serverId: string;
  serverName: string;
  createdAt?: string;
}

export interface RemoteTrack {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  albumName: string;
  albumId: string;
  trackNumber?: number;
  discNumber?: number;
  duration: number;
  size: number;
  bitRate?: number;
  format?: string;
}

export interface RemoteAlbumWithTracks {
  id: string;
  name: string;
  artistName: string;
  artistId: string;
  year?: number;
  songCount: number;
  duration: number;
  size: number;
  coverUrl?: string;
  genres?: string[];
  tracks: RemoteTrack[];
}

export interface SharedAlbumsResponse {
  albums: SharedAlbum[];
  total: number;
  totalPages?: number;
  serverCount: number;
}

export interface ConnectedServer {
  id: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
  isOnline: boolean;
  lastOnlineAt?: string;
  lastCheckedAt?: string;
  remoteAlbumCount: number;
  remoteTrackCount: number;
  remoteArtistCount: number;
  lastSyncAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  createdAt: string;
}
