export interface GetCollaboratorsInput {
  playlistId: string;
  requesterId: string;
}

export interface CollaboratorItem {
  id: string;
  playlistId: string;
  userId: string;
  username: string;
  name?: string;
  hasAvatar: boolean;
  role: string;
  status: string;
  invitedBy: string;
  createdAt: Date;
}

export interface GetCollaboratorsOutput {
  playlistId: string;
  collaborators: CollaboratorItem[];
}
