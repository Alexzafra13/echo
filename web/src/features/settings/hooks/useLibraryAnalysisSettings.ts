import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';

interface AnalysisSettings {
  lufsEnabled: boolean;
  djEnabled: boolean;
}

interface SettingDTO {
  key: string;
  value: string;
}

const SETTINGS_KEYS = {
  lufs: 'lufs.auto_analysis.enabled',
  dj: 'dj.auto_analysis.enabled',
};

/**
 * Hook para manejar los settings de análisis de librería (LUFS y DJ)
 */
export function useLibraryAnalysisSettings() {
  const queryClient = useQueryClient();

  // Fetch settings
  const { data, isLoading, error } = useQuery({
    queryKey: ['library-analysis-settings'],
    queryFn: async (): Promise<AnalysisSettings> => {
      const response = await apiClient.get<SettingDTO[]>('/admin/settings');
      const settings = response.data;

      const lufsEnabled = settings.find(s => s.key === SETTINGS_KEYS.lufs)?.value !== 'false';
      const djEnabled = settings.find(s => s.key === SETTINGS_KEYS.dj)?.value !== 'false';

      return { lufsEnabled, djEnabled };
    },
    staleTime: 30000, // 30 seconds
  });

  // Update setting mutation
  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiClient.put(`/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-analysis-settings'] });
    },
  });

  // Toggle LUFS
  const setLufsEnabled = (enabled: boolean) => {
    updateMutation.mutate({ key: SETTINGS_KEYS.lufs, value: String(enabled) });
  };

  // Toggle DJ
  const setDjEnabled = (enabled: boolean) => {
    updateMutation.mutate({ key: SETTINGS_KEYS.dj, value: String(enabled) });
  };

  return {
    lufsEnabled: data?.lufsEnabled ?? true,
    djEnabled: data?.djEnabled ?? true,
    isLoading,
    error,
    setLufsEnabled,
    setDjEnabled,
    isSaving: updateMutation.isPending,
  };
}
