import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Search, User, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useAuth, useTheme } from '@shared/hooks';
import { MetadataNotifications } from './MetadataNotifications';
import styles from './Header.module.css';

interface HeaderProps {
  /** Enable admin mode: hides search, shows back button */
  adminMode?: boolean;
}

/**
 * Header Component
 * Sticky header with search bar, theme toggle, and user menu
 * Features: Transparent header that becomes glassmorphic on scroll
 * Supports admin mode with back navigation instead of search
 */
export function Header({ adminMode = false }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll to apply glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles['header--scrolled'] : ''}`}>
      {/* Back button (admin mode only) */}
      {adminMode && (
        <button className={styles.header__backButton} onClick={handleBackNavigation}>
          <ArrowLeft size={20} />
          <span>Volver</span>
        </button>
      )}

      {/* Search + Theme toggle + User menu */}
      <div className={styles.header__rightSection}>
        {/* Search bar (hidden in admin mode) */}
        {!adminMode && (
          <form className={styles.header__searchForm} onSubmit={handleSearchSubmit}>
            <div className={styles.header__searchWrapper}>
              <Search size={20} className={styles.header__searchIcon} />
              <input
                type="text"
                placeholder="Busca Artistas, Canciones, Álbumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.header__searchInput}
              />
            </div>
          </form>
        )}

        {/* Theme toggle */}
        <button
          className={styles.header__themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Metadata notifications (solo admin) */}
        <MetadataNotifications token={token} isAdmin={user?.isAdmin || false} />

        {/* User menu */}
        <div className={styles.header__userMenu}>
          <button
            className={styles.header__userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <User size={20} />
          </button>

          {showUserMenu && (
            <div className={styles.header__userDropdown}>
              <div className={styles.header__userInfo}>
                <p className={styles.header__userName}>{user?.username || 'User'}</p>
                <p className={styles.header__userRole}>{user?.isAdmin ? 'admin' : 'user'}</p>
              </div>
              <div className={styles.header__userDivider} />
              <button className={styles.header__userMenuItem} onClick={() => setLocation('/profile')}>
                Profile
              </button>
              <button className={styles.header__userMenuItem} onClick={() => setLocation('/settings')}>
                Settings
              </button>
              <div className={styles.header__userDivider} />
              <button
                className={`${styles.header__userMenuItem} ${styles['header__userMenuItem--danger']}`}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
