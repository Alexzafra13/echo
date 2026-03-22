export interface JoinSessionInput {
  inviteCode: string;
  userId: string;
}

export interface JoinSessionOutput {
  sessionId: string;
  sessionName: string;
  hostId: string;
  role: string;
  message: string;
}
