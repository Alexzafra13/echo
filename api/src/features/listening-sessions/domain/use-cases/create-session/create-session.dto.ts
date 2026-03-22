export interface CreateSessionInput {
  hostId: string;
  name: string;
}

export interface CreateSessionOutput {
  id: string;
  hostId: string;
  name: string;
  inviteCode: string;
  isActive: boolean;
  createdAt: Date;
  message: string;
}
