import { useQuery } from '@tanstack/react-query';

interface CountryInfo {
  country: string;
  countryCode: string;
  countryName: string;
}

/**
 * Hook para detectar el país del usuario usando su IP
 * Usa ipapi.co que es gratuito y no requiere API key
 */
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
          console.error('Failed to detect user country:', error);
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
