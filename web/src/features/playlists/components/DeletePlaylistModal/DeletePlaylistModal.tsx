import { useTranslation } from 'react-i18next';
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
  isLoading = false,
}: DeletePlaylistModalProps) {
  const { t } = useTranslation();
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
      title={t('playlists.deleteTitle')}
      icon={AlertTriangle}
    >
      <div className={styles.content}>
        <p className={styles.description}>{t('playlists.deleteConfirm', { name: playlistName })}</p>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
