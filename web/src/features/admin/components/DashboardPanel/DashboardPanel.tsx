import { LayoutDashboard, TrendingUp, TrendingDown, Users, Sparkles, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDuration, formatBytes } from '@shared/utils/format';
import { getApiErrorMessage } from '@shared/utils/error.utils';
import { useDashboardStats } from '../../hooks/useDashboard';
import { StatCard } from './StatCard';
import { HealthPanel } from './HealthPanel';
import { ActivityTimelineChart } from './ActivityTimelineChart';
import { StorageBreakdownChart } from './StorageBreakdownChart';
import { RecentActivityFeed } from './RecentActivityFeed';
import styles from './DashboardPanel.module.css';

interface DashboardPanelProps {
  onNavigateToTab?: (tab: string) => void;
}

/**
 * DashboardPanel Component
 * Vista general del sistema con estadísticas y estado de salud
 */
export function DashboardPanel({ onNavigateToTab }: DashboardPanelProps = {}) {
  const { t } = useTranslation();
  const { stats, isLoading, error, refresh: handleRefresh } = useDashboardStats();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <LayoutDashboard size={40} className={styles.loadingIcon} />
          <p>{t('admin.dashboard.loadingStats')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{getApiErrorMessage(error, t('admin.dashboard.errorLoadingStats'))}</p>
          <button onClick={handleRefresh} className={styles.retryButton}>
            {t('admin.dashboard.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <LayoutDashboard size={28} />
          <div>
            <h2 className={styles.title}>{t('admin.dashboard.title')}</h2>
            <p className={styles.subtitle}>{t('admin.dashboard.systemOverview')}</p>
          </div>
        </div>
        {/* Refresh happens automatically via staleTime */}
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          title={t('admin.dashboard.songs')}
          value={stats.libraryStats.totalTracks.toLocaleString()}
          change={stats.libraryStats.tracksAddedToday}
          changeLabel={t('admin.dashboard.today')}
          icon="music"
        />
        <StatCard
          title={t('admin.dashboard.albums')}
          value={stats.libraryStats.totalAlbums.toLocaleString()}
          change={stats.libraryStats.albumsAddedToday}
          changeLabel={t('admin.dashboard.today')}
          icon="disc"
        />
        <StatCard
          title={t('admin.dashboard.artists')}
          value={stats.libraryStats.totalArtists.toLocaleString()}
          change={stats.libraryStats.artistsAddedToday}
          changeLabel={t('admin.dashboard.today')}
          icon="users"
        />
        <StatCard
          title={t('admin.dashboard.genres')}
          value={stats.libraryStats.totalGenres.toLocaleString()}
          icon="tag"
        />
        {(stats.libraryStats.totalVideos ?? 0) > 0 && (
          <StatCard
            title={t('admin.dashboard.videoclips')}
            value={stats.libraryStats.totalVideos.toLocaleString()}
            icon="film"
          />
        )}
        <StatCard
          title={t('admin.dashboard.totalDuration')}
          value={formatDuration(stats.libraryStats.totalDuration)}
          icon="clock"
        />
        <StatCard
          title={t('admin.dashboard.storage')}
          value={formatBytes(stats.storageBreakdown.total)}
          subtitle={`${formatBytes(stats.storageBreakdown.music)} ${t('admin.dashboard.music')}${(stats.storageBreakdown.videos ?? 0) > 0 ? ` · ${formatBytes(stats.storageBreakdown.videos)} ${t('admin.dashboard.videos')}` : ''} · ${formatBytes(stats.storageBreakdown.metadata + stats.storageBreakdown.avatars + stats.storageBreakdown.radioFavicons)} ${t('admin.dashboard.images')}`}
          icon="hard-drive"
        />
      </div>

      {/* System Health */}
      <HealthPanel
        health={stats.systemHealth}
        alerts={stats.activeAlerts}
        scanStats={stats.scanStats}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Activity & Enrichment Stats */}
      <div className={styles.statsRow}>
        {/* User Activity */}
        <div className={`${styles.card} ${styles.cardUsers}`}>
          <div className={styles.cardHeader}>
            <Users size={18} />
            <h3 className={styles.cardTitle}>{t('admin.dashboard.userActivity')}</h3>
          </div>
          <div className={styles.activityStats}>
            <div className={styles.activityStat}>
              <span className={styles.activityLabel}>{t('admin.dashboard.total')}</span>
              <span className={styles.activityValue}>{stats.activityStats.totalUsers}</span>
            </div>
            <div className={styles.activityStat}>
              <span className={styles.activityLabel}>{t('admin.dashboard.last24h')}</span>
              <span className={styles.activityValue}>{stats.activityStats.activeUsersLast24h}</span>
            </div>
            <div className={styles.activityStat}>
              <span className={styles.activityLabel}>{t('admin.dashboard.last7d')}</span>
              <span className={styles.activityValue}>{stats.activityStats.activeUsersLast7d}</span>
            </div>
          </div>
        </div>

        {/* Enrichment Stats */}
        <div className={`${styles.card} ${styles.cardEnrichment}`}>
          <div className={styles.cardHeader}>
            <Sparkles size={18} />
            <h3 className={styles.cardTitle}>{t('admin.dashboard.metadataEnrichment')}</h3>
          </div>
          <div className={styles.enrichmentStats}>
            <div className={styles.enrichmentPeriod}>
              <span className={styles.periodLabel}>{t('admin.dashboard.todayLabel')}</span>
              <div className={styles.periodStats}>
                <span className={styles.periodValue}>{stats.enrichmentStats.today.total}</span>
                <div className={styles.periodDetails}>
                  <span className={styles.successCount}>
                    <TrendingUp size={14} />
                    {stats.enrichmentStats.today.successful}
                  </span>
                  {stats.enrichmentStats.today.failed > 0 && (
                    <span className={styles.failedCount}>
                      <TrendingDown size={14} />
                      {stats.enrichmentStats.today.failed}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.enrichmentPeriod}>
              <span className={styles.periodLabel}>{t('admin.dashboard.sevenDays')}</span>
              <div className={styles.periodStats}>
                <span className={styles.periodValue}>{stats.enrichmentStats.week.total}</span>
                <div className={styles.periodDetails}>
                  <span className={styles.successCount}>
                    <TrendingUp size={14} />
                    {stats.enrichmentStats.week.successful}
                  </span>
                  {stats.enrichmentStats.week.failed > 0 && (
                    <span className={styles.failedCount}>
                      <TrendingDown size={14} />
                      {stats.enrichmentStats.week.failed}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Scan Info */}
        <div className={`${styles.card} ${styles.cardScan}`}>
          <div className={styles.cardHeader}>
            <Search size={18} />
            <h3 className={styles.cardTitle}>{t('admin.dashboard.lastScan')}</h3>
          </div>
          {stats.scanStats.lastScan.status ? (
            <div className={styles.scanInfo}>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>{t('admin.dashboard.status')}</span>
                <span className={styles.scanValue}>
                  {{
                    completed: t('admin.dashboard.scanCompleted'),
                    running: t('admin.dashboard.scanRunning'),
                    error: t('admin.dashboard.scanError'),
                    pending: t('admin.dashboard.scanPending'),
                  }[stats.scanStats.lastScan.status] || stats.scanStats.lastScan.status}
                </span>
              </div>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>{t('admin.dashboard.added')}</span>
                <span className={styles.scanValue}>{stats.scanStats.lastScan.tracksAdded}</span>
              </div>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>{t('admin.dashboard.updated')}</span>
                <span className={styles.scanValue}>{stats.scanStats.lastScan.tracksUpdated}</span>
              </div>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>{t('admin.dashboard.deleted')}</span>
                <span className={styles.scanValue}>{stats.scanStats.lastScan.tracksDeleted}</span>
              </div>
            </div>
          ) : (
            <p className={styles.noScanInfo}>{t('admin.dashboard.noScansRecorded')}</p>
          )}
        </div>
      </div>

      {/* Activity Timeline Chart */}
      <ActivityTimelineChart data={stats.activityTimeline} />

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Storage Breakdown */}
        <StorageBreakdownChart data={stats.storageBreakdown} />

        {/* Recent Activity Feed */}
        <RecentActivityFeed activities={stats.recentActivities} />
      </div>
    </div>
  );
}
