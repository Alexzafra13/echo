import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './RadioSearch.module.css';

interface RadioSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function RadioSearch({ onSearch, placeholder }: RadioSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form className={styles.searchForm} onSubmit={handleSubmit}>
      <div className={styles.searchContainer}>
        <Search size={20} className={styles.searchIcon} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || t('radio.searchPlaceholderShort')}
          className={styles.searchInput}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label={t('radio.clearSearch')}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
