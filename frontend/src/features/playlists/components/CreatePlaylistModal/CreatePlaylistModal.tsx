import { useState } from 'react';
import { Button, Modal } from '@shared/components/ui';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('El nombre de la playlist es obligatorio');
      return;
    }

    try {
      await onSubmit(name.trim());
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as any).response?.data?.message
        : 'Error al crear la playlist';
      setError(errorMessage || 'Error al crear la playlist');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Nueva Playlist">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="playlist-name" className={styles.label}>
            Nombre de la playlist
          </label>
          <input
            id="playlist-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Mi Playlist..."
            autoFocus
            disabled={isLoading}
          />
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Actions */}
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
            {isLoading ? 'Creando...' : 'Crear Playlist'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
