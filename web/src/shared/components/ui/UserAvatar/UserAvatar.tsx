import {
  handleAvatarError,
  getUserAvatarUrl,
  getAvatarColor,
  getUserInitials,
} from '@shared/utils/avatar.utils';
import styles from './UserAvatar.module.css';

interface UserAvatarProps {
  userId?: string;
  avatarUrl?: string | null;
  hasAvatar?: boolean;
  username?: string;
  size?: number;
  className?: string;
  /** When true, shows user initials instead of the default silhouette icon */
  showInitials?: boolean;
}

export function UserAvatar({
  userId,
  avatarUrl,
  hasAvatar,
  username,
  size,
  className,
  showInitials = false,
}: UserAvatarProps) {
  const isDefault = !avatarUrl && hasAvatar !== true;

  if (isDefault && showInitials) {
    return (
      <div
        className={`${styles.userAvatar} ${styles['userAvatar--initials']}${className ? ` ${className}` : ''}`}
        style={{
          ...(size ? { width: size, height: size, fontSize: Math.round(size * 0.38) } : {}),
          backgroundColor: getAvatarColor(userId),
        }}
        role="img"
        aria-label={username}
      >
        <span className={styles.userAvatar__initials}>{getUserInitials(undefined, username)}</span>
      </div>
    );
  }

  const src = avatarUrl || getUserAvatarUrl(userId, hasAvatar);

  return (
    <img
      src={src}
      alt={username}
      className={`${styles.userAvatar}${isDefault ? ` ${styles['userAvatar--default']}` : ''}${className ? ` ${className}` : ''}`}
      style={{
        ...(size ? { width: size, height: size } : {}),
        ...(isDefault ? { backgroundColor: getAvatarColor(userId) } : {}),
      }}
      loading="lazy"
      decoding="async"
      onError={handleAvatarError}
    />
  );
}
