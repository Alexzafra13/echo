import { useEffect, useState } from 'react';
import { LayoutDashboard, TrendingUp, TrendingDown } from 'lucide-react';
import { apiClient } from '@shared/services/api';
import { formatDuration, formatBytes } from '@shared/utils/format';
import { StatCard } from './StatCard';
import { HealthPanel } from './HealthPanel';
import { ActivityTimelineChart } from './ActivityTimelineChart';
import { StorageBreakdownChart } from './StorageBreakdownChart';
import { RecentActivityFeed } from './RecentActivityFeed';
import { logger } from '@shared/utils/logger';
import styles from './DashboardPanel.module.css';

interface DashboardStats {
  libraryStats: {
    totalTracks: number;
    totalAlbums: number;
    totalArtists: number;
    totalGenres: number;
    totalDuration: number;
    totalStorage: number;
    tracksAddedToday: number;
    albumsAddedToday: number;
    artistsAddedToday: number;
  };
  storageBreakdown: {
    music: number;
    metadata: number;
    avatars: number;
    total: number;
  };
  systemHealth: {
    database: 'healthy' | 'degraded' | 'down';
    redis: 'healthy' | 'degraded' | 'down';
    scanner: 'idle' | 'running' | 'error';
    metadataApis: {
      lastfm: 'healthy' | 'degraded' | 'down';
      fanart: 'healthy' | 'degraded' | 'down';
      musicbrainz: 'healthy' | 'degraded' | 'down';
    };
    storage: 'healthy' | 'warning' | 'critical';
  };
  enrichmentStats: {
    today: {
      total: number;
      successful: number;
      failed: number;
      byProvider: Record<string, number>;
    };
    week: {
      total: number;
      successful: number;
      failed: number;
      byProvider: Record<string, number>;
    };
  };
  activityStats: {
    totalUsers: number;
    activeUsersLast24h: number;
    activeUsersLast7d: number;
  };
  scanStats: {
    lastScan: {
      startedAt: string | null;
      finishedAt: string | null;
      status: string | null;
      tracksAdded: number;
      tracksUpdated: number;
      tracksDeleted: number;
    };
    currentScan: {
      isRunning: boolean;
      startedAt: string | null;
      progress: number;
    };
  };
  activeAlerts: {
    orphanedFiles: number;
    pendingConflicts: number;
    storageWarning: boolean;
    storageDetails?: {
      currentMB: number;
      limitMB: number;
      percentUsed: number;
    };
    scanErrors: number;
  };
  activityTimeline: Array<{
    date: string;
    scans: number;
    enrichments: number;
    errors: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: 'scan' | 'enrichment' | 'user' | 'system';
    action: string;
    details: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
}

interface DashboardPanelProps {
  onNavigateToTab?: (tab: string) => void;
}

/**
 * DashboardPanel Component
 * Vista general del sistema con estadísticas y estado de salud
 */
export function DashboardPanel({ onNavigateToTab }: DashboardPanelProps = {}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/dashboard/stats');
      setStats(response.data);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        logger.error('Error loading dashboard stats:', err);
      }
      setError(err.response?.data?.message || 'Error al cargar las estadísticas');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <LayoutDashboard size={40} className={styles.loadingIcon} />
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadStats} className={styles.retryButton}>
            Reintentar
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
            <h2 className={styles.title}>Dashboard</h2>
            <p className={styles.subtitle}>Vista general del sistema</p>
          </div>
        </div>
        <button onClick={loadStats} className={styles.refreshButton}>
          Actualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Canciones"
          value={stats.libraryStats.totalTracks.toLocaleString()}
          change={stats.libraryStats.tracksAddedToday}
          changeLabel="hoy"
          icon="music"
        />
        <StatCard
          title="Álbumes"
          value={stats.libraryStats.totalAlbums.toLocaleString()}
          change={stats.libraryStats.albumsAddedToday}
          changeLabel="hoy"
          icon="disc"
        />
        <StatCard
          title="Artistas"
          value={stats.libraryStats.totalArtists.toLocaleString()}
          change={stats.libraryStats.artistsAddedToday}
          changeLabel="hoy"
          icon="users"
        />
        <StatCard
          title="Géneros"
          value={stats.libraryStats.totalGenres.toLocaleString()}
          icon="tag"
        />
        <StatCard
          title="Duración Total"
          value={formatDuration(stats.libraryStats.totalDuration)}
          icon="clock"
        />
        <StatCard
          title="Almacenamiento"
          value={formatBytes(stats.libraryStats.totalStorage)}
          subtitle={`${formatBytes(stats.storageBreakdown.metadata)} metadata`}
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
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Actividad de Usuarios</h3>
          <div className={styles.activityStats}>
            <div className={styles.activityStat}>
              <span className={styles.activityLabel}>Total</span>
              <span className={styles.activityValue}>
                {stats.activityStats.totalUsers}
              </span>
            </div>
            <div className={styles.activityStat}>
              <span className={styles.activityLabel}>Últimas 24h</span>
              <span className={styles.activityValue}>
                {stats.activityStats.activeUsersLast24h}
              </span>
            </div>
            <div className={styles.activityStat}>
              <span className={styles.activityLabel}>Últimos 7d</span>
              <span className={styles.activityValue}>
                {stats.activityStats.activeUsersLast7d}
              </span>
            </div>
          </div>
        </div>

        {/* Enrichment Stats */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Enriquecimiento de Metadata</h3>
          <div className={styles.enrichmentStats}>
            <div className={styles.enrichmentPeriod}>
              <span className={styles.periodLabel}>Hoy</span>
              <div className={styles.periodStats}>
                <span className={styles.periodValue}>
                  {stats.enrichmentStats.today.total}
                </span>
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
              <span className={styles.periodLabel}>7 días</span>
              <div className={styles.periodStats}>
                <span className={styles.periodValue}>
                  {stats.enrichmentStats.week.total}
                </span>
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
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Último Escaneo</h3>
          {stats.scanStats.lastScan.status ? (
            <div className={styles.scanInfo}>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>Estado</span>
                <span className={styles.scanValue}>
                  {stats.scanStats.lastScan.status}
                </span>
              </div>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>Agregados</span>
                <span className={styles.scanValue}>
                  {stats.scanStats.lastScan.tracksAdded}
                </span>
              </div>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>Actualizados</span>
                <span className={styles.scanValue}>
                  {stats.scanStats.lastScan.tracksUpdated}
                </span>
              </div>
              <div className={styles.scanStat}>
                <span className={styles.scanLabel}>Eliminados</span>
                <span className={styles.scanValue}>
                  {stats.scanStats.lastScan.tracksDeleted}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.noScanInfo}>No hay escaneos registrados</p>
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
