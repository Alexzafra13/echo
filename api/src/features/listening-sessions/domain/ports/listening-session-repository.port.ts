import {
  ListeningSession,
  SessionParticipantProps,
  SessionQueueItemProps,
  ParticipantRole,
} from '../entities/listening-session.entity';

export interface ParticipantWithUser {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  name?: string;
  hasAvatar: boolean;
  role: ParticipantRole;
  joinedAt: Date;
}

export interface QueueItemWithTrack {
  id: string;
  sessionId: string;
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
  createdAt: Date;
}

export interface IListeningSessionRepository {
  // Session CRUD
  create(session: ListeningSession): Promise<ListeningSession>;
  findById(id: string): Promise<ListeningSession | null>;
  findByInviteCode(code: string): Promise<ListeningSession | null>;
  findActiveByHostId(hostId: string): Promise<ListeningSession | null>;
  findActiveByParticipantId(userId: string): Promise<ListeningSession | null>;
  update(id: string, session: ListeningSession): Promise<ListeningSession | null>;
  end(id: string): Promise<boolean>;

  // Participants
  addParticipant(sessionId: string, userId: string, role: ParticipantRole): Promise<SessionParticipantProps>;
  removeParticipant(sessionId: string, userId: string): Promise<boolean>;
  getParticipants(sessionId: string): Promise<ParticipantWithUser[]>;
  getParticipant(sessionId: string, userId: string): Promise<SessionParticipantProps | null>;
  updateParticipantRole(sessionId: string, userId: string, role: ParticipantRole): Promise<boolean>;

  // Queue
  addToQueue(sessionId: string, trackId: string, addedBy: string): Promise<SessionQueueItemProps>;
  getQueue(sessionId: string): Promise<QueueItemWithTrack[]>;
  markPlayed(sessionId: string, position: number): Promise<boolean>;
  getNextUnplayed(sessionId: string): Promise<QueueItemWithTrack | null>;
  removeFromQueue(sessionId: string, queueItemId: string): Promise<boolean>;
  clearQueue(sessionId: string): Promise<boolean>;
}

export const LISTENING_SESSION_REPOSITORY = 'IListeningSessionRepository';
