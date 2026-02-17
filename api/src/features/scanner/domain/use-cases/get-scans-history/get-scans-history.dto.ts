export interface GetScansHistoryInput {
  page?: number;
  limit?: number;
}

export interface ScanHistoryItem {
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

export interface GetScansHistoryOutput {
  scans: ScanHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
