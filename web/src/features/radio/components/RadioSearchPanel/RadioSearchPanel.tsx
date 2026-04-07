import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

export function RadioSearchPanel({
  isOpen,
  searchResults,
  isLoading,
  query,
  onResultSelect,
  onClose,
}: RadioSearchPanelProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const shouldShow = isOpen && query.length >= 2;

    if (shouldShow && !isVisible) {
      setIsClosing(false);
      setIsVisible(true);
    } else if (!shouldShow && isVisible) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, query, isVisible]);

  const groupedResults = useMemo(() => {
    if (!searchResults.length) return null;
    return {
      all: searchResults.slice(0, 20),
    };
  }, [searchResults]);

  const handleResultClick = (station: RadioStation) => {
    onResultSelect(station);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <>
      <div
        className={`${styles.searchPanel__backdrop} ${isClosing ? styles['searchPanel__backdrop--closing'] : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`${styles.searchPanel} ${isClosing ? styles['searchPanel--closing'] : ''}`}>
        <div className={styles.searchPanel__container}>
          {isLoading ? (
            <div className={styles.searchPanel__loading}>
              <div className={styles.searchPanel__spinner}></div>
              <p>{t('radio.searching')}</p>
            </div>
          ) : groupedResults && groupedResults.all.length > 0 ? (
            <div className={styles.searchPanel__results}>
              <div className={styles.searchPanel__header}>
                <h3 className={styles.searchPanel__title}>
                  {t('radio.searchResultsFor', { query })}
                </h3>
                <span className={styles.searchPanel__count}>
                  {t('radio.stationsFound', { count: groupedResults.all.length })}
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
                      {(station.customFaviconUrl || station.favicon) && (
                        <img
                          src={station.customFaviconUrl || station.favicon || undefined}
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
              <p className={styles.searchPanel__emptyTitle}>{t('radio.noStationsFound')}</p>
              <p className={styles.searchPanel__emptyText}>{t('radio.searchHint')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
