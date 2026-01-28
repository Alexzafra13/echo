import styles from './PublicProfilePage.module.css';

// =============================================================================
// Helper Functions
// =============================================================================

export const getUserInitials = (name?: string, username?: string): string => {
  const displayName = name || username || 'U';
  return displayName.slice(0, 2).toUpperCase();
};

// =============================================================================
// Component
// =============================================================================

interface AvatarProps {
  avatarUrl?: string;
  name?: string;
  username?: string;
}

export function Avatar({ avatarUrl, name, username }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
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
