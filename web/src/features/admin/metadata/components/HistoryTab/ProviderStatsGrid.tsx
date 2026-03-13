/**
 * Provider Stats Grid Component
 *
 * Grid displaying statistics by provider with brand logos and colors
 */

import { getProviderBranding } from '../../constants/providerBranding';
import styles from './HistoryTab.module.css';

export interface ProviderStat {
  provider: string;
  success: number;
  partial: number;
  error: number;
  successRate: number;
}

export interface ProviderStatsGridProps {
  providers: ProviderStat[];
}

/** Map display names to branding keys */
const PROVIDER_KEY_MAP: Record<string, string> = {
  'last.fm': 'lastfm',
  'lastfm': 'lastfm',
  'fanart.tv': 'fanart',
  'fanart': 'fanart',
  'musicbrainz': 'musicbrainz',
  'cover art archive': 'coverartarchive',
  'coverartarchive': 'coverartarchive',
  'coverart': 'coverartarchive',
  'wikipedia': 'wikipedia',
  'google-favicon': 'google-favicon',
  'google favicon': 'google-favicon',
  'apple-touch-icon': 'apple-touch-icon',
  'apple touch icon': 'apple-touch-icon',
};

function getBrandingForProvider(name: string) {
  const key = PROVIDER_KEY_MAP[name.toLowerCase()] || name.toLowerCase();
  return getProviderBranding(key);
}

export function ProviderStatsGrid({ providers }: ProviderStatsGridProps) {
  if (providers.length === 0) return null;

  return (
    <div className={styles.providerStats}>
      <h4 className={styles.providerStatsTitle}>Por Proveedor</h4>
      <div className={styles.providerStatsGrid}>
        {providers.map((provider) => {
          const branding = getBrandingForProvider(provider.provider);
          return (
            <div
              key={provider.provider}
              className={styles.providerStatCard}
              style={branding ? {
                '--stat-provider-color': branding.brandColor,
                '--stat-provider-color-rgb': branding.brandColorRgb,
              } as React.CSSProperties : undefined}
            >
              <div className={styles.providerStatHeader}>
                <div className={styles.providerNameRow}>
                  {branding ? (
                    <img
                      src={branding.logoPath}
                      alt={branding.name}
                      className={styles.providerStatLogo}
                      style={branding.statsLogoHeight ? { height: branding.statsLogoHeight } : undefined}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const name = e.currentTarget.nextElementSibling as HTMLElement;
                        if (name) name.style.display = '';
                      }}
                    />
                  ) : null}
                  <span
                    className={styles.providerName}
                    style={branding ? { display: 'none' } : undefined}
                  >
                    {provider.provider}
                  </span>
                </div>
                <span className={styles.providerSuccessRate}>{provider.successRate}%</span>
              </div>
              <div className={styles.providerStatCounts}>
                <span className={styles.providerStatSuccess}>{provider.success} éxito</span>
                <span className={styles.providerStatPartial}>{provider.partial} parcial</span>
                <span className={styles.providerStatError}>{provider.error} error</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
