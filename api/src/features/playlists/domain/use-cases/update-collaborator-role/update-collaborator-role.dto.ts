import { CollaboratorRole } from '../../entities/playlist-collaborator.entity';

export interface UpdateCollaboratorRoleInput {
  playlistId: string;
  targetUserId: string;
  role: CollaboratorRole;
  requesterId: string; // Must be owner
}

export interface UpdateCollaboratorRoleOutput {
  id: string;
  userId: string;
  role: string;
  message: string;
}
