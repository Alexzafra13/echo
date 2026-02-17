import { useState } from 'react';
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
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');
  const [isPublic, setIsPublic] = useState(playlist.public ?? false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('El nombre de la playlist es obligatorio');
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
      setError(getApiErrorMessage(error, 'Error al actualizar la playlist'));
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Editar Playlist">
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          id="playlist-name"
          label="Nombre de la playlist"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="Mi Playlist..."
          autoFocus
          disabled={isLoading}
          error={error}
        />

        <div className={styles.field}>
          <label htmlFor="playlist-description" className={styles.label}>
            Descripción (opcional)
          </label>
          <textarea
            id="playlist-description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción de tu playlist..."
            rows={3}
            disabled={isLoading}
          />
        </div>

        <div className={styles.checkboxField}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isLoading}
              className={styles.checkbox}
            />
            <div className={styles.checkboxContent}>
              <span>Playlist pública</span>
              <span className={styles.checkboxHint}>
                {isPublic
                  ? 'Visible en tu perfil público'
                  : 'Solo visible para ti'}
              </span>
            </div>
          </label>
        </div>

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
            type="submit"
            variant="primary"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
