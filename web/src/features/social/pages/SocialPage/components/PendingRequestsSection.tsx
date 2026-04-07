import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Send, Check, X } from 'lucide-react';
import { Button, UserAvatar } from '@shared/components/ui';
import type { Friend } from '../../../services/social.service';
import styles from './PendingRequestsSection.module.css';

interface PendingRequestsSectionProps {
  received: Friend[];
  sent: Friend[];
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
  isAccepting: boolean;
  isRemoving: boolean;
}

export const PendingRequestsSection = memo(function PendingRequestsSection({
  received,
  sent,
  onAccept,
  onReject,
  isAccepting,
  isRemoving,
}: PendingRequestsSectionProps) {
  const { t } = useTranslation();
  if (received.length === 0 && sent.length === 0) return null;

  return (
    <>
      {/* Received Requests */}
      {received.length > 0 && (
        <section className={`${styles.sideSection} ${styles['sideSection--urgent']}`}>
          <h2 className={styles.sideSection__title}>
            <span
              className={`${styles.sideSection__titleIcon} ${styles['sideSection__titleIcon--pending']}`}
            >
              <Clock size={16} />
            </span>
            {t('social.pendingRequests')}
            <span className={styles.sideSection__badge}>{received.length}</span>
          </h2>
          <div className={styles.requestsList}>
            {received.map((request) => (
              <div key={request.friendshipId} className={styles.requestCard}>
                <UserAvatar
                  userId={request.id}
                  avatarUrl={request.avatarUrl}
                  username={request.username}
                  className={styles.requestCard__avatar}
                />
                <div className={styles.requestCard__info}>
                  <span className={styles.requestCard__name}>
                    {request.name || request.username}
                  </span>
                  <span className={styles.requestCard__text}>{t('social.wantsToBeFriend')}</span>
                </div>
                <div className={styles.requestCard__actions}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onAccept(request.friendshipId)}
                    disabled={isAccepting}
                  >
                    <Check size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(request.friendshipId)}
                    disabled={isRemoving}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sent Requests */}
      {sent.length > 0 && (
        <section className={styles.sideSection}>
          <h2 className={styles.sideSection__title}>
            <span className={styles.sideSection__titleIcon}>
              <Send size={16} />
            </span>
            {t('social.sentRequests')}
            <span className={styles.sideSection__countSmall}>{sent.length}</span>
          </h2>
          <div className={styles.requestsList}>
            {sent.map((request) => (
              <div key={request.friendshipId} className={styles.requestCard}>
                <UserAvatar
                  userId={request.id}
                  avatarUrl={request.avatarUrl}
                  username={request.username}
                  className={styles.requestCard__avatar}
                />
                <div className={styles.requestCard__info}>
                  <span className={styles.requestCard__name}>
                    {request.name || request.username}
                  </span>
                  <span className={styles.requestCard__textSent}>
                    {t('social.waitingForResponse')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReject(request.friendshipId)}
                  disabled={isRemoving}
                  title={t('social.cancelRequest')}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
});
