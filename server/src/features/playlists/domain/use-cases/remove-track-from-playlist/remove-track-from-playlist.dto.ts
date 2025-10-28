export interface RemoveTrackFromPlaylistInput {
  playlistId: string;
  trackId: string;
}

export interface RemoveTrackFromPlaylistOutput {
  success: boolean;
  message: string;
}
