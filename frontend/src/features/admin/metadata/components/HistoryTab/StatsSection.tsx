/**
 * Stats Section Component
 *
 * Statistics display with period selector for enrichment history
 */

import { TrendingUp, CheckCircle, Clock, Music } from 'lucide-react';
import styles from './HistoryTab.module.css';

export interface EnrichmentStats {
  totalEnrichments: number;
  successRate: number;
  averageProcessingTime: number;
  byEntityType: {
    artist: number;
    album: number;
  };
  byProvider: Array<{
    provider: string;
    success: number;
    partial: number;
    error: number;
    successRate: number;
  }>;
}

export interface StatsSectionProps {
  stats: EnrichmentStats;
  period: 'today' | 'week' | 'month' | 'all';
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'all') => void;
}

/**
 * Statistics section with period selector
 */
export function StatsSection({ stats, period, onPeriodChange }: StatsSectionProps) {
  return (
    <div className={styles.statsSection}>
      <div className={styles.statsHeader}>
        <h3 className={styles.statsTitle}>Estadísticas</h3>
        <div className={styles.periodSelector}>
          {(['today', 'week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              className={`${styles.periodButton} ${period === p ? styles.periodButtonActive : ''}`}
              onClick={() => onPeriodChange(p)}
            >
              {p === 'today' && 'Hoy'}
              {p === 'week' && 'Semana'}
              {p === 'month' && 'Mes'}
              {p === 'all' && 'Todo'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Total Enriquecimientos</p>
            <p className={styles.statValue}>{stats.totalEnrichments}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tasa de Éxito</p>
            <p className={styles.statValue}>{stats.successRate}%</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tiempo Promedio</p>
            <p className={styles.statValue}>{stats.averageProcessingTime}ms</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Music size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Artistas / Álbumes</p>
            <p className={styles.statValue}>
              {stats.byEntityType.artist} / {stats.byEntityType.album}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
