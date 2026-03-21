import { useMemo } from 'react';
import styles from './PublicProfilePage.module.css';
import { getUserInitials } from '@shared/utils/avatar.utils';

interface AvatarProps {
  avatarUrl?: string;
  name?: string;
  username?: string;
}

export function Avatar({ avatarUrl, name, username }: AvatarProps) {
  // Cache buster stable during component lifecycle, refreshes on mount
  const cacheBuster = useMemo(() => Date.now(), []);

  if (avatarUrl) {
    // Add cache buster to force refresh when avatar changes
    const urlWithCacheBuster = avatarUrl.includes('?')
      ? `${avatarUrl}&_t=${cacheBuster}`
      : `${avatarUrl}?_t=${cacheBuster}`;

    return (
      <img
        src={urlWithCacheBuster}
        alt={name || username}
        className={styles.publicProfilePage__avatar}
      />
    );
  }

  return (
    <div className={styles.publicProfilePage__avatarPlaceholder}>
      {getUserInitials(name, username)}
    </div>
  );
}
