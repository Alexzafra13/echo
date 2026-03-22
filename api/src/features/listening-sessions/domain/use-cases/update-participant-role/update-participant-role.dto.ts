import { ParticipantRole } from '../../entities/listening-session.entity';

export interface UpdateParticipantRoleInput {
  sessionId: string;
  targetUserId: string;
  role: ParticipantRole;
  requesterId: string;
}

export interface UpdateParticipantRoleOutput {
  userId: string;
  role: string;
  message: string;
}
