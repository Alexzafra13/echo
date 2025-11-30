export interface GetPublicProfileInput {
  userId: string;
  requesterId?: string; // ID of user making the request (for future features like follow)
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
}
