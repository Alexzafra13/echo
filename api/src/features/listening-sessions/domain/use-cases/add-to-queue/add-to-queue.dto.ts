export interface AddToQueueInput {
  sessionId: string;
  trackId: string;
  userId: string;
}

export interface AddToQueueOutput {
  sessionId: string;
  trackId: string;
  position: number;
  addedBy: string;
  message: string;
}
