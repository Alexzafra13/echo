import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Search, User, Sun, Moon } from 'lucide-react';
import { useAuth, useTheme } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { BackButton } from '@shared/components/ui';
import { MetadataNotifications } from './MetadataNotifications';
import { SearchResults } from './SearchResults';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
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
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const accessToken = useAuthStore((state) => state.accessToken);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Detect scroll to apply glassmorphism effect
  // The scroll happens in the content container (sibling element), not in window
  useEffect(() => {
    // Find the scrollable content container
    const findScrollContainer = () => {
      if (!headerRef.current) return null;

      // Strategy 1: Try next sibling (most common case)
      let scrollableElement = headerRef.current.nextElementSibling as HTMLElement | null;

      if (scrollableElement) {
        const styles = window.getComputedStyle(scrollableElement);
        const hasScroll = styles.overflowY === 'auto' || styles.overflowY === 'scroll';

        if (hasScroll) {
          console.log('[Header] ✅ Found scroll container (nextSibling):', scrollableElement);
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
          console.log('[Header] ✅ Found scroll container (by overflow):', scrollableElement);
          return scrollableElement;
        }
      }

      console.log('[Header] ❌ No scroll container found');
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
      console.log('[Header] 🎯 Attaching scroll listener');
      scrollContainer.addEventListener('scroll', handleScroll);

      // Check initial scroll position
      if (scrollContainer.scrollTop > 50) {
        setIsScrolled(true);
      }

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }

    // Fallback to window scroll for pages that might use it
    console.log('[Header] ⚠️ Using window scroll fallback');
    const handleWindowScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
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
                onKeyDown={handleKeyDown}
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
        <MetadataNotifications token={accessToken} isAdmin={user?.isAdmin || false} />

        {/* User menu */}
        <div className={styles.header__userMenu}>
          <button
            className={styles.header__userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <img
              src={getUserAvatarUrl(user?.id)}
              alt={user?.username || 'User'}
              className={styles.header__userAvatar}
              onError={handleAvatarError}
            />
          </button>

          {showUserMenu && (
            <div className={styles.header__userDropdown}>
              <div className={styles.header__userInfo}>
                <img
                  src={getUserAvatarUrl(user?.id)}
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
