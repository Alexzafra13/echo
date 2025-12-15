// Federation Types

export interface SharedAlbum {
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
  serverId: string;
  serverName: string;
  createdAt?: string;
}

export interface SharedAlbumsResponse {
  albums: SharedAlbum[];
  total: number;
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
