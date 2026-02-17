import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from '@shared/components/ui';
import { logger } from '@shared/utils/logger';
import styles from './DeletePlaylistModal.module.css';

interface DeletePlaylistModalProps {
  playlistName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function DeletePlaylistModal({
  playlistName,
  onClose,
  onConfirm,
  isLoading = false
}: DeletePlaylistModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      logger.error('Error in delete confirmation:', error);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={isLoading ? () => {} : onClose}
      title="¿Eliminar playlist?"
      icon={AlertTriangle}
    >
      <div className={styles.content}>
        <p className={styles.description}>
          ¿Estás seguro de que quieres eliminar <strong>"{playlistName}"</strong>?
          Esta acción no se puede deshacer.
        </p>

        <div className={styles.actions}>
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
    </Modal>
  );
}
