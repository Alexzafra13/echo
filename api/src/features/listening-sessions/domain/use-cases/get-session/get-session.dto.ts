import { ParticipantWithUser, QueueItemWithTrack } from '../../ports';

export interface GetSessionInput {
  sessionId?: string;
  inviteCode?: string;
  userId: string;
}

export interface GetSessionOutput {
  id: string;
  hostId: string;
  name: string;
  inviteCode: string;
  isActive: boolean;
  currentTrackId?: string;
  currentPosition: number;
  participants: ParticipantWithUser[];
  queue: QueueItemWithTrack[];
  createdAt: Date;
}
