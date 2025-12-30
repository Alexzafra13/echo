/**
 * ConfirmDialog Component
 *
 * Reusable confirmation dialog with:
 * - Warning icon
 * - Customizable title, message, and button text
 * - Loading state support
 * - ESC key and click outside to cancel
 * - Configurable variant (warning/danger)
 *
 * Usage:
 * {showConfirm && (
 *   <ConfirmDialog
 *     title="Confirm Action"
 *     message="Are you sure?"
 *     confirmText="Yes"
 *     onConfirm={handleConfirm}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 * )}
 */

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@shared/components/ui';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Text for confirm button */
  confirmText: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Whether action is in progress */
  isLoading?: boolean;
  /** Button variant for confirm action */
  variant?: 'warning' | 'danger';
}

export function ConfirmDialog({
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'warning',
}: ConfirmDialogProps) {
  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isLoading, onCancel]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Click backdrop to cancel
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onCancel();
      }
    },
    [isLoading, onCancel]
  );

  const dialogContent = (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.icon} ${styles[variant]}`}>
          <AlertTriangle size={40} />
        </div>

        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        <p id="confirm-dialog-message" className={styles.message}>
          {message}
        </p>

        <div className={styles.actions}>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'secondary'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
