import { useMemo } from 'react';
import styles from './PublicProfilePage.module.css';
import { handleAvatarError, getAvatarColor } from '@shared/utils/avatar.utils';

interface AvatarProps {
  avatarUrl?: string;
  name?: string;
  username?: string;
  userId?: string;
}

const DEFAULT_AVATAR = '/images/avatar-default.svg';

export function Avatar({ avatarUrl, name, username, userId }: AvatarProps) {
  // Cache buster stable during component lifecycle, refreshes on mount
  const cacheBuster = useMemo(() => Date.now(), []);

  const src = avatarUrl
    ? avatarUrl.includes('?')
      ? `${avatarUrl}&_t=${cacheBuster}`
      : `${avatarUrl}?_t=${cacheBuster}`
    : DEFAULT_AVATAR;

  const isDefault = !avatarUrl;

  return (
    <img
      src={src}
      alt={name || username}
      className={`${styles.publicProfilePage__avatar}${isDefault ? ` ${styles['publicProfilePage__avatar--default']}` : ''}`}
      style={isDefault ? { backgroundColor: getAvatarColor(userId) } : undefined}
      onError={handleAvatarError}
    />
  );
}
