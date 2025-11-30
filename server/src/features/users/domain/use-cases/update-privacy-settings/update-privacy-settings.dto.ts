export interface UpdatePrivacySettingsInput {
  userId: string;
  isPublicProfile?: boolean;
  showTopTracks?: boolean;
  showTopArtists?: boolean;
  showTopAlbums?: boolean;
  showPlaylists?: boolean;
  bio?: string | null;
}

export interface UpdatePrivacySettingsOutput {
  isPublicProfile: boolean;
  showTopTracks: boolean;
  showTopArtists: boolean;
  showTopAlbums: boolean;
  showPlaylists: boolean;
  bio?: string;
}
