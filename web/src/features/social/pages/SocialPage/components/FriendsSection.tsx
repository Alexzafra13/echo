import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Headphones } from 'lucide-react';
import { UserAvatar } from '@shared/components/ui';
import type { Friend, ListeningUser } from '../../../services/social.service';
import styles from './FriendsSection.module.css';

interface FriendsSectionProps {
  friends: Friend[];
  listeningUsers: ListeningUser[];
  onFriendClick: (userId: string) => void;
}

export const FriendsSection = memo(function FriendsSection({
  friends,
  listeningUsers,
  onFriendClick,
}: FriendsSectionProps) {
  const { t } = useTranslation();
  const listeningIds = useMemo(() => new Set(listeningUsers.map((u) => u.id)), [listeningUsers]);

  return (
    <section className={styles.sideSection}>
      <h2 className={styles.sideSection__title}>
        <span className={styles.sideSection__titleIcon}>
          <Users size={16} />
        </span>
        {t('social.friends')}
        <span className={styles.sideSection__count}>{friends.length}</span>
      </h2>
      {friends.length > 0 ? (
        <div className={styles.friendsList}>
          {friends.map((friend) => {
            const isListening = listeningIds.has(friend.id);
            const listeningData = isListening
              ? listeningUsers.find((u) => u.id === friend.id)
              : null;

            return (
              <div
                key={friend.id}
                className={`${styles.friendItem} ${isListening ? styles['friendItem--active'] : ''}`}
                onClick={() => onFriendClick(friend.id)}
              >
                <div className={styles.friendItem__avatarWrapper}>
                  <UserAvatar
                    userId={friend.id}
                    avatarUrl={friend.avatarUrl}
                    username={friend.username}
                    className={styles.friendItem__avatar}
                  />
                  {isListening && <span className={styles.friendItem__statusDot} />}
                </div>
                <div className={styles.friendItem__info}>
                  <span className={styles.friendItem__name}>{friend.name || friend.username}</span>
                  {isListening && listeningData?.currentTrack ? (
                    <span className={styles.friendItem__listening}>
                      <Headphones size={11} />
                      {listeningData.currentTrack.title}
                    </span>
                  ) : (
                    <span className={styles.friendItem__username}>@{friend.username}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.sideSection__empty}>
          <Users size={28} />
          <p>{t('social.noFriendsYet')}</p>
          <span>{t('social.noFriendsHint')}</span>
        </div>
      )}
    </section>
  );
});
