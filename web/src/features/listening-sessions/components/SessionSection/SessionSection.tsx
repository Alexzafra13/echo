import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Radio, Plus } from 'lucide-react';
import { UserAvatar } from '@shared/components/ui';
import { useSessionStore } from '../../store/sessionStore';
import styles from './SessionSection.module.css';

interface SessionSectionProps {
  onCreateSession: () => void;
  onJoinSession: () => void;
}

export function SessionSection({ onCreateSession, onJoinSession }: SessionSectionProps) {
  const { t } = useTranslation();
  const activeSession = useSessionStore((s) => s.activeSession);
  const [, setLocation] = useLocation();
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Radio size={20} />
          {t('sessions.groupSessions')}
        </h2>
      </div>

      {activeSession ? (
        <button
          className={styles.activeCard}
          onClick={() => setLocation(`/session/${activeSession.id}`)}
          type="button"
        >
          <span className={styles.activeDot} />
          <div className={styles.activeInfo}>
            <span className={styles.activeName}>{activeSession.name}</span>
            <span className={styles.activeMeta}>
              {t('sessions.participantCount', { count: (activeSession.participants ?? []).length })}{' '}
              · {t('sessions.live')}
            </span>
          </div>
          <div className={styles.activeAvatars}>
            {(activeSession.participants ?? []).slice(0, 3).map((p) => (
              <UserAvatar
                key={p.id}
                userId={p.userId}
                hasAvatar={p.hasAvatar}
                username={p.username}
                className={styles.activeAvatar}
              />
            ))}
          </div>
        </button>
      ) : (
        <div className={styles.emptyActions}>
          <button className={styles.createBtn} onClick={onCreateSession}>
            <Plus size={15} />
            {t('sessions.createButton')}
          </button>
          <button className={styles.joinBtn} onClick={onJoinSession}>
            <Radio size={15} />
            {t('sessions.joinWithCode')}
          </button>
        </div>
      )}
    </section>
  );
}
