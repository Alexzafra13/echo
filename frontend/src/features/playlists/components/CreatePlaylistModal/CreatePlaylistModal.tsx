import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/components/ui';
import styles from './CreatePlaylistModal.module.css';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * CreatePlaylistModal Component
 * Modal for creating a new playlist
 */
export function CreatePlaylistModal({ onClose, onSubmit, isLoading = false }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
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
      await onSubmit(name.trim());
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error al crear la playlist');
    }
  };

  return (
    <div className={styles.createPlaylistModal} onClick={onClose}>
      <div className={styles.createPlaylistModal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.createPlaylistModal__header}>
          <h2 className={styles.createPlaylistModal__title}>Nueva Playlist</h2>
          <button
            className={styles.createPlaylistModal__closeButton}
            onClick={onClose}
            aria-label="Cerrar"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.createPlaylistModal__form}>
          <div className={styles.createPlaylistModal__field}>
            <label htmlFor="playlist-name" className={styles.createPlaylistModal__label}>
              Nombre de la playlist
            </label>
            <input
              id="playlist-name"
              type="text"
              className={styles.createPlaylistModal__input}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Mi Playlist..."
              autoFocus
              disabled={isLoading}
            />
            {error && <p className={styles.createPlaylistModal__error}>{error}</p>}
          </div>

          {/* Actions */}
          <div className={styles.createPlaylistModal__actions}>
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
              {isLoading ? 'Creando...' : 'Crear Playlist'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
