import { useState, useContext } from 'react';
import { Headphones, Music } from 'lucide-react';
import { Modal, Button, Input } from '@shared/components/ui';
import { PlayerContext } from '@features/player/context/PlayerContext';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { useCreateSession } from '../../hooks';
import { listeningSessionsService } from '../../services/listening-sessions.service';
import styles from './CreateSessionModal.module.css';

interface CreateSessionModalProps {
  onClose: () => void;
}

export function CreateSessionModal({ onClose }: CreateSessionModalProps) {
  const [name, setName] = useState('');
  const createSession = useCreateSession();
  const playerCtx = useContext(PlayerContext);

  const currentTrack = playerCtx?.currentTrack;
  const queue = playerCtx?.queue ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await createSession.mutateAsync({ name: name.trim() });

      // Añadir track actual y cola a la sesion
      if (currentTrack) {
        await listeningSessionsService.addToQueue(result.id, { trackId: currentTrack.id }).catch(() => {});
      }
      // Añadir el resto de la cola (tracks despues del actual)
      const currentIndex = playerCtx?.currentIndex ?? 0;
      const remaining = queue.slice(currentIndex + 1);
      for (const track of remaining.slice(0, 20)) {
        await listeningSessionsService.addToQueue(result.id, { trackId: track.id }).catch(() => {});
      }

      onClose();
    } catch {
      // Error gestionado por TanStack Query
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Nueva Sesion"
      icon={Headphones}
      subtitle="Escucha musica con amigos en tiempo real"
      width="420px"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label="Nombre de la sesion"
          placeholder="Ej: Viernes de musica"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Mostrar lo que se esta reproduciendo */}
        {currentTrack && (
          <div className={styles.nowPlaying}>
            <Music size={14} className={styles.nowPlayingIcon} />
            <img
              src={getCoverUrl(currentTrack.albumId ? `/api/albums/${currentTrack.albumId}/cover` : undefined)}
              alt=""
              className={styles.nowPlayingCover}
              onError={(e) => { (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp'; }}
            />
            <div className={styles.nowPlayingInfo}>
              <span className={styles.nowPlayingTitle}>{currentTrack.title}</span>
              <span className={styles.nowPlayingArtist}>{currentTrack.artistName}</span>
            </div>
          </div>
        )}

        {queue.length > 1 && (
          <p className={styles.hint}>
            Se anadiran {Math.min(queue.length - 1, 20)} canciones de tu cola actual
          </p>
        )}

        {createSession.isError && (
          <p className={styles.error}>
            {(createSession.error as { response?: { status: number } })?.response?.status === 409
              ? 'Ya tienes una sesion activa. Terminala antes de crear otra.'
              : 'Error al crear la sesion. Intentalo de nuevo.'}
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!name.trim() || createSession.isPending}
          >
            {createSession.isPending ? 'Creando...' : 'Crear sesion'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
