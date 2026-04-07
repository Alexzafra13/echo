import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@shared/hooks';
import {
  getMissingFiles,
  purgeMissingFiles,
  deleteMissingTrack,
  updatePurgeMode,
  type MissingFilesResponse,
  type MissingTrack,
} from '../api/missing-files.service';
import { adminKeys } from '../queryKeys';
import { logger } from '@shared/utils/logger';

export function useMissingFiles() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { notification, showSuccess, showError, dismiss } = useNotification();

  // UI-only form state
  const [newPurgeMode, setNewPurgeMode] = useState('never');
  const [purgeDays, setPurgeDays] = useState(30);

  // ── Query ──────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    error: queryError,
    refetch: loadMissingFiles,
  } = useQuery<MissingFilesResponse>({
    queryKey: adminKeys.missingFiles,
    queryFn: getMissingFiles,
  });

  // Sync form state when query data changes
  useEffect(() => {
    if (!data) return;
    if (data.purgeMode.startsWith('after_days:')) {
      setNewPurgeMode('after_days');
      setPurgeDays(parseInt(data.purgeMode.replace('after_days:', ''), 10));
    } else {
      setNewPurgeMode(data.purgeMode);
    }
  }, [data]);

  // Show error notification on query failure
  useEffect(() => {
    if (queryError) {
      if (import.meta.env.DEV) {
        logger.error('Error loading missing files:', queryError);
      }
      showError(t('common.error'));
    }
  }, [queryError, showError, t]);

  const tracks: MissingTrack[] = data?.tracks ?? [];
  const purgeMode: string = data?.purgeMode ?? 'never';

  // ── Purge mutation ─────────────────────────────────────────────────
  const purgeMutation = useMutation({
    mutationFn: purgeMissingFiles,
    onSuccess(result) {
      showSuccess(result.message);
      queryClient.invalidateQueries({ queryKey: adminKeys.missingFiles });
    },
    onError(error) {
      if (import.meta.env.DEV) {
        logger.error('Error purging missing files:', error);
      }
      showError(t('common.error'));
    },
  });

  // ── Delete track mutation (optimistic) ─────────────────────────────
  const deleteTrackMutation = useMutation({
    mutationFn: deleteMissingTrack,
    onMutate: async (trackId: string) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.missingFiles });
      const previous = queryClient.getQueryData<MissingFilesResponse>(adminKeys.missingFiles);

      if (previous) {
        queryClient.setQueryData<MissingFilesResponse>(adminKeys.missingFiles, {
          ...previous,
          tracks: previous.tracks.filter((tr) => tr.id !== trackId),
          count: previous.count - 1,
        });
      }

      return { previous };
    },
    onSuccess(result) {
      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    },
    onError(error, _trackId, context) {
      if (context?.previous) {
        queryClient.setQueryData(adminKeys.missingFiles, context.previous);
      }
      if (import.meta.env.DEV) {
        logger.error('Error deleting track:', error);
      }
      showError(t('common.error'));
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: adminKeys.missingFiles });
    },
  });

  // ── Save purge settings mutation ───────────────────────────────────
  const saveSettingsMutation = useMutation({
    mutationFn: (mode: string) => updatePurgeMode(mode),
    onSuccess(_data, mode) {
      // Update cache so purgeMode reflects immediately
      queryClient.setQueryData<MissingFilesResponse>(adminKeys.missingFiles, (old) =>
        old ? { ...old, purgeMode: mode } : old
      );
      showSuccess(t('profile.settingsSaved'));
    },
    onError(error) {
      if (import.meta.env.DEV) {
        logger.error('Error saving settings:', error);
      }
      showError(t('common.error'));
    },
  });

  // ── Handlers (preserve same API shape) ─────────────────────────────
  const handlePurge = () => purgeMutation.mutateAsync();

  const handleDeleteTrack = (trackId: string) => deleteTrackMutation.mutateAsync(trackId);

  const handleSaveSettings = async (): Promise<boolean> => {
    const mode = newPurgeMode === 'after_days' ? `after_days:${purgeDays}` : newPurgeMode;
    try {
      await saveSettingsMutation.mutateAsync(mode);
      return true;
    } catch {
      return false;
    }
  };

  return {
    tracks,
    purgeMode,
    isLoading,
    isPurging: purgeMutation.isPending,
    deletingId: deleteTrackMutation.isPending ? (deleteTrackMutation.variables ?? null) : null,
    notification,
    dismiss,
    loadMissingFiles,
    handlePurge,
    handleDeleteTrack,
    handleSaveSettings,
    // Settings form state
    newPurgeMode,
    setNewPurgeMode,
    purgeDays,
    setPurgeDays,
  };
}
