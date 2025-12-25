export interface UpdateArtistBackgroundPositionInput {
  artistId: string;
  backgroundPosition: string; // CSS background-position value (e.g., "center 25%")
}

export interface UpdateArtistBackgroundPositionOutput {
  success: boolean;
  message: string;
}
