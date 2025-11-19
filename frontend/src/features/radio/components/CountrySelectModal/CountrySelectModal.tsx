import { X, Globe } from 'lucide-react';
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
 */
export function CountrySelectModal({
  isOpen,
  onClose,
  countries,
  selectedCountry,
  onChange,
  userCountryCode
}: CountrySelectModalProps) {
  if (!isOpen) return null;

  const handleCountryClick = (countryCode: string) => {
    onChange(countryCode);
    onClose();
  };

  const userCountry = countries.find(c => c.code === userCountryCode);
  const otherCountries = countries.filter(c => c.code !== userCountryCode);

  return (
    <div className={styles.modal__overlay} onClick={onClose}>
      <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modal__header}>
          <h2 className={styles.modal__title}>
            <Globe size={20} />
            Seleccionar país
          </h2>
          <button
            className={styles.modal__closeButton}
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
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
          <div className={styles.modal__section}>
            <h3 className={styles.modal__sectionTitle}>Países populares</h3>
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
        </div>
      </div>
    </div>
  );
}
