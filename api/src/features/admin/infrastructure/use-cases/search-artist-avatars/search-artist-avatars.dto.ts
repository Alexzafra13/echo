export interface SearchArtistAvatarsInput {
  artistId: string;
}

export interface AvatarOption {
  provider: string; // 'lastfm', 'fanart', 'spotify', etc.
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  type?: string; // 'profile', 'background', 'banner', 'logo'
}

export interface SearchArtistAvatarsOutput {
  avatars: AvatarOption[];
  artistInfo: {
    id: string;
    name: string;
    mbzArtistId?: string;
  };
}
