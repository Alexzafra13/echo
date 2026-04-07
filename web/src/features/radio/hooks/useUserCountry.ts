import { useQuery } from '@tanstack/react-query';
import { logger } from '@shared/utils/logger';

interface CountryInfo {
  country: string;
  countryCode: string;
  countryName: string;
}

// Detecta el país del usuario vía IP usando ipapi.co
export function useUserCountry() {
  return useQuery({
    queryKey: ['user-country'],
    queryFn: async (): Promise<CountryInfo> => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        return {
          country: data.country || 'ES',
          countryCode: data.country_code || 'ES',
          countryName: data.country_name || 'España',
        };
      } catch (error) {
        if (import.meta.env.DEV) {
          logger.error('Failed to detect user country:', error);
        }
        // Fallback a España
        return {
          country: 'ES',
          countryCode: 'ES',
          countryName: 'España',
        };
      }
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 horas (no cambia frecuentemente)
    retry: 1,
  });
}
