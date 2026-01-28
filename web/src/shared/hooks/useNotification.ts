import { useState, useCallback } from 'react';
import type { NotificationType } from '@shared/components/ui';

interface Notification {
  type: NotificationType;
  message: string;
}

export function useNotification() {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showSuccess = useCallback((message: string) => {
    setNotification({ type: 'success', message });
  }, []);

  const showError = useCallback((message: string) => {
    setNotification({ type: 'error', message });
  }, []);

  const showWarning = useCallback((message: string) => {
    setNotification({ type: 'warning', message });
  }, []);

  const showInfo = useCallback((message: string) => {
    setNotification({ type: 'info', message });
  }, []);

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismiss,
  };
}
