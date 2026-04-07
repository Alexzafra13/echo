import { CollaboratorRole } from '../../entities/playlist-collaborator.entity';

export interface InviteCollaboratorInput {
  playlistId: string;
  targetUserId: string;
  role: CollaboratorRole;
  inviterId: string;
}

export interface InviteCollaboratorOutput {
  id: string;
  playlistId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: Date;
  message: string;
}
