import { PlaylistCollaborator, CollaboratorRole } from '../entities/playlist-collaborator.entity';

export interface CollaboratorWithUser {
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

export interface ICollaboratorRepository {
  create(collaborator: PlaylistCollaborator): Promise<PlaylistCollaborator>;
  findById(id: string): Promise<PlaylistCollaborator | null>;
  findByPlaylistAndUser(playlistId: string, userId: string): Promise<PlaylistCollaborator | null>;
  findByPlaylistId(playlistId: string): Promise<CollaboratorWithUser[]>;
  findByUserId(userId: string): Promise<PlaylistCollaborator[]>;
  updateStatus(id: string, status: string): Promise<PlaylistCollaborator | null>;
  updateRole(id: string, role: CollaboratorRole): Promise<PlaylistCollaborator | null>;
  delete(id: string): Promise<boolean>;
  deleteByPlaylistAndUser(playlistId: string, userId: string): Promise<boolean>;
  isCollaborator(playlistId: string, userId: string): Promise<boolean>;
  isEditor(playlistId: string, userId: string): Promise<boolean>;
  hasAccess(playlistId: string, userId: string): Promise<boolean>;
}

export const COLLABORATOR_REPOSITORY = 'ICollaboratorRepository';
