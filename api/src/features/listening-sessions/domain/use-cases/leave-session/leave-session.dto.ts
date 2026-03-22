export interface LeaveSessionInput {
  sessionId: string;
  userId: string;
}

export interface LeaveSessionOutput {
  success: boolean;
  message: string;
}
