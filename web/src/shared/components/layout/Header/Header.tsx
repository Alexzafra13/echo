import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useAuth, useScrollDetection, useClickOutside } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { BackButton } from '@shared/components/ui';
import { SearchPanel } from './SearchPanel';
import { UserMenu } from './UserMenu';
import styles from './Header.module.css';

// Lazy load header indicators — they pull in stores, services and hooks
// that most users don't need on initial page load
const SystemHealthIndicator = lazy(() =>
  import('@shared/components/SystemHealthIndicator/SystemHealthIndicator').then((m) => ({
    default: m.SystemHealthIndicator,
  }))
);
const LufsProgressIndicator = lazy(() =>
  import('@shared/components/LufsProgressIndicator/LufsProgressIndicator').then((m) => ({
    default: m.LufsProgressIndicator,
  }))
);
const DjProgressIndicator = lazy(() =>
  import('@shared/components/DjProgressIndicator/DjProgressIndicator').then((m) => ({
    default: m.DjProgressIndicator,
  }))
);
const FederationImportIndicator = lazy(() =>
  import('@shared/components/FederationImportIndicator/FederationImportIndicator').then((m) => ({
    default: m.FederationImportIndicator,
  }))
);
const ScanProgressIndicator = lazy(() =>
  import('@shared/components/ScanProgressIndicator/ScanProgressIndicator').then((m) => ({
    default: m.ScanProgressIndicator,
  }))
);
const MetadataNotifications = lazy(() =>
  import('./MetadataNotifications').then((m) => ({ default: m.MetadataNotifications }))
);
const OfflineIndicator = lazy(() =>
  import('@shared/components/OfflineIndicator/OfflineIndicator').then((m) => ({
    default: m.OfflineIndicator,
  }))
);

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
 * Sticky header with search bar and user menu
 * Features: Transparent header that becomes glassmorphic on scroll
 * Supports admin mode with back navigation instead of search
 * Live search results with debouncing (300ms)
 * Theme toggle moved to Settings page
 */
export function Header({
  adminMode = false,
  showBackButton = false,
  alwaysGlass = false,
  customSearch,
  customContent,
  disableSearch = false,
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const avatarTimestamp = useAuthStore((state) => state.avatarTimestamp);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // User menu state
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Scroll detection for glassmorphism
  const { isScrolled, headerRef } = useScrollDetection({ alwaysScrolled: alwaysGlass });

  // Search click outside
  const { ref: searchRef } = useClickOutside<HTMLFormElement>(() => setShowResults(false), {
    enabled: showResults,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <header
      ref={headerRef as React.RefObject<HTMLElement>}
      className={`${styles.header} ${isScrolled ? styles['header--scrolled'] : ''}`}
    >
      {/* Back button */}
      {showBackButton && <BackButton className={styles.header__backButton} />}

      {/* Left section - Search and custom content */}
      <div className={styles.header__leftSection}>
        {/* Custom search or default search bar */}
        {!adminMode &&
          !disableSearch &&
          (customSearch ? (
            <div className={styles.header__customSearch}>{customSearch}</div>
          ) : (
            <form
              className={styles.header__searchForm}
              onSubmit={handleSearchSubmit}
              ref={searchRef}
            >
              <div className={styles.header__searchWrapper}>
                <Search size={20} className={styles.header__searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t('header.searchPlaceholder')}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                  className={styles.header__searchInput}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showResults && debouncedQuery.length > 0}
                  aria-controls="header-search-results"
                  aria-autocomplete="list"
                  aria-label={t('header.searchAriaLabel')}
                />
              </div>

              {/* Search Results Dropdown */}
              {showResults && debouncedQuery.length > 0 && (
                <SearchPanel query={debouncedQuery} onClose={handleCloseResults} isOpen={true} />
              )}
            </form>
          ))}

        {/* Custom content (e.g., country selector) */}
        {customContent}
      </div>

      {/* Right section - Notifications, user menu */}
      <div className={styles.header__rightSection}>
        {/* Lazy-loaded indicators — split from main bundle */}
        <Suspense fallback={null}>
          <ScanProgressIndicator />
          <FederationImportIndicator />
          <LufsProgressIndicator />
          <DjProgressIndicator />
          <OfflineIndicator />
          <SystemHealthIndicator />
          <MetadataNotifications token={accessToken} isAdmin={user?.isAdmin || false} />
        </Suspense>

        {/* User menu */}
        <UserMenu
          user={user}
          avatarTimestamp={avatarTimestamp}
          isOpen={showUserMenu}
          onOpenChange={setShowUserMenu}
          onLogout={logout}
        />
      </div>
    </header>
  );
}
