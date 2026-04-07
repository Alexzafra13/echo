import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Shield, Users, User, Settings } from 'lucide-react';
import { useClickOutside } from '@shared/hooks';
import { UserAvatar } from '@shared/components/ui';
import styles from './Header.module.css';

interface UserMenuProps {
  user: {
    id?: string;
    username?: string;
    hasAvatar?: boolean;
    isAdmin?: boolean;
  } | null;
  avatarTimestamp?: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLogout: () => void;
}

export function UserMenu({
  user,
  avatarTimestamp: _avatarTimestamp,
  isOpen,
  onOpenChange,
  onLogout,
}: UserMenuProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const { ref, isClosing, close } = useClickOutside<HTMLDivElement>(() => onOpenChange(false), {
    enabled: isOpen,
    animationDuration: 200,
    scrollCloseDelay: 0,
  });

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
    onOpenChange(false);
    setLocation(path);
  };

  const handleLogout = () => {
    onOpenChange(false);
    onLogout();
  };

  return (
    <div className={styles.header__userMenu} ref={ref}>
      <button
        className={styles.header__userButton}
        onClick={handleToggle}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UserAvatar
          userId={user?.id}
          hasAvatar={user?.hasAvatar}
          username={user?.username || 'User'}
          className={styles.header__userAvatar}
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
            <UserAvatar
              userId={user?.id}
              hasAvatar={user?.hasAvatar}
              username={user?.username || 'User'}
              className={styles.header__userAvatarLarge}
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
            <User size={16} />
            {t('nav.profile')}
          </button>
          <button
            className={styles.header__userMenuItem}
            onClick={(e) => handleNavigate(e, '/settings')}
            role="menuitem"
          >
            <Settings size={16} />
            {t('nav.settings')}
          </button>
          <button
            className={`${styles.header__userMenuItem} ${styles['header__userMenuItem--mobileOnly']}`}
            onClick={(e) => handleNavigate(e, '/social')}
            role="menuitem"
          >
            <Users size={16} />
            {t('nav.social')}
          </button>

          {user?.isAdmin && (
            <button
              className={`${styles.header__userMenuItem} ${styles['header__userMenuItem--mobileOnly']}`}
              onClick={(e) => handleNavigate(e, '/admin')}
              role="menuitem"
            >
              <Shield size={16} />
              {t('nav.admin')}
            </button>
          )}

          <div className={styles.header__userDivider} />

          <button
            className={`${styles.header__userMenuItem} ${styles['header__userMenuItem--danger']}`}
            onClick={handleLogout}
            role="menuitem"
          >
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
