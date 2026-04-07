import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../Button';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className={`${styles.errorState} ${className || ''}`} role="alert">
      <AlertTriangle size={48} className={styles.icon} aria-hidden="true" />
      <p className={styles.message}>{message || t('errors.defaultError')}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
