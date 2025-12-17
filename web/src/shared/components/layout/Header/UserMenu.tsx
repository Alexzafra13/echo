import { useLocation } from 'wouter';
import { Shield, Users } from 'lucide-react';
import { useClickOutside } from '@shared/hooks';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import styles from './Header.module.css';

interface UserMenuProps {
  /** User object with id, username, hasAvatar, isAdmin */
  user: {
    id?: string;
    username?: string;
    hasAvatar?: boolean;
    isAdmin?: boolean;
  } | null;
  /** Timestamp for avatar cache busting */
  avatarTimestamp?: number;
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback to set menu open state */
  onOpenChange: (isOpen: boolean) => void;
  /** Logout callback */
  onLogout: () => void;
}

/**
 * UserMenu Component
 * Dropdown menu for user profile, settings, and logout
 *
 * @example
 * ```tsx
 * <UserMenu
 *   user={user}
 *   isOpen={showUserMenu}
 *   onOpenChange={setShowUserMenu}
 *   onLogout={logout}
 * />
 * ```
 */
export function UserMenu({
  user,
  avatarTimestamp,
  isOpen,
  onOpenChange,
  onLogout,
}: UserMenuProps) {
  const [, setLocation] = useLocation();

  const { ref, isClosing, close } = useClickOutside<HTMLDivElement>(
    () => onOpenChange(false),
    { enabled: isOpen, animationDuration: 200 }
  );

  const handleToggle = () => {
    if (isOpen) {
      close();
    } else {
      onOpenChange(true);
    }
  };

  const handleNavigate = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Close menu and navigate
    onOpenChange(false);
    setLocation(path);
  };

  const handleLogout = () => {
    // Close menu immediately and logout
    // Don't use animation to avoid timing issues with auth state
    onOpenChange(false);
    onLogout();
  };

  const avatarUrl = getUserAvatarUrl(user?.id, user?.hasAvatar, avatarTimestamp);

  return (
    <div className={styles.header__userMenu} ref={ref}>
      <button
        className={styles.header__userButton}
        onClick={handleToggle}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <img
          src={avatarUrl}
          alt={user?.username || 'User'}
          className={styles.header__userAvatar}
          onError={handleAvatarError}
        />
      </button>

      {isOpen && (
        <div
          className={`${styles.header__userDropdown} ${isClosing ? styles['header__userDropdown--closing'] : ''}`}
          role="menu"
        >
          <button
            className={styles.header__userInfo}
            onClick={(e) => handleNavigate(e, `/user/${user?.id}`)}
            role="menuitem"
          >
            <img
              src={avatarUrl}
              alt={user?.username || 'User'}
              className={styles.header__userAvatarLarge}
              onError={handleAvatarError}
            />
            <div>
              <p className={styles.header__userName}>{user?.username || 'User'}</p>
              <p className={styles.header__userRole}>{user?.isAdmin ? 'admin' : 'user'}</p>
            </div>
          </button>

          <button
            className={styles.header__userMenuItem}
            onClick={(e) => handleNavigate(e, '/profile')}
            role="menuitem"
          >
            Profile
          </button>
          <button
            className={styles.header__userMenuItem}
            onClick={(e) => handleNavigate(e, '/settings')}
            role="menuitem"
          >
            Settings
          </button>
          <button
            className={styles.header__userMenuItem}
            onClick={(e) => handleNavigate(e, '/social')}
            role="menuitem"
          >
            <Users size={16} />
            Social
          </button>

          {user?.isAdmin && (
            <button
              className={styles.header__userMenuItem}
              onClick={(e) => handleNavigate(e, '/admin')}
              role="menuitem"
            >
              <Shield size={16} />
              Admin
            </button>
          )}

          <div className={styles.header__userDivider} />

          <button
            className={`${styles.header__userMenuItem} ${styles['header__userMenuItem--danger']}`}
            onClick={handleLogout}
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
