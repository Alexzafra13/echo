import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { useAuth } from './useAuth';

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  scanner: 'idle' | 'running' | 'error';
  metadataApis: {
    lastfm: 'healthy' | 'degraded' | 'down';
    fanart: 'healthy' | 'degraded' | 'down';
    musicbrainz: 'healthy' | 'degraded' | 'down';
  };
  storage: 'healthy' | 'warning' | 'critical';
}

export interface ActiveAlerts {
  orphanedFiles: number;
  pendingConflicts: number;
  missingFiles: number;
  storageWarning: boolean;
  storageDetails?: {
    currentMB: number;
    limitMB: number;
    percentUsed: number;
  };
  scanErrors: number;
}

export interface SystemHealthData {
  systemHealth: SystemHealth;
  activeAlerts: ActiveAlerts;
}

export const systemHealthKeys = {
  health: ['admin', 'dashboard', 'health'] as const,
};

/**
 * Shared hook for admin system health data.
 * Uses React Query so multiple consumers share the same cached request.
 * Polls every 60 seconds.
 */
export function useSystemHealth() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  return useQuery<SystemHealthData>({
    queryKey: systemHealthKeys.health,
    queryFn: async () => {
      const response = await apiClient.get('/admin/dashboard/health');
      return response.data;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 1,
  });
}
