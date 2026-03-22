export interface EndSessionInput {
  sessionId: string;
  userId: string;
}

export interface EndSessionOutput {
  success: boolean;
  message: string;
}
