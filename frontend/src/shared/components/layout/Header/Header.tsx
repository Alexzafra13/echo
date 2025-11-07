import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Search, User, Sun, Moon } from 'lucide-react';
import { useAuth, useTheme } from '@shared/hooks';
import { BackButton } from '@shared/components/ui';
import { MetadataNotifications } from './MetadataNotifications';
import { SearchResults } from './SearchResults';
import styles from './Header.module.css';

interface HeaderProps {
  /** Enable admin mode: hides search */
  adminMode?: boolean;
  /** Show back button */
  showBackButton?: boolean;
}

/**
 * Header Component
 * Sticky header with search bar, theme toggle, and user menu
 * Features: Transparent header that becomes glassmorphic on scroll
 * Supports admin mode with back navigation instead of search
 * Live search results with debouncing (300ms)
 */
export function Header({ adminMode = false, showBackButton = false }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { user, logout, token} = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Detect scroll to apply glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to dedicated search page on Enter press
    if (searchQuery.trim().length >= 2) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowResults(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowResults(true);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setSearchQuery('');
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles['header--scrolled'] : ''}`}>
      {/* Back button */}
      {showBackButton && (
        <BackButton className={styles.header__backButton} />
      )}

      {/* Search + Theme toggle + User menu */}
      <div className={styles.header__rightSection}>
        {/* Search bar (hidden in admin mode) */}
        {!adminMode && (
          <form className={styles.header__searchForm} onSubmit={handleSearchSubmit} ref={searchRef}>
            <div className={styles.header__searchWrapper}>
              <Search size={20} className={styles.header__searchIcon} />
              <input
                type="text"
                placeholder="Busca Artistas, Canciones, Álbumes..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                className={styles.header__searchInput}
                autoComplete="off"
              />
            </div>

            {/* Search Results Dropdown */}
            {showResults && debouncedQuery.length > 0 && (
              <SearchResults query={debouncedQuery} onClose={handleCloseResults} />
            )}
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
