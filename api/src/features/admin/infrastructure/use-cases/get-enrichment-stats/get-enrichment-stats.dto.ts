export interface GetEnrichmentStatsInput {
  period?: 'today' | 'week' | 'month' | 'all';
}

export interface ProviderStats {
  provider: string;
  total: number;
  success: number;
  partial: number;
  error: number;
  successRate: number;
}

export interface GetEnrichmentStatsOutput {
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
