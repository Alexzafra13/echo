import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Headphones, Music, Radio } from 'lucide-react';
import { Modal, Button, Input } from '@shared/components/ui';
import { usePlayback, useQueue } from '@features/player';
import { getCoverUrl } from '@shared/utils/cover.utils';
import { useCreateSession } from '../../hooks';
import { listeningSessionsService } from '../../services/listening-sessions.service';
import type { SessionMode } from '../../types';
import styles from './CreateSessionModal.module.css';

interface CreateSessionModalProps {
  onClose: () => void;
}

export function CreateSessionModal({ onClose }: CreateSessionModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<SessionMode>('sync');
  const createSession = useCreateSession();
  const { currentTrack } = usePlayback();
  const { queue, currentIndex } = useQueue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await createSession.mutateAsync({ name: name.trim(), mode });

      // Añadir track actual y cola a la sesion
      if (currentTrack) {
        await listeningSessionsService
          .addToQueue(result.id, { trackId: currentTrack.id })
          .catch(() => {});
      }
      // Añadir el resto de la cola (tracks despues del actual)
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
      title={t('sessions.createTitle')}
      icon={Headphones}
      subtitle={t('sessions.createSubtitle')}
      width="420px"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          label={t('sessions.nameLabel')}
          placeholder={t('sessions.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Selector de modo */}
        <div className={styles.modeSelector}>
          <button
            type="button"
            className={`${styles.modeCard} ${mode === 'sync' ? styles['modeCard--active'] : ''}`}
            onClick={() => setMode('sync')}
          >
            <Headphones size={22} />
            <span className={styles.modeCardTitle}>{t('sessions.modeListen')}</span>
            <span className={styles.modeCardDesc}>{t('sessions.modeListenDesc')}</span>
          </button>
          <button
            type="button"
            className={`${styles.modeCard} ${mode === 'jukebox' ? styles['modeCard--active'] : ''}`}
            onClick={() => setMode('jukebox')}
          >
            <Radio size={22} />
            <span className={styles.modeCardTitle}>{t('sessions.modeJukebox')}</span>
            <span className={styles.modeCardDesc}>{t('sessions.modeJukeboxDesc')}</span>
          </button>
        </div>

        {/* Mostrar lo que se esta reproduciendo */}
        {currentTrack && (
          <div className={styles.nowPlaying}>
            <Music size={14} className={styles.nowPlayingIcon} />
            <img
              src={getCoverUrl(
                currentTrack.albumId ? `/api/albums/${currentTrack.albumId}/cover` : undefined
              )}
              alt=""
              className={styles.nowPlayingCover}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/radio/radio-cover-dark.webp';
              }}
            />
            <div className={styles.nowPlayingInfo}>
              <span className={styles.nowPlayingTitle}>{currentTrack.title}</span>
              <span className={styles.nowPlayingArtist}>{currentTrack.artistName}</span>
            </div>
          </div>
        )}

        {queue.length > 1 && (
          <p className={styles.hint}>
            {t('sessions.queueHint', { count: Math.min(queue.length - 1, 20) })}
          </p>
        )}

        {createSession.isError && (
          <p className={styles.error}>
            {(createSession.error as { response?: { status: number } })?.response?.status === 409
              ? t('sessions.activeSessionError')
              : t('sessions.createError')}
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!name.trim() || createSession.isPending}
          >
            {createSession.isPending ? t('common.creating') : t('sessions.createButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
