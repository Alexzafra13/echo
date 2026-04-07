import { useLocation } from 'wouter';
import { UserAvatar } from '@shared/components/ui';
import { useSessionStore } from '../../store/sessionStore';
import styles from './SessionIndicator.module.css';

/**
 * Indicador en el player bar: avatares apilados de los participantes.
 * Click para ir a la pagina Social donde esta la sesion.
 */
export function SessionIndicator() {
  const activeSession = useSessionStore((s) => s.activeSession);
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
        {participants.slice(0, 3).map((p) => (
          <UserAvatar
            key={p.id}
            userId={p.userId}
            hasAvatar={p.hasAvatar}
            username={p.username}
            className={styles.avatar}
          />
        ))}
        {participants.length > 3 && (
          <span className={styles.avatarCount}>+{participants.length - 3}</span>
        )}
      </div>
    </button>
  );
}
