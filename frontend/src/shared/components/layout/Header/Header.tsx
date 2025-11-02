import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight, Search, User } from 'lucide-react';
import { useAuth } from '@shared/hooks';
import styles from './Header.module.css';

/**
 * Header Component
 * Sticky header with navigation buttons, search bar, and user menu
 * Features: Transparent header that becomes glassmorphic on scroll
 */
export function Header() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
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
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      {/* Navigation buttons */}
      <div className={styles.navButtons}>
        <button
          className={styles.navButton}
          onClick={handleBack}
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className={styles.navButton}
          onClick={handleForward}
          aria-label="Go forward"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Right section: Search + User menu */}
      <div className={styles.rightSection}>
        {/* Search bar */}
        <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
          <div className={styles.searchWrapper}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Busca Artistas, Canciones, Álbumes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </form>

        {/* User menu */}
        <div className={styles.userMenu}>
          <button
            className={styles.userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <User size={20} />
          </button>

          {showUserMenu && (
            <div className={styles.userDropdown}>
              <div className={styles.userInfo}>
                <p className={styles.userName}>{user?.username || 'User'}</p>
                <p className={styles.userRole}>{user?.isAdmin ? 'admin' : 'user'}</p>
              </div>
              <div className={styles.userDivider} />
              <button className={styles.userMenuItem} onClick={() => setLocation('/profile')}>
                Profile
              </button>
              <button className={styles.userMenuItem} onClick={() => setLocation('/settings')}>
                Settings
              </button>
              <div className={styles.userDivider} />
              <button
                className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`}
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
