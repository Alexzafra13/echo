export interface RemoveTrackFromPlaylistInput {
  playlistId: string;
  trackId: string;
  userId: string;
}

export interface RemoveTrackFromPlaylistOutput {
  success: boolean;
  message: string;
}
