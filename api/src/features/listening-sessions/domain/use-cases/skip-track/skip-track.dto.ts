export interface SkipTrackInput {
  sessionId: string;
  userId: string;
}

export interface SkipTrackOutput {
  sessionId: string;
  nextTrackId?: string;
  nextTrackTitle?: string;
  position: number;
  message: string;
}
