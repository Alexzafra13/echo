import { Users, UserPlus } from 'lucide-react';
import { Button } from '@shared/components/ui';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import type { Friend } from '../../../services/social.service';
import styles from '../SocialPage.module.css';

interface FriendsSectionProps {
  friends: Friend[];
  onFriendClick: (userId: string) => void;
  onShowSearch: () => void;
}

export function FriendsSection({ friends, onFriendClick, onShowSearch }: FriendsSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.section__title}>
        <div className={styles.section__titleIcon}>
          <Users size={18} />
        </div>
        Mis amigos
        <span className={styles.section__count}>
          {friends.length}
        </span>
      </h2>
      {friends.length > 0 ? (
        <div className={styles.friendsList}>
          {friends.map((friend) => (
            <div
              key={friend.id}
              className={styles.friendCard}
              onClick={() => onFriendClick(friend.id)}
            >
              <img
                src={friend.avatarUrl || getUserAvatarUrl(friend.id, false)}
                alt={friend.username}
                className={styles.friendCard__avatar}
                onError={handleAvatarError}
              />
              <div className={styles.friendCard__info}>
                <span className={styles.friendCard__name}>
                  {friend.name || friend.username}
                </span>
                <span className={styles.friendCard__username}>
                  @{friend.username}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.section__empty}>
          <Users size={32} />
          <p>Aún no tienes amigos</p>
          <Button
            variant="secondary"
            onClick={onShowSearch}
          >
            <UserPlus size={16} />
            Buscar usuarios
          </Button>
        </div>
      )}
    </section>
  );
}
