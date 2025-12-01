import { useMemo } from 'react';
import { Radio } from 'lucide-react';
import { RadioStation } from '../../types';
import styles from './RadioSearchPanel.module.css';

interface RadioSearchPanelProps {
  isOpen: boolean;
  searchResults: RadioStation[];
  isLoading: boolean;
  query: string;
  onResultSelect: (station: RadioStation) => void;
  onClose: () => void;
}

/**
 * RadioSearchPanel Component
 * Expandable panel that shows search results below header
 * Similar to YouTube/Spotify search - pushes content down instead of overlaying
 */
export function RadioSearchPanel({
  isOpen,
  searchResults,
  isLoading,
  query,
  onResultSelect,
  onClose
}: RadioSearchPanelProps) {
  // Group results by type for better organization
  const groupedResults = useMemo(() => {
    if (!searchResults.length) return null;

    // You can add more sophisticated grouping here
    // For now, we'll show all results with optional future grouping
    return {
      all: searchResults.slice(0, 20), // Limit to 20 results
    };
  }, [searchResults]);

  if (!isOpen || query.length < 2) return null;

  const handleResultClick = (station: RadioStation) => {
    onResultSelect(station);
    onClose();
  };

  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchPanel__container}>
        {isLoading ? (
          <div className={styles.searchPanel__loading}>
            <div className={styles.searchPanel__spinner}></div>
            <p>Buscando emisoras...</p>
          </div>
        ) : groupedResults && groupedResults.all.length > 0 ? (
          <div className={styles.searchPanel__results}>
            <div className={styles.searchPanel__header}>
              <h3 className={styles.searchPanel__title}>
                Resultados para "{query}"
              </h3>
              <span className={styles.searchPanel__count}>
                {groupedResults.all.length} emisoras encontradas
              </span>
            </div>

            <div className={styles.searchPanel__grid}>
              {groupedResults.all.map((station, index) => (
                <button
                  key={station.stationUuid || station.id || `station-${index}`}
                  className={styles.searchPanel__item}
                  onClick={() => handleResultClick(station)}
                >
                  <div className={styles.searchPanel__itemImageContainer}>
                    <div className={styles.searchPanel__itemFallback}>
                      <Radio size={20} />
                    </div>
                    {station.favicon && (
                      <img
                        src={station.favicon}
                        alt={station.name}
                        className={styles.searchPanel__itemImage}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <div className={styles.searchPanel__itemInfo}>
                    <p className={styles.searchPanel__itemName}>{station.name}</p>
                    <p className={styles.searchPanel__itemMeta}>
                      {station.country}
                      {station.tags && ` • ${station.tags.split(',').slice(0, 2).join(', ')}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.searchPanel__empty}>
            <p className={styles.searchPanel__emptyTitle}>
              No se encontraron emisoras
            </p>
            <p className={styles.searchPanel__emptyText}>
              Intenta buscar por nombre, país o género
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
