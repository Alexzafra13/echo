import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import styles from './InlineNotification.module.css';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface InlineNotificationProps {
  type: NotificationType;
  message: string;
  onDismiss?: () => void;
  className?: string;
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
}: InlineNotificationProps) {
  const Icon = iconMap[type];

  return (
    <div className={`${styles.notification} ${styles[type]} ${className}`}>
      <Icon size={16} className={styles.icon} />
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button
          className={styles.dismissButton}
          onClick={onDismiss}
          aria-label="Cerrar notificacion"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
