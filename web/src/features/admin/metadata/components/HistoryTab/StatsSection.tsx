/**
 * Stats Section Component
 *
 * Statistics display with period selector for enrichment history
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

export type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_KEYS: Record<Period, string> = {
  today: 'admin.metadata.historyTab.periodToday',
  week: 'admin.metadata.historyTab.periodWeek',
  month: 'admin.metadata.historyTab.periodMonth',
  all: 'admin.metadata.historyTab.periodAll',
};

export interface StatsSectionProps {
  stats: EnrichmentStats;
  period: Period;
  onPeriodChange: (period: Period) => void;
}

/**
 * Statistics section with animated period selector
 */
export function StatsSection({ stats, period, onPeriodChange }: StatsSectionProps) {
  const { t } = useTranslation();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<Period, HTMLButtonElement>>(new Map());

  const updateIndicator = useCallback(() => {
    const activeButton = buttonRefs.current.get(period);
    const nav = navRef.current;
    if (activeButton && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
      });
    }
  }, [period]);

  // Update on period change
  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  // Initial position
  useEffect(() => {
    const timer = setTimeout(updateIndicator, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.statsSection}>
      <div className={styles.statsHeader}>
        <h3 className={styles.statsTitle}>{t('admin.metadata.historyTab.stats')}</h3>
        <div className={styles.periodSelector} ref={navRef}>
          <div
            className={styles.periodIndicator}
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
            }}
          />
          {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              ref={(el) => {
                if (el) buttonRefs.current.set(p, el);
              }}
              className={`${styles.periodButton} ${period === p ? styles.periodButtonActive : ''}`}
              onClick={() => onPeriodChange(p)}
            >
              {t(PERIOD_KEYS[p])}
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
            <p className={styles.statLabel}>{t('admin.metadata.historyTab.totalEnrichments')}</p>
            <p className={styles.statValue}>{stats.totalEnrichments}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
            <CheckCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('admin.metadata.historyTab.successRate')}</p>
            <p className={styles.statValue}>{stats.successRate}%</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('admin.metadata.historyTab.averageTime')}</p>
            <p className={styles.statValue}>{stats.averageProcessingTime}ms</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Music size={24} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>{t('admin.metadata.historyTab.artistsAlbums')}</p>
            <p className={styles.statValue}>
              {stats.byEntityType.artist} / {stats.byEntityType.album}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
