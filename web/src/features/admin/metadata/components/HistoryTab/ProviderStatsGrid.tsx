/**
 * Provider Stats Grid Component
 *
 * Grid displaying statistics by provider
 */

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

/**
 * Provider statistics grid
 */
export function ProviderStatsGrid({ providers }: ProviderStatsGridProps) {
  if (providers.length === 0) return null;

  return (
    <div className={styles.providerStats}>
      <h4 className={styles.providerStatsTitle}>Por Proveedor</h4>
      <div className={styles.providerStatsGrid}>
        {providers.map((provider) => (
          <div key={provider.provider} className={styles.providerStatCard}>
            <div className={styles.providerStatHeader}>
              <span className={styles.providerName}>{provider.provider}</span>
              <span className={styles.providerSuccessRate}>{provider.successRate}%</span>
            </div>
            <div className={styles.providerStatCounts}>
              <span className={styles.providerStatSuccess}>{provider.success} éxito</span>
              <span className={styles.providerStatPartial}>{provider.partial} parcial</span>
              <span className={styles.providerStatError}>{provider.error} error</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
