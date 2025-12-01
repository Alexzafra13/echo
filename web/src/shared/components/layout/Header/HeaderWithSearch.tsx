import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Header } from './Header';
import { SearchPanel } from './SearchPanel';
import styles from './Header.module.css';

interface HeaderWithSearchProps {
  /** Enable admin mode: hides search */
  adminMode?: boolean;
  /** Show back button */
  showBackButton?: boolean;
  /** Always show glassmorphism effect (for pages with hero behind header) */
  alwaysGlass?: boolean;
}

/**
 * HeaderWithSearch Component
 * Header with integrated search panel that expands below
 * Wrapped in a sticky container so SearchPanel pushes content down smoothly
 * Similar to YouTube/Spotify - pushes content down instead of dropdown
 */
export function HeaderWithSearch({ adminMode = false, showBackButton = false, alwaysGlass = false }: HeaderWithSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      // Open panel when query has 2+ characters
      setIsSearchPanelOpen(searchQuery.length >= 2);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchPanelOpen(false);
  };

  const handleClosePanel = useCallback(() => {
    setIsSearchPanelOpen(false);
    setSearchQuery('');
  }, []);

  const handleSearchFocus = () => {
    if (searchQuery.length >= 2) {
      setIsSearchPanelOpen(true);
    }
  };

  // Custom search component
  const searchBar = !adminMode ? (
    <div className={styles.header__searchForm}>
      <div className={styles.header__searchWrapper}>
        <Search size={20} className={styles.header__searchIcon} />
        <input
          type="text"
          placeholder="Busca Artistas, Canciones, Álbumes..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={handleSearchFocus}
          className={styles.header__searchInput}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className={styles.header__searchClearButton}
            aria-label="Limpiar búsqueda"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <div className={styles.headerWrapper}>
      <Header
        adminMode={adminMode}
        showBackButton={showBackButton}
        alwaysGlass={alwaysGlass}
        customSearch={searchBar}
      />

      {/* Search Panel - Expands below header, pushing content down */}
      {!adminMode && (
        <SearchPanel
          isOpen={isSearchPanelOpen}
          query={debouncedQuery}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}
