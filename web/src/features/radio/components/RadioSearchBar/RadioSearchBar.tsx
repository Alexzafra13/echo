import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import styles from './RadioSearchBar.module.css';

interface RadioSearchBarProps {
  onSearch: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}

export function RadioSearchBar({
  onSearch,
  onFocus,
  onBlur,
  placeholder = 'Buscar emisora...'
}: RadioSearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleFocus = () => {
    if (query.length >= 2) {
      onFocus?.();
    }
  };

  return (
    <div className={styles.searchBar}>
      <div className={styles.searchBar__inputWrapper}>
        <Search size={20} className={styles.searchBar__icon} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={onBlur}
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
    </div>
  );
}
