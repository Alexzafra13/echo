import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, type DashboardStats } from '../api/dashboard.service';

const DASHBOARD_QUERY_KEY = ['admin', 'dashboard', 'stats'] as const;

export function useDashboardStats() {
  const queryClient = useQueryClient();

  const query = useQuery<DashboardStats>({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: () => dashboardApi.getStats(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
  };

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh,
  };
}
