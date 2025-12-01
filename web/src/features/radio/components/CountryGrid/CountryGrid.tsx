import styles from './CountryGrid.module.css';

export interface Country {
  code: string;
  name: string;
  flag: string;
  stationCount?: number;
}

interface CountryGridProps {
  countries: Country[];
  onCountrySelect: (countryCode: string) => void;
  maxVisible?: number;
}

export function CountryGrid({ countries, onCountrySelect, maxVisible = 8 }: CountryGridProps) {
  const visibleCountries = countries.slice(0, maxVisible);
  const hasMore = countries.length > maxVisible;

  return (
    <div className={styles.countryGrid}>
      {visibleCountries.map((country) => (
        <button
          key={country.code}
          className={styles.countryCard}
          onClick={() => onCountrySelect(country.code)}
        >
          <span className={styles.countryFlag}>{country.flag}</span>
          <span className={styles.countryName}>{country.name}</span>
          {country.stationCount !== undefined && (
            <span className={styles.countryCount}>{country.stationCount}</span>
          )}
        </button>
      ))}
      {hasMore && (
        <button
          className={`${styles.countryCard} ${styles['countryCard--more']}`}
          onClick={() => {/* TODO: Mostrar modal con todos los países */}}
        >
          <span className={styles.countryFlag}>🌍</span>
          <span className={styles.countryName}>Ver todos</span>
          <span className={styles.countryCount}>+{countries.length - maxVisible}</span>
        </button>
      )}
    </div>
  );
}
