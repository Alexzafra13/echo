export interface ReorderPlaylistTracksInput {
  playlistId: string;
  userId: string;
  trackOrders: Array<{
    trackId: string;
    order: number;
  }>;
}

export interface ReorderPlaylistTracksOutput {
  success: boolean;
  message: string;
  playlistId: string;
}
