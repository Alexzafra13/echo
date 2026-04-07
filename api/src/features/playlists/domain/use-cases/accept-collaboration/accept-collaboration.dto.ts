export interface AcceptCollaborationInput {
  collaborationId: string;
  userId: string; // The user accepting (must be the invited user)
}

export interface AcceptCollaborationOutput {
  id: string;
  playlistId: string;
  userId: string;
  role: string;
  status: string;
  message: string;
}
