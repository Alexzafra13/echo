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
