import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal } from '@shared/components/ui';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { Playlist, UpdatePlaylistDto } from '../../types';
import styles from './EditPlaylistModal.module.css';

interface EditPlaylistModalProps {
  playlist: Playlist;
  onClose: () => void;
  onSubmit: (id: string, data: UpdatePlaylistDto) => Promise<void>;
  isLoading?: boolean;
}

export function EditPlaylistModal({ playlist, onClose, onSubmit, isLoading = false }: EditPlaylistModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');
  const [isPublic, setIsPublic] = useState(playlist.public ?? false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('playlists.nameRequired'));
      return;
    }

    try {
      const updateData: UpdatePlaylistDto = {
        name: name.trim(),
        description: description.trim() || undefined,
        public: isPublic,
      };

      await onSubmit(playlist.id, updateData);
      onClose();
    } catch (error) {
      setError(getApiErrorMessage(error, t('playlists.updateError')));
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={t('playlists.editTitle')}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          id="playlist-name"
          label={t('playlists.nameLabel')}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder={t('playlists.namePlaceholder')}
          autoFocus
          disabled={isLoading}
          error={error}
        />

        <div className={styles.field}>
          <label htmlFor="playlist-description" className={styles.label}>
            {t('playlists.descriptionLabel')}
          </label>
          <textarea
            id="playlist-description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('playlists.descriptionPlaceholder')}
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div
          className={styles.toggleField}
          onClick={() => !isLoading && setIsPublic(!isPublic)}
        >
          <div className={styles.toggleContent}>
            <span className={styles.toggleTitle}>{t('playlists.publicPlaylist')}</span>
            <span className={styles.toggleHint}>
              {isPublic
                ? t('playlists.visiblePublic')
                : t('playlists.visiblePrivate')}
            </span>
          </div>
          <label className={styles.toggleSwitch} onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isLoading}
            />
            <span className={styles.toggleTrack} />
          </label>
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
