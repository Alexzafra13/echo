import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@shared/services/api';
import { logger } from '@shared/utils/logger';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import type { NotificationType } from '@shared/components/ui';

interface AutoSearchConfig {
  enabled: boolean;
  confidenceThreshold: number;
  description: string;
}

interface AutoSearchStats {
  totalAutoSearched: number;
  autoApplied: number;
  conflictsCreated: number;
  ignored: number;
}

interface Notification {
  type: NotificationType;
  message: string;
}

export function useAutoSearchConfig() {
  const [config, setConfig] = useState<AutoSearchConfig>({
    enabled: false,
    confidenceThreshold: 95,
    description: '',
  });
  const [stats, setStats] = useState<AutoSearchStats>({
    totalAutoSearched: 0,
    autoApplied: 0,
    conflictsCreated: 0,
    ignored: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setNotification(null);
      const response = await apiClient.get('/admin/mbid-auto-search/config');
      setConfig(response.data);
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error loading auto-search config:', err);
      }
      setNotification({ type: 'error', message: 'Error al cargar configuración de auto-búsqueda' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/mbid-auto-search/stats');
      setStats({
        totalAutoSearched: response.data?.totalAutoSearched || 0,
        autoApplied: response.data?.autoApplied || 0,
        conflictsCreated: response.data?.conflictsCreated || 0,
        ignored: response.data?.ignored || 0,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error loading auto-search stats:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadStats();
  }, [loadConfig, loadStats]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setNotification(null);

      await apiClient.put('/admin/mbid-auto-search/config', {
        enabled: config.enabled,
        confidenceThreshold: config.confidenceThreshold,
      });

      setNotification({ type: 'success', message: 'Configuración guardada correctamente' });
      await loadConfig();
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error saving auto-search config:', err);
      }
      setNotification({
        type: 'error',
        message: getApiErrorMessage(err, 'Error al guardar configuración'),
      });
    } finally {
      setIsSaving(false);
    }
  }, [config.enabled, config.confidenceThreshold, loadConfig]);

  const updateConfig = useCallback((updates: Partial<AutoSearchConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  return {
    // State
    config,
    stats,
    isLoading,
    isSaving,
    notification,

    // Actions
    updateConfig,
    handleSave,
    dismissNotification,
  };
}
