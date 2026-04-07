import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { enrichmentApi } from '../../api/enrichment.service';

export function useRetentionCleanup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load retention setting on mount
  useEffect(() => {
    enrichmentApi
      .getRetention()
      .then((res) => setRetentionDays(res.retentionDays))
      .catch(() => {});
  }, []);

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      clearTimeout(cleanupTimerRef.current);
    },
    []
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['enrichmentLogs'] });
    queryClient.invalidateQueries({ queryKey: ['enrichmentStats'] });
  }, [queryClient]);

  const handleRetentionChange = useCallback(async (days: number) => {
    setRetentionDays(days);
    setIsSavingRetention(true);
    try {
      await enrichmentApi.saveRetention(days);
    } catch {
      // silently fail
    } finally {
      setIsSavingRetention(false);
    }
  }, []);

  const handleCleanup = useCallback(async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    try {
      const res = await enrichmentApi.cleanupOldLogs();
      const count = res.deletedCount;
      setCleanupResult(
        count > 0
          ? t('admin.metadata.historyTab.logsDeleted', { count })
          : t('admin.metadata.historyTab.noOldLogs')
      );
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(() => setCleanupResult(null), 5000);
      if (count > 0) invalidateAll();
    } catch {
      // silently fail
    } finally {
      setIsCleaningUp(false);
    }
  }, [t, invalidateAll]);

  const handleDeleteAll = useCallback(async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setCleanupResult(null);
    try {
      const res = await enrichmentApi.deleteAllLogs();
      const count = res.deletedCount;
      setCleanupResult(
        count > 0
          ? t('admin.metadata.historyTab.logsDeletedAll', { count })
          : t('admin.metadata.historyTab.noLogsToDelete')
      );
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(() => setCleanupResult(null), 5000);
      invalidateAll();
    } catch {
      // silently fail
    } finally {
      setIsDeleting(false);
    }
  }, [t, invalidateAll]);

  return {
    retentionDays,
    isSavingRetention,
    isCleaningUp,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    cleanupResult,
    handleRetentionChange,
    handleCleanup,
    handleDeleteAll,
  };
}
