import { apiClient } from '@shared/services/api';

export interface EnrichmentLog {
  id: string;
  entityId: string;
  entityType: 'artist' | 'album';
  entityName: string;
  provider: string;
  metadataType: string;
  status: 'success' | 'partial' | 'error';
  fieldsUpdated: string[];
  errorMessage?: string;
  previewUrl?: string;
  userId?: string;
  processingTime?: number;
  createdAt: string;
}

export interface ListEnrichmentLogsResponse {
  logs: EnrichmentLog[];
  total: number;
}

export interface ListEnrichmentLogsFilters {
  skip?: number;
  take?: number;
  entityType?: 'artist' | 'album';
  provider?: string;
  status?: 'success' | 'partial' | 'error';
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProviderStats {
  provider: string;
  total: number;
  success: number;
  partial: number;
  error: number;
  successRate: number;
}

export interface EnrichmentStats {
  totalEnrichments: number;
  successCount: number;
  partialCount: number;
  errorCount: number;
  successRate: number;
  byProvider: ProviderStats[];
  byEntityType: {
    artist: number;
    album: number;
  };
  averageProcessingTime: number;
  recentActivity: {
    date: string;
    count: number;
  }[];
}

export const enrichmentApi = {
  async listEnrichmentLogs(
    filters?: ListEnrichmentLogsFilters,
  ): Promise<ListEnrichmentLogsResponse> {
    const response = await apiClient.get<ListEnrichmentLogsResponse>(
      '/admin/metadata/enrichment/history',
      { params: filters },
    );
    return response.data;
  },

  async getEnrichmentStats(
    period?: 'today' | 'week' | 'month' | 'all',
  ): Promise<EnrichmentStats> {
    const response = await apiClient.get<EnrichmentStats>(
      '/admin/metadata/enrichment/stats',
      { params: { period } },
    );
    return response.data;
  },
};
