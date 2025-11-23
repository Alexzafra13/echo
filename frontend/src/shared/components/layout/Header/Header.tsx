import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Search, Sun, Moon } from 'lucide-react';
import { useAuth, useTheme } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { BackButton } from '@shared/components/ui';
import { SystemHealthIndicator } from '@shared/components/SystemHealthIndicator';
import { MetadataNotifications } from './MetadataNotifications';
import { SearchPanel } from './SearchPanel';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import styles from './Header.module.css';

interface HeaderProps {
  /** Enable admin mode: hides search */
  adminMode?: boolean;
  /** Show back button */
  showBackButton?: boolean;
  /** Always show glassmorphism effect (for pages with hero behind header) */
  alwaysGlass?: boolean;
  /** Custom search component to replace default search */
  customSearch?: React.ReactNode;
  /** Additional custom content to show in header (e.g., country selector) */
  customContent?: React.ReactNode;
  /** Disable search (hides both default and custom search) */
  disableSearch?: boolean;
}

/**
 * Header Component
 * Sticky header with search bar, theme toggle, and user menu
 * Features: Transparent header that becomes glassmorphic on scroll
 * Supports admin mode with back navigation instead of search
 * Live search results with debouncing (300ms)
 */
export function Header({ adminMode = false, showBackButton = false, alwaysGlass = false, customSearch, customContent, disableSearch = false }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const accessToken = useAuthStore((state) => state.accessToken);
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(alwaysGlass);
  const searchRef = useRef<HTMLFormElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Detect scroll to apply glassmorphism effect
  // The scroll happens in the content container (sibling element), not in window
  useEffect(() => {
    // Skip scroll detection if alwaysGlass is enabled
    if (alwaysGlass) return;

    // Find the scrollable content container
    const findScrollContainer = () => {
      if (!headerRef.current) return null;

      // Strategy 1: Try next sibling (most common case)
      let scrollableElement = headerRef.current.nextElementSibling as HTMLElement | null;

      if (scrollableElement) {
        const styles = window.getComputedStyle(scrollableElement);
        const hasScroll = styles.overflowY === 'auto' || styles.overflowY === 'scroll';

        if (hasScroll) {
          return scrollableElement;
        }
      }

      // Strategy 2: Find any child with overflow-y: auto in parent
      const parent = headerRef.current.parentElement;
      if (parent) {
        const children = Array.from(parent.children) as HTMLElement[];
        scrollableElement = children.find((child) => {
          if (child === headerRef.current) return false;
          const styles = window.getComputedStyle(child);
          return styles.overflowY === 'auto' || styles.overflowY === 'scroll';
        }) || null;

        if (scrollableElement) {
          return scrollableElement;
        }

        // Strategy 3: Check if parent itself is scrollable
        const parentStyles = window.getComputedStyle(parent);
        const parentHasScroll = parentStyles.overflowY === 'auto' || parentStyles.overflowY === 'scroll';

        if (parentHasScroll) {
          return parent;
        }
      }

      return null;
    };

    const scrollContainer = findScrollContainer();

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollTop = target.scrollTop;
      const shouldBeScrolled = scrollTop > 50;
      setIsScrolled(shouldBeScrolled);
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

      // Check initial scroll position
      if (scrollContainer.scrollTop > 50) {
        setIsScrolled(true);
      }

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }

    // Fallback to window scroll for pages that might use it
    const handleWindowScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [alwaysGlass]);

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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // On Enter key, navigate to search page (not dropdown item)
    if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
      e.preventDefault();
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowResults(false);
    }
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
    <header ref={headerRef} className={`${styles.header} ${isScrolled ? styles['header--scrolled'] : ''}`}>
      {/* Back button */}
      {showBackButton && (
        <BackButton className={styles.header__backButton} />
      )}

      {/* Left section - Search and custom content */}
      <div className={styles.header__leftSection}>
        {/* Custom search or default search bar (hidden in admin mode or when disableSearch is true) */}
        {!adminMode && !disableSearch && (
          customSearch ? (
            <div className={styles.header__customSearch}>
              {customSearch}
            </div>
          ) : (
            <form className={styles.header__searchForm} onSubmit={handleSearchSubmit} ref={searchRef}>
              <div className={styles.header__searchWrapper}>
                <Search size={20} className={styles.header__searchIcon} />
                <input
                  type="text"
                  placeholder="Busca Artistas, Canciones, Álbumes..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                  className={styles.header__searchInput}
                  autoComplete="off"
                />
              </div>

              {/* Search Results Dropdown */}
              {showResults && debouncedQuery.length > 0 && (
                <SearchPanel query={debouncedQuery} onClose={handleCloseResults} isOpen={true} />
              )}
            </form>
          )
        )}

        {/* Custom content (e.g., country selector) */}
        {customContent}
      </div>

      {/* Right section - Theme toggle, notifications, user menu */}
      <div className={styles.header__rightSection}>
        {/* Theme toggle */}
        <button
          className={styles.header__themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* System health indicator (solo admin) */}
        <SystemHealthIndicator />

        {/* Metadata notifications (solo admin) */}
        <MetadataNotifications token={accessToken} isAdmin={user?.isAdmin || false} />

        {/* User menu */}
        <div className={styles.header__userMenu} ref={userMenuRef}>
          <button
            className={styles.header__userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <img
              src={getUserAvatarUrl(user?.id, user?.hasAvatar, avatarTimestamp)}
              alt={user?.username || 'User'}
              className={styles.header__userAvatar}
              onError={handleAvatarError}
            />
          </button>

          {/* User dropdown - same approach as MetadataNotifications */}
          {showUserMenu && (
            <div className={styles.header__userDropdown}>
              <div className={styles.header__userInfo}>
                <img
                  src={getUserAvatarUrl(user?.id, user?.hasAvatar, avatarTimestamp)}
                  alt={user?.username || 'User'}
                  className={styles.header__userAvatarLarge}
                  onError={handleAvatarError}
                />
                <div>
                  <p className={styles.header__userName}>{user?.username || 'User'}</p>
                  <p className={styles.header__userRole}>{user?.isAdmin ? 'admin' : 'user'}</p>
                </div>
              </div>
              <div className={styles.header__userDivider} />
              <button className={styles.header__userMenuItem} onClick={() => { setLocation('/profile'); setShowUserMenu(false); }}>
                Profile
              </button>
              <button className={styles.header__userMenuItem} onClick={() => { setLocation('/settings'); setShowUserMenu(false); }}>
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
