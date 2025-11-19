import { useState } from 'react';
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

/**
 * CountrySelectModal Component
 * Modal for selecting a country to filter radio stations
 * Better UX than dropdown - doesn't cover content and shows flags prominently
 * Now shows ALL countries from Radio Browser API
 */
export function CountrySelectModal({
  isOpen,
  onClose,
  countries,
  selectedCountry,
  onChange,
  userCountryCode
}: CountrySelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleCountryClick = (countryCode: string) => {
    onChange(countryCode);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  // Filter countries by search query
  const filteredCountries = searchQuery
    ? countries.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countries;

  const userCountry = filteredCountries.find(c => c.code === userCountryCode);
  const popularCountries = filteredCountries.filter(c => c.code !== userCountryCode).slice(0, 20);
  const otherCountries = filteredCountries.filter(c => c.code !== userCountryCode).slice(20);

  return (
    <div className={styles.modal__overlay} onClick={handleClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>
            <Globe size={20} />
            Seleccionar país
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
            placeholder="Buscar país..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.modal__searchInput}
            autoFocus
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
          {/* Todo el mundo option */}
          <button
            className={`${styles.countryOption} ${selectedCountry === 'ALL' ? styles['countryOption--selected'] : ''}`}
            onClick={() => handleCountryClick('ALL')}
          >
            <span className={styles.countryOption__flag}>🌍</span>
            <span className={styles.countryOption__name}>Todo el mundo</span>
            {selectedCountry === 'ALL' && (
              <span className={styles.countryOption__check}>✓</span>
            )}
          </button>

          {/* User country section */}
          {userCountry && (
            <>
              <div className={styles.modal__section}>
                <h3 className={styles.modal__sectionTitle}>Tu país</h3>
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

          {/* Popular countries section */}
          {popularCountries.length > 0 && (
            <>
              <div className={styles.modal__section}>
                <h3 className={styles.modal__sectionTitle}>Países populares</h3>
              </div>
              <div className={styles.modal__grid}>
                {popularCountries.map(country => (
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

          {/* All other countries section */}
          {otherCountries.length > 0 && !searchQuery && (
            <>
              <div className={styles.modal__section}>
                <h3 className={styles.modal__sectionTitle}>Todos los países</h3>
              </div>
              <div className={styles.modal__grid}>
                {otherCountries.map(country => (
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

          {/* No results */}
          {searchQuery && filteredCountries.length === 0 && (
            <div className={styles.modal__empty}>
              <p>No se encontraron países</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
