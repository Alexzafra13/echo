export interface RemoveCollaboratorInput {
  playlistId: string;
  targetUserId: string; // The collaborator to remove
  requesterId: string; // The user requesting (owner or the collaborator themselves)
}

export interface RemoveCollaboratorOutput {
  success: boolean;
  message: string;
}
