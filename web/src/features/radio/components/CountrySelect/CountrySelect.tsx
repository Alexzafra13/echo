import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  userCountryCode,
}: CountrySelectProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.countrySelect}>
      <label htmlFor="country-select" className={styles.countrySelect__label}>
        <Globe size={16} />
        {t('radio.selectCountry')}
      </label>
      <select
        id="country-select"
        value={selectedCountry}
        onChange={(e) => onChange(e.target.value)}
        className={styles.countrySelect__select}
      >
        <option value="ALL">🌍 {t('radio.allWorld')}</option>

        {userCountryCode && (
          <optgroup label={t('radio.yourCountrySection')}>
            {countries
              .filter((c) => c.code === userCountryCode)
              .map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name}
                  {country.stationCount ? ` (${country.stationCount})` : ''}
                </option>
              ))}
          </optgroup>
        )}

        <optgroup label={t('radio.popularCountries')}>
          {countries
            .filter((c) => c.code !== userCountryCode)
            .map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
                {country.stationCount ? ` (${country.stationCount})` : ''}
              </option>
            ))}
        </optgroup>
      </select>
    </div>
  );
}
