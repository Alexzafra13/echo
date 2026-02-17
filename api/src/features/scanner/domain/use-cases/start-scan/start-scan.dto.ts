export interface StartScanInput {
  path?: string;
  recursive?: boolean;
  pruneDeleted?: boolean;
}

export interface StartScanOutput {
  id: string;
  status: string;
  startedAt: Date;
  message: string;
}
