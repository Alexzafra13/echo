import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Ha ocurrido un error',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={`${styles.errorState} ${className || ''}`}>
      <AlertTriangle size={48} className={styles.icon} />
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
