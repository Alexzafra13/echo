import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { useAuth, useScrollDetection, useClickOutside } from '@shared/hooks';
import { useAuthStore } from '@shared/store';
import { BackButton } from '@shared/components/ui';
import { SystemHealthIndicator } from '@shared/components/SystemHealthIndicator';
import { LufsProgressIndicator } from '@shared/components/LufsProgressIndicator';
import { DjProgressIndicator } from '@shared/components/DjProgressIndicator';
import { FederationImportIndicator } from '@shared/components/FederationImportIndicator';
import { ScanProgressIndicator } from '@shared/components/ScanProgressIndicator';
import { MetadataNotifications } from './MetadataNotifications';
import { SearchPanel } from './SearchPanel';
import { UserMenu } from './UserMenu';
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
  const { ref: searchRef } = useClickOutside<HTMLFormElement>(
    () => setShowResults(false),
    { enabled: showResults }
  );

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
      {showBackButton && (
        <BackButton className={styles.header__backButton} />
      )}

      {/* Left section - Search and custom content */}
      <div className={styles.header__leftSection}>
        {/* Custom search or default search bar */}
        {!adminMode && !disableSearch && (
          customSearch ? (
            <div className={styles.header__customSearch}>
              {customSearch}
            </div>
          ) : (
            <form
              className={styles.header__searchForm}
              onSubmit={handleSearchSubmit}
              ref={searchRef}
            >
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

      {/* Right section - Notifications, user menu */}
      <div className={styles.header__rightSection}>
        {/* Library scan progress (solo visible cuando hay escaneos activos) */}
        <ScanProgressIndicator />

        {/* Federation import progress (solo visible cuando hay importaciones activas) */}
        <FederationImportIndicator />

        {/* LUFS analysis progress (global, solo visible cuando hay análisis) */}
        <LufsProgressIndicator />

        {/* DJ analysis progress (BPM, Key, Energy) */}
        <DjProgressIndicator />

        {/* System health indicator (solo admin) */}
        <SystemHealthIndicator />

        {/* Notificaciones (metadata + alertas del sistema) */}
        <MetadataNotifications token={accessToken} isAdmin={user?.isAdmin || false} />

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
