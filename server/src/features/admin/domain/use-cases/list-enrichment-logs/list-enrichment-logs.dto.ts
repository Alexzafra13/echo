export interface ListEnrichmentLogsInput {
  skip?: number;
  take?: number;
  // Filters
  entityType?: 'artist' | 'album';
  provider?: string;
  status?: 'success' | 'partial' | 'error';
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface EnrichmentLogItem {
  id: string;
  entityId: string;
  entityType: string;
  entityName: string;
  provider: string;
  metadataType: string;
  status: string;
  fieldsUpdated: string[];
  errorMessage?: string;
  previewUrl?: string;
  userId?: string;
  processingTime?: number;
  createdAt: Date;
}

export interface ListEnrichmentLogsOutput {
  logs: EnrichmentLogItem[];
  total: number;
}
