import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { X, Globe, Search } from 'lucide-react';
import { Country } from '../CountrySelect/CountrySelect';
import styles from './CountrySelectModal.module.css';

interface CountrySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: Country[];
  selectedCountry: string;
  onChange: (countryCode: string) => void;
  userCountryCode?: string;
}

// Usa virtualización para manejar 200+ países eficientemente
export const CountrySelectModal = memo(function CountrySelectModal({
  isOpen,
  onClose,
  countries,
  selectedCountry,
  onChange,
  userCountryCode,
}: CountrySelectModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCountryClick = useCallback(
    (countryCode: string) => {
      onChange(countryCode);
      onClose();
    },
    [onChange, onClose]
  );

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const { userCountry, popularCountries, otherCountries } = useMemo(() => {
    const filtered = searchQuery
      ? countries.filter(
          (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.code.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : countries;

    const user = filtered.find((c) => c.code === userCountryCode);
    const others = filtered.filter((c) => c.code !== userCountryCode);

    return {
      userCountry: user,
      popularCountries: others.slice(0, 20),
      otherCountries: others.slice(20),
    };
  }, [countries, searchQuery, userCountryCode]);

  if (!isOpen) return null;

  return (
    <div className={styles.modal__overlay} onClick={handleClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>
            <Globe size={20} />
            {t('radio.selectCountry')}
          </h2>
          <button
            className={styles.modal__closeButton}
            onClick={handleClose}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modal__search}>
          <Search size={16} />
          <input
            type="text"
            placeholder={t('radio.searchCountry')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.modal__searchInput}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={styles.modal__searchClear}
              aria-label={t('radio.clearSearch')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className={styles.modal__body} ref={scrollContainerRef}>
          <button
            className={`${styles.countryOption} ${selectedCountry === 'ALL' ? styles['countryOption--selected'] : ''}`}
            onClick={() => handleCountryClick('ALL')}
          >
            <span className={styles.countryOption__flag}>🌍</span>
            <span className={styles.countryOption__name}>{t('radio.allWorld')}</span>
            {selectedCountry === 'ALL' && <span className={styles.countryOption__check}>✓</span>}
          </button>

          {userCountry && (
            <>
              <div className={styles.modal__section}>
                <h3 className={styles.modal__sectionTitle}>{t('radio.yourCountrySection')}</h3>
              </div>
              <button
                className={`${styles.countryOption} ${selectedCountry === userCountry.code ? styles['countryOption--selected'] : ''}`}
                onClick={() => handleCountryClick(userCountry.code)}
              >
                <span className={styles.countryOption__flag}>{userCountry.flag}</span>
                <span className={styles.countryOption__name}>
                  {userCountry.name}
                  {userCountry.stationCount ? ` (${userCountry.stationCount})` : ''}
                </span>
                {selectedCountry === userCountry.code && (
                  <span className={styles.countryOption__check}>✓</span>
                )}
              </button>
            </>
          )}

          {popularCountries.length > 0 && (
            <>
              <div className={styles.modal__section}>
                <h3 className={styles.modal__sectionTitle}>{t('radio.popularCountries')}</h3>
              </div>
              <div className={styles.modal__grid}>
                {popularCountries.map((country) => (
                  <button
                    key={country.code}
                    className={`${styles.countryOption} ${selectedCountry === country.code ? styles['countryOption--selected'] : ''}`}
                    onClick={() => handleCountryClick(country.code)}
                  >
                    <span className={styles.countryOption__flag}>{country.flag}</span>
                    <span className={styles.countryOption__name}>
                      {country.name}
                      {country.stationCount ? ` (${country.stationCount})` : ''}
                    </span>
                    {selectedCountry === country.code && (
                      <span className={styles.countryOption__check}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {otherCountries.length > 0 && !searchQuery && (
            <>
              <div className={styles.modal__section}>
                <h3 className={styles.modal__sectionTitle}>
                  {t('radio.allCountries', { count: otherCountries.length })}
                </h3>
              </div>
              <VirtualizedCountryList
                countries={otherCountries}
                selectedCountry={selectedCountry}
                onCountryClick={handleCountryClick}
              />
            </>
          )}

          {searchQuery &&
            !userCountry &&
            popularCountries.length === 0 &&
            otherCountries.length === 0 && (
              <div className={styles.modal__empty}>
                <p>{t('radio.noCountriesFound')}</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
});

interface VirtualizedCountryListProps {
  countries: Country[];
  selectedCountry: string;
  onCountryClick: (code: string) => void;
}

function VirtualizedCountryList({
  countries,
  selectedCountry,
  onCountryClick,
}: VirtualizedCountryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: countries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className={styles.virtualList}
      style={{ height: Math.min(400, countries.length * 56) }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const country = countries[virtualRow.index];
          return (
            <button
              key={country.code}
              className={`${styles.countryOption} ${selectedCountry === country.code ? styles['countryOption--selected'] : ''}`}
              onClick={() => onCountryClick(country.code)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <span className={styles.countryOption__flag}>{country.flag}</span>
              <span className={styles.countryOption__name}>
                {country.name}
                {country.stationCount ? ` (${country.stationCount})` : ''}
              </span>
              {selectedCountry === country.code && (
                <span className={styles.countryOption__check}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
