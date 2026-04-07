import { useTranslation } from 'react-i18next';
import { Crown, Check, UserPlus } from 'lucide-react';
import { UserAvatar } from '@shared/components/ui';
import styles from '../SessionPage.module.css';

interface Participant {
  id: string;
  userId: string;
  username: string;
  name?: string;
  hasAvatar?: boolean;
  role: string;
}

interface SessionFriend {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

interface SessionParticipantsProps {
  participants: Participant[];
  isHost: boolean;
  availableFriends: SessionFriend[];
  invitedIds: Set<string>;
  avatarTimestamp?: number;
  onInviteFriend: (friendId: string) => void;
}

export function SessionParticipants({
  participants,
  isHost,
  availableFriends,
  invitedIds,
  onInviteFriend,
}: SessionParticipantsProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{t('sessions.participants')}</h2>
      </div>
      <div className={styles.participantsGrid}>
        {participants.map((p) => (
          <div key={p.id} className={styles.participant}>
            <UserAvatar
              userId={p.userId}
              hasAvatar={p.hasAvatar}
              username={p.username}
              className={styles.participantAvatar}
            />
            <span className={styles.participantName}>{p.name || p.username}</span>
            {p.role === 'host' && (
              <span className={styles.hostBadge}>
                <Crown size={10} /> {t('sessions.host')}
              </span>
            )}
          </div>
        ))}
        {isHost &&
          availableFriends.slice(0, 4).map((f) => (
            <div key={f.id} className={`${styles.participant} ${styles['participant--invite']}`}>
              <UserAvatar
                userId={f.id}
                avatarUrl={f.avatarUrl}
                username={f.username}
                className={styles.participantAvatar}
              />
              <span className={styles.participantName}>{f.name || f.username}</span>
              <button
                className={`${styles.inviteBtn} ${invitedIds.has(f.id) ? styles['inviteBtn--done'] : ''}`}
                onClick={() => onInviteFriend(f.id)}
                disabled={invitedIds.has(f.id)}
                type="button"
              >
                {invitedIds.has(f.id) ? (
                  <>
                    <Check size={12} /> {t('sessions.sent')}
                  </>
                ) : (
                  <>
                    <UserPlus size={12} /> {t('sessions.invite')}
                  </>
                )}
              </button>
            </div>
          ))}
      </div>
    </section>
  );
}
