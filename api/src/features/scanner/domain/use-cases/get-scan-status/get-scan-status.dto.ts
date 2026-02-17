export interface GetScanStatusInput {
  id: string;
}

export interface GetScanStatusOutput {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt?: Date;
  tracksAdded: number;
  tracksUpdated: number;
  tracksDeleted: number;
  totalChanges: number;
  durationMs?: number;
  errorMessage?: string;
}
