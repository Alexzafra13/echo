import { apiClient } from '@shared/services/api';

export interface EnrichmentLog {
  id: string;
  entityId: string;
  entityType: 'artist' | 'album' | 'radio';
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
  entityType?: 'artist' | 'album' | 'radio';
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

  async backfillLogs(): Promise<{ created: number; artists: number; albums: number }> {
    const response = await apiClient.post<{ created: number; artists: number; albums: number }>(
      '/admin/metadata/enrichment/backfill',
    );
    return response.data;
  },

  async getRetention(): Promise<{ retentionDays: number }> {
    const response = await apiClient.get<{ retentionDays: number }>(
      '/admin/metadata/enrichment/retention',
    );
    return response.data;
  },

  async saveRetention(days: number): Promise<void> {
    await apiClient.put('/admin/settings/enrichment_logs.retention_days', {
      value: String(days),
    });
  },

  async cleanupOldLogs(): Promise<{ deletedCount: number; retentionDays: number }> {
    const response = await apiClient.post<{ deletedCount: number; retentionDays: number }>(
      '/admin/metadata/enrichment/cleanup',
    );
    return response.data;
  },

  async deleteAllLogs(): Promise<{ deletedCount: number }> {
    const response = await apiClient.delete<{ deletedCount: number }>(
      '/admin/metadata/enrichment/history',
    );
    return response.data;
  },
};
