import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { RadioStation } from '../../types';
import styles from './RadioSearchBar.module.css';

interface RadioSearchBarProps {
  onSearch: (query: string) => void;
  onResultSelect: (station: RadioStation) => void;
  searchResults: RadioStation[];
  isLoading: boolean;
  placeholder?: string;
}

/**
 * RadioSearchBar Component
 * Search bar with live results dropdown for radio stations
 * Features debounced search (minimum 2 characters)
 */
export function RadioSearchBar({
  onSearch,
  onResultSelect,
  searchResults,
  isLoading,
  placeholder = 'Buscar emisora...'
}: RadioSearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        onSearch(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(value.length >= 2);
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    onSearch('');
  };

  const handleResultClick = (station: RadioStation) => {
    onResultSelect(station);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className={styles.searchBar} ref={searchRef}>
      <div className={styles.searchBar__inputWrapper}>
        <Search size={20} className={styles.searchBar__icon} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={styles.searchBar__input}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.searchBar__clearButton}
            aria-label="Limpiar búsqueda"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && query.length >= 2 && (
        <div className={styles.searchBar__results}>
          {isLoading ? (
            <p className={styles.searchBar__message}>Buscando...</p>
          ) : searchResults.length > 0 ? (
            <>
              <div className={styles.searchBar__resultsHeader}>
                Emisoras encontradas
              </div>
              {searchResults.slice(0, 8).map((station) => (
                <button
                  key={station.stationuuid}
                  className={styles.searchBar__resultItem}
                  onClick={() => handleResultClick(station)}
                >
                  <img
                    src={station.favicon || '/images/radio_placeholder.png'}
                    alt={station.name}
                    className={styles.searchBar__resultImage}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.src = '/images/radio_placeholder.png';
                    }}
                  />
                  <div className={styles.searchBar__resultInfo}>
                    <p className={styles.searchBar__resultName}>{station.name}</p>
                    <p className={styles.searchBar__resultMeta}>
                      {station.country} {station.tags && `• ${station.tags.split(',')[0]}`}
                    </p>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <p className={styles.searchBar__message}>
              No se encontraron emisoras para "{query}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
