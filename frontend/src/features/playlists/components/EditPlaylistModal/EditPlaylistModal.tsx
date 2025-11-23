import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { Playlist, UpdatePlaylistDto } from '../../types';
import styles from './EditPlaylistModal.module.css';

interface EditPlaylistModalProps {
  playlist: Playlist;
  onClose: () => void;
  onSubmit: (id: string, data: UpdatePlaylistDto) => Promise<void>;
  isLoading?: boolean;
}

/**
 * EditPlaylistModal Component
 * Modal for editing an existing playlist
 */
export function EditPlaylistModal({ playlist, onClose, onSubmit, isLoading = false }: EditPlaylistModalProps) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');
  const [isPublic, setIsPublic] = useState(playlist.public);
  const [error, setError] = useState('');

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al actualizar la playlist');
    }
  };

  return (
    <div className={styles.editPlaylistModal} onClick={onClose}>
      <div className={styles.editPlaylistModal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.editPlaylistModal__header}>
          <h2 className={styles.editPlaylistModal__title}>Editar Playlist</h2>
          <button
            className={styles.editPlaylistModal__closeButton}
            onClick={onClose}
            aria-label="Cerrar"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.editPlaylistModal__form}>
          <div className={styles.editPlaylistModal__field}>
            <label htmlFor="playlist-name" className={styles.editPlaylistModal__label}>
              Nombre de la playlist
            </label>
            <input
              id="playlist-name"
              type="text"
              className={styles.editPlaylistModal__input}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Mi Playlist..."
              autoFocus
              disabled={isLoading}
            />
            {error && <p className={styles.editPlaylistModal__error}>{error}</p>}
          </div>

          <div className={styles.editPlaylistModal__field}>
            <label htmlFor="playlist-description" className={styles.editPlaylistModal__label}>
              Descripción (opcional)
            </label>
            <textarea
              id="playlist-description"
              className={styles.editPlaylistModal__textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de tu playlist..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className={styles.editPlaylistModal__checkboxField}>
            <label className={styles.editPlaylistModal__checkboxLabel}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isLoading}
                className={styles.editPlaylistModal__checkbox}
              />
              <span>Playlist pública</span>
            </label>
          </div>

          {/* Actions */}
          <div className={styles.editPlaylistModal__actions}>
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
      </div>
    </div>
  );
}
