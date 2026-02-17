import { Globe } from 'lucide-react';
import styles from './CountrySelect.module.css';

export interface Country {
  code: string;
  name: string;
  flag: string;
  stationCount?: number;
}

interface CountrySelectProps {
  countries: Country[];
  selectedCountry: string;
  onChange: (countryCode: string) => void;
  userCountryCode?: string;
}

export function CountrySelect({
  countries,
  selectedCountry,
  onChange,
  userCountryCode
}: CountrySelectProps) {

  return (
    <div className={styles.countrySelect}>
      <label htmlFor="country-select" className={styles.countrySelect__label}>
        <Globe size={16} />
        País
      </label>
      <select
        id="country-select"
        value={selectedCountry}
        onChange={(e) => onChange(e.target.value)}
        className={styles.countrySelect__select}
      >
        <option value="ALL">🌍 Todo el mundo</option>

        {userCountryCode && (
          <optgroup label="Tu país">
            {countries
              .filter(c => c.code === userCountryCode)
              .map(country => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name}
                  {country.stationCount ? ` (${country.stationCount})` : ''}
                </option>
              ))
            }
          </optgroup>
        )}

        <optgroup label="Países populares">
          {countries
            .filter(c => c.code !== userCountryCode)
            .map(country => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
                {country.stationCount ? ` (${country.stationCount})` : ''}
              </option>
            ))
          }
        </optgroup>
      </select>
    </div>
  );
}
