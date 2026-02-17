import { Globe } from 'lucide-react';
import { Country } from '../CountrySelect/CountrySelect';
import styles from './CountrySelectButton.module.css';

interface CountrySelectButtonProps {
  countries: Country[];
  selectedCountry: string;
  onClick: () => void;
}

export function CountrySelectButton({
  countries,
  selectedCountry,
  onClick
}: CountrySelectButtonProps) {
  const selectedCountryData = countries.find(c => c.code === selectedCountry);

  return (
    <button
      className={styles.countryButton}
      onClick={onClick}
      aria-label="Seleccionar país"
      title="Seleccionar país"
    >
      {selectedCountry === 'ALL' ? (
        <>
          <Globe size={20} className={styles.countryButton__icon} />
          <span className={styles.countryButton__text}>Todo el mundo</span>
        </>
      ) : (
        <>
          <span className={styles.countryButton__flag}>{selectedCountryData?.flag || '🌍'}</span>
          <span className={styles.countryButton__text}>{selectedCountryData?.name || 'País'}</span>
        </>
      )}
    </button>
  );
}
