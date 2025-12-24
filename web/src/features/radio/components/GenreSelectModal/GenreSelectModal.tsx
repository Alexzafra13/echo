import { useState } from 'react';
import { X, Music2, Search } from 'lucide-react';
import styles from './GenreSelectModal.module.css';

export interface Genre {
  id: string;
  label: string;
  icon?: string;
}

interface GenreSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  genres: Genre[];
  selectedGenre: string;
  onChange: (genreId: string) => void;
}

/**
 * GenreSelectModal Component
 * Modal for selecting a music genre to filter radio stations
 * Better UX than tabs for many genres - doesn't clutter the UI
 */
export function GenreSelectModal({
  isOpen,
  onClose,
  genres,
  selectedGenre,
  onChange
}: GenreSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleGenreClick = (genreId: string) => {
    onChange(genreId);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  // Filter genres by search query
  const filteredGenres = searchQuery
    ? genres.filter(g =>
        g.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : genres;

  return (
    <div className={styles.modal__overlay} onClick={handleClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>
            <Music2 size={20} />
            Seleccionar género
          </h2>
          <button
            className={styles.modal__closeButton}
            onClick={handleClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search bar */}
        <div className={styles.modal__search}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar género..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.modal__searchInput}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={styles.modal__searchClear}
              aria-label="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.modal__body}>
          <div className={styles.modal__grid}>
            {filteredGenres.map(genre => (
              <button
                key={genre.id}
                className={`${styles.genreOption} ${selectedGenre === genre.id ? styles['genreOption--selected'] : ''}`}
                onClick={() => handleGenreClick(genre.id)}
              >
                {genre.icon && <span className={styles.genreOption__icon}>{genre.icon}</span>}
                <span className={styles.genreOption__label}>{genre.label}</span>
                <span className={styles.genreOption__check}>✓</span>
              </button>
            ))}
          </div>

          {/* No results */}
          {searchQuery && filteredGenres.length === 0 && (
            <div className={styles.modal__empty}>
              <p>No se encontraron géneros</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
