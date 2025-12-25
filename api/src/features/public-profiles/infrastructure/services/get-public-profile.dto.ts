export interface GetPublicProfileInput {
  userId: string;
  requesterId?: string; // ID of user making the request
}

export interface PublicProfileUser {
  id: string;
  username: string;
  name?: string;
  hasAvatar: boolean;
  bio?: string;
  isPublicProfile: boolean;
  createdAt: Date;
}

export interface TopTrack {
  id: string;
  title: string;
  artistName?: string;
  albumName?: string;
  albumId?: string;
  artistId?: string;
  playCount: number;
  coverArtPath?: string;
}

export interface TopArtist {
  id: string;
  name: string;
  profileImagePath?: string;
  externalProfilePath?: string;
  playCount: number;
}

export interface TopAlbum {
  id: string;
  name: string;
  artistName?: string;
  artistId?: string;
  coverArtPath?: string;
  playCount: number;
  year?: number;
}

export interface PublicPlaylist {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  songCount: number;
  duration: number;
  createdAt: Date;
  albumIds: string[];
}

// Social features
export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'self';

export interface ProfileStats {
  totalPlays: number;
  friendCount: number;
}

export interface ListeningNow {
  trackId: string;
  trackTitle: string;
  artistName?: string;
  albumId?: string;
  coverArtPath?: string;
}

export interface GetPublicProfileOutput {
  user: PublicProfileUser;
  // Only included if user has public profile AND has enabled each section
  topTracks?: TopTrack[];
  topArtists?: TopArtist[];
  topAlbums?: TopAlbum[];
  playlists?: PublicPlaylist[];
  // Privacy settings (so frontend knows what to show)
  settings: {
    showTopTracks: boolean;
    showTopArtists: boolean;
    showTopAlbums: boolean;
    showPlaylists: boolean;
  };
  // Social features
  social: {
    friendshipStatus: FriendshipStatus;
    friendshipId?: string; // For accepting/rejecting requests
    stats: ProfileStats;
    listeningNow?: ListeningNow; // Only if friends
  };
}
