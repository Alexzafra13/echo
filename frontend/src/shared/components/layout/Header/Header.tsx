import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Search, User, Sun, Moon } from 'lucide-react';
import { useAuth, useTheme } from '@shared/hooks';
import styles from './Header.module.css';

/**
 * Header Component
 * Sticky header with navigation buttons, search bar, theme toggle, and user menu
 * Features: Transparent header that becomes glassmorphic on scroll
 */
export function Header() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
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

  const handleBack = () => {
    window.history.back();
  };

  const handleForward = () => {
    window.history.forward();
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles['header--scrolled'] : ''}`}>
      {/* Navigation buttons */}
      <div className={styles.header__navButtons}>
        <button
          className={styles.header__navButton}
          onClick={handleBack}
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className={styles.header__navButton}
          onClick={handleForward}
          aria-label="Go forward"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Right section: Search + Theme toggle + User menu */}
      <div className={styles.header__rightSection}>
        {/* Search bar */}
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

        {/* Theme toggle */}
        <button
          className={styles.header__themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

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
