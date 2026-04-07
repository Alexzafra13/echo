import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/services/api';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { adminKeys } from '../queryKeys';

interface SystemLog {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info' | 'debug';
  category: string;
  message: string;
  details: string | null;
  userId: string | null;
  entityId: string | null;
  entityType: string | null;
  stackTrace: string | null;
  createdAt: string;
}

interface LogsResponse {
  logs: SystemLog[];
  total: number;
  limit: number;
  offset: number;
}

export type { SystemLog };

/**
 * Hook para gestionar la carga y filtrado de logs del sistema
 */
export function useLogs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const [manualError, setManualError] = useState<string | null>(null);
  const limit = 10;

  const params: Record<string, unknown> = { limit, offset };
  if (selectedLevel !== 'all') params.level = selectedLevel;
  if (selectedCategory !== 'all') params.category = selectedCategory;

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery<LogsResponse>({
    queryKey: adminKeys.logs.list({
      level: selectedLevel,
      category: selectedCategory,
      limit,
      offset,
    }),
    queryFn: async () => {
      const response = await apiClient.get<LogsResponse>('/logs', { params });
      return response.data;
    },
  });

  const error =
    manualError ?? (queryError ? getApiErrorMessage(queryError, t('admin.logs.loadError')) : null);

  const changeLevel = useCallback((level: string) => {
    setSelectedLevel(level);
    setOffset(0);
  }, []);

  const changeCategory = useCallback((category: string) => {
    setSelectedCategory(category);
    setOffset(0);
  }, []);

  const reloadLogs = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminKeys.logs.all });
  }, [queryClient]);

  return {
    logs: data?.logs ?? [],
    isLoading,
    total: data?.total ?? 0,
    selectedLevel,
    selectedCategory,
    limit,
    offset,
    setOffset,
    error,
    setError: setManualError,
    changeLevel,
    changeCategory,
    reloadLogs,
  };
}

/**
 * Hook para gestionar la retención y limpieza de logs
 */
export function useLogMaintenance(reloadLogs: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    count: number;
    type: 'cleanup' | 'deleteAll';
  } | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load initial retention days
  const retentionQuery = useQuery<{ retentionDays: number }>({
    queryKey: adminKeys.logs.retention,
    queryFn: async () => {
      const res = await apiClient.get<{ retentionDays: number }>('/logs/retention');
      return res.data;
    },
  });

  const [retentionDays, setRetentionDays] = useState<number>(30);

  // Sync query data to local state
  useEffect(() => {
    if (retentionQuery.data) {
      setRetentionDays(retentionQuery.data.retentionDays);
    }
  }, [retentionQuery.data]);

  useEffect(() => () => clearTimeout(cleanupTimerRef.current), []);

  const retentionMutation = useMutation({
    mutationFn: (days: number) =>
      apiClient.put('/admin/settings/logs.retention_days', { value: String(days) }),
  });

  const handleRetentionChange = useCallback(
    async (days: number) => {
      setRetentionDays(days);
      retentionMutation.mutate(days);
    },
    [retentionMutation]
  );

  const cleanupMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ deletedCount: number; retentionDays: number }>('/logs/cleanup'),
    onSuccess: (res) => {
      const count = res.data.deletedCount;
      setCleanupResult({ count, type: 'cleanup' });
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(() => setCleanupResult(null), 5000);
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: adminKeys.logs.all });
        reloadLogs();
      }
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.post<{ deletedCount: number }>('/logs/cleanup/all'),
    onSuccess: (res) => {
      const count = res.data.deletedCount;
      setCleanupResult({ count, type: 'deleteAll' });
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = setTimeout(() => setCleanupResult(null), 8000);
      if (count > 0) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: adminKeys.logs.all });
          reloadLogs();
        }, 500);
      }
    },
  });

  const handleCleanup = useCallback(() => {
    setCleanupResult(null);
    cleanupMutation.mutate();
  }, [cleanupMutation]);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteConfirm(false);
    setCleanupResult(null);
    deleteAllMutation.mutate();
  }, [deleteAllMutation]);

  const error = retentionMutation.error
    ? getApiErrorMessage(retentionMutation.error, t('admin.logs.retentionError'))
    : cleanupMutation.error
      ? getApiErrorMessage(cleanupMutation.error, t('admin.logs.cleanupError'))
      : deleteAllMutation.error
        ? getApiErrorMessage(deleteAllMutation.error, t('admin.logs.deleteAllError'))
        : null;

  return {
    retentionDays,
    isSavingRetention: retentionMutation.isPending,
    isCleaningUp: cleanupMutation.isPending,
    isDeletingAll: deleteAllMutation.isPending,
    showDeleteConfirm,
    setShowDeleteConfirm,
    cleanupResult,
    error,
    handleRetentionChange,
    handleCleanup,
    handleDeleteAll,
  };
}

/**
 * Hook para copiar al portapapeles con feedback visual
 */
export function useCopyToClipboard() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(fieldId);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return { copiedField, handleCopy };
}
