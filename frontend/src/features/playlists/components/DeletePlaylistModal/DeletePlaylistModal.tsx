import { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@shared/components/ui';
import styles from './DeletePlaylistModal.module.css';

interface DeletePlaylistModalProps {
  playlistName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * DeletePlaylistModal Component
 * Modal for confirming playlist deletion
 */
export function DeletePlaylistModal({
  playlistName,
  onClose,
  onConfirm,
  isLoading = false
}: DeletePlaylistModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isLoading]);

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error is handled by parent component
      console.error('Error in delete confirmation:', error);
    }
  };

  return (
    <div className={styles.deletePlaylistModal} onClick={onClose}>
      <div className={styles.deletePlaylistModal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.deletePlaylistModal__header}>
          <div className={styles.deletePlaylistModal__iconWrapper}>
            <AlertTriangle size={24} className={styles.deletePlaylistModal__icon} />
          </div>
          <button
            className={styles.deletePlaylistModal__closeButton}
            onClick={onClose}
            aria-label="Cerrar"
            type="button"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.deletePlaylistModal__body}>
          <h2 className={styles.deletePlaylistModal__title}>¿Eliminar playlist?</h2>
          <p className={styles.deletePlaylistModal__description}>
            ¿Estás seguro de que quieres eliminar <strong>"{playlistName}"</strong>?
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Actions */}
        <div className={styles.deletePlaylistModal__actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
