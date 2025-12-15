import { AlertTriangle } from 'lucide-react';
import { Button } from '@shared/components/ui';
import styles from './FederationPanel.module.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalSmall} onClick={(e) => e.stopPropagation()}>
        <div className={styles.confirmIcon}>
          <AlertTriangle size={32} />
        </div>
        <h3 className={styles.confirmTitle}>{title}</h3>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Procesando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
