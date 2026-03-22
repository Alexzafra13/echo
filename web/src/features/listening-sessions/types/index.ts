/**
 * Listening Sessions types matching backend DTOs
 */

export type ParticipantRole = 'host' | 'dj' | 'listener';

export interface ListeningSession {
  id: string;
  hostId: string;
  name: string;
  inviteCode: string;
  isActive: boolean;
  currentTrackId?: string;
  currentPosition: number;
  participants: SessionParticipant[];
  queue: SessionQueueItem[];
  createdAt: string;
}

export interface SessionParticipant {
  id: string;
  userId: string;
  username: string;
  name?: string;
  hasAvatar: boolean;
  role: ParticipantRole;
  joinedAt: string;
}

export interface SessionQueueItem {
  id: string;
  trackId: string;
  trackTitle: string;
  trackDuration: number;
  artistName?: string;
  albumName?: string;
  albumId?: string;
  addedBy: string;
  addedByUsername: string;
  position: number;
  played: boolean;
}

export interface CreateSessionDto {
  name: string;
}

export interface JoinSessionDto {
  inviteCode: string;
}

export interface AddToQueueDto {
  trackId: string;
}

export interface UpdateParticipantRoleDto {
  role: ParticipantRole;
}
