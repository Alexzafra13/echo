import { useLocation } from 'wouter';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { useAuthStore } from '@shared/store';
import { useSessionStore } from '../../store/sessionStore';
import styles from './SessionIndicator.module.css';

/**
 * Indicador en el player bar: avatares apilados de los participantes.
 * Click para ir a la pagina Social donde esta la sesion.
 */
export function SessionIndicator() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const avatarTimestamp = useAuthStore((s) => s.avatarTimestamp);
  const [, setLocation] = useLocation();

  if (!activeSession) return null;

  const participants = activeSession.participants ?? [];

  return (
    <button
      className={styles.indicator}
      onClick={() => setLocation(`/session/${activeSession.id}`)}
      type="button"
      title={`Sesion: ${activeSession.name}`}
    >
      <span className={styles.dot} />
      <div className={styles.avatars}>
        {participants.slice(0, 3).map((p, i) => (
          <img
            key={p.id}
            src={getUserAvatarUrl(p.userId, p.hasAvatar, avatarTimestamp)}
            alt={p.username}
            className={styles.avatar}
            style={{ zIndex: 3 - i }}
            onError={handleAvatarError}
          />
        ))}
        {participants.length > 3 && (
          <span className={styles.avatarCount}>+{participants.length - 3}</span>
        )}
      </div>
    </button>
  );
}
