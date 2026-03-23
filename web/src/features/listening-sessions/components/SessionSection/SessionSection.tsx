import { useLocation } from 'wouter';
import { Radio, Plus } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { useAuthStore } from '@shared/store';
import { useSessionStore } from '../../store/sessionStore';
import styles from './SessionSection.module.css';

interface SessionSectionProps {
  onCreateSession: () => void;
  onJoinSession: () => void;
}

export function SessionSection({ onCreateSession, onJoinSession }: SessionSectionProps) {
  const activeSession = useSessionStore((s) => s.activeSession);
  const [, setLocation] = useLocation();
  const avatarTimestamp = useAuthStore((s) => s.avatarTimestamp);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Radio size={20} />
          Sesiones en grupo
        </h2>
      </div>

      {activeSession ? (
        <button className={styles.activeCard} onClick={() => setLocation(`/session/${activeSession.id}`)} type="button">
          <span className={styles.activeDot} />
          <div className={styles.activeInfo}>
            <span className={styles.activeName}>{activeSession.name}</span>
            <span className={styles.activeMeta}>
              {(activeSession.participants ?? []).length} participante{(activeSession.participants ?? []).length !== 1 ? 's' : ''} · En directo
            </span>
          </div>
          <div className={styles.activeAvatars}>
            {(activeSession.participants ?? []).slice(0, 3).map((p, i) => (
              <img key={p.id} src={getUserAvatarUrl(p.userId, p.hasAvatar, avatarTimestamp)} alt={p.username} className={styles.activeAvatar} style={{ zIndex: 3 - i }} onError={handleAvatarError} />
            ))}
          </div>
        </button>
      ) : (
        <div className={styles.emptyActions}>
          <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={onCreateSession}>
            Crear sesion
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Radio size={16} />} onClick={onJoinSession}>
            Unirse con codigo
          </Button>
        </div>
      )}
    </section>
  );
}
