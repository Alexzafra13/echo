export interface StreamTrackInput {
  trackId: string;
  range?: string;
}

export interface StreamTrackOutput {
  trackId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
}
