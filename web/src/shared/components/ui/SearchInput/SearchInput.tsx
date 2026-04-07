import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import styles from './SearchInput.module.css';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SearchInput = memo(function SearchInput({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  disabled = false,
  className,
}: SearchInputProps) {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder ?? t('ui.searchPlaceholder');
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={`${styles.searchWrapper} ${className || ''}`}>
      <Search size={20} className={styles.searchIcon} />
      <input
        type="text"
        placeholder={effectivePlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.searchInput}
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className={styles.clearButton}
          aria-label={t('common.clearSearch')}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
});

export default SearchInput;
