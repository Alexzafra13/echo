export interface DeletePlaylistInput {
  id: string;
  userId: string;
}

export interface DeletePlaylistOutput {
  success: boolean;
  message: string;
}
