export interface AddTrackToPlaylistInput {
  playlistId: string;
  trackId: string;
}

export interface AddTrackToPlaylistOutput {
  playlistId: string;
  trackId: string;
  trackOrder: number;
  createdAt: Date;
  message: string;
}
