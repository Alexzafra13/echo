/**
 * Auto-Search Stats Display Component
 *
 * Statistics cards showing auto-search performance
 */

import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import type { AutoSearchStats } from '../../types';
import styles from './AutoSearchTab.module.css';

export interface AutoSearchStatsDisplayProps {
  stats: AutoSearchStats;
}

/**
 * Display auto-search statistics with colored cards
 */
export function AutoSearchStatsDisplay({ stats }: AutoSearchStatsDisplayProps) {
  const { t } = useTranslation();
  const { autoApplied, conflictsCreated, ignored } = stats;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{t('admin.metadata.autoSearch.statistics')}</h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
          <div className={styles.statValue}>{autoApplied}</div>
          <div className={styles.statLabel}>{t('admin.metadata.autoSearch.autoAppliedStat')}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardWarning}`}>
          <div className={styles.statValue}>{conflictsCreated}</div>
          <div className={styles.statLabel}>{t('admin.metadata.autoSearch.conflictsCreated')}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardInfo}`}>
          <div className={styles.statValue}>{ignored}</div>
          <div className={styles.statLabel}>{t('admin.metadata.autoSearch.ignoredStat')}</div>
        </div>
      </div>

      {conflictsCreated > 0 && (
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <AlertCircle
            size={14}
            style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }}
          />
          {t('admin.metadata.autoSearch.pendingConflicts', { count: conflictsCreated })}
        </p>
      )}
    </div>
  );
}
