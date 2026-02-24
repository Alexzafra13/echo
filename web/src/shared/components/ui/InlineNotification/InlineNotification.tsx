import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import styles from './InlineNotification.module.css';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface InlineNotificationProps {
  type: NotificationType;
  message: string;
  onDismiss?: () => void;
  className?: string;
  /** Auto-hide after this many milliseconds (e.g., 3000 for 3 seconds) */
  autoHideMs?: number;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

/**
 * InlineNotification Component
 * Shows a notification message inline (not as a toast)
 * Use this for form feedback, action results, etc.
 */
export function InlineNotification({
  type,
  message,
  onDismiss,
  className = '',
  autoHideMs,
}: InlineNotificationProps) {
  const Icon = iconMap[type];

  // Auto-hide after specified time
  useEffect(() => {
    if (autoHideMs && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoHideMs);
      return () => clearTimeout(timer);
    }
  }, [autoHideMs, onDismiss]);

  return (
    <div
      className={`${styles.notification} ${styles[type]} ${className}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon size={16} className={styles.icon} aria-hidden="true" />
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          className={styles.dismissButton}
          onClick={onDismiss}
          aria-label="Cerrar notificación"
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
