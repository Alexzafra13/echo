import { CheckCircle, XCircle, RefreshCw, Pause, Square, Clock } from 'lucide-react';
import { TFunction } from 'i18next';
import styles from './ScannerPanel.module.css';

export function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle size={20} className={styles.statusIconSuccess} />;
    case 'failed':
      return <XCircle size={20} className={styles.statusIconError} />;
    case 'running':
      return <RefreshCw size={20} className={styles.statusIconRunning} />;
    case 'paused':
      return <Pause size={20} className={styles.statusIconPaused} />;
    case 'cancelled':
      return <Square size={20} className={styles.statusIconError} />;
    default:
      return <Clock size={20} className={styles.statusIconPending} />;
  }
}

export function getStatusText(status: string, t: TFunction) {
  switch (status) {
    case 'completed':
      return t('admin.scanner.statusCompleted');
    case 'failed':
      return t('admin.scanner.statusFailed');
    case 'running':
      return t('admin.scanner.statusRunning');
    case 'pending':
      return t('admin.scanner.statusPending');
    case 'paused':
      return t('admin.scanner.statusPaused');
    case 'cancelled':
      return t('admin.scanner.statusCancelled');
    default:
      return status;
  }
}
