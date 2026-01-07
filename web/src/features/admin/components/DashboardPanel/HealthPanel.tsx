import { CheckCircle2, XCircle, AlertCircle, Activity, Database, Zap, Radio, HardDrive, AlertTriangle, ChevronRight } from 'lucide-react';
import styles from './HealthPanel.module.css';

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  scanner: 'idle' | 'running' | 'error';
  metadataApis: {
    lastfm: 'healthy' | 'degraded' | 'down';
    fanart: 'healthy' | 'degraded' | 'down';
    musicbrainz: 'healthy' | 'degraded' | 'down';
  };
  storage: 'healthy' | 'warning' | 'critical';
}

interface ActiveAlerts {
  orphanedFiles: number;
  pendingConflicts: number;
  storageWarning: boolean;
  storageDetails?: {
    currentMB: number;
    limitMB: number;
    percentUsed: number;
  };
  scanErrors: number;
}

interface ScanStats {
  currentScan: {
    isRunning: boolean;
    startedAt: string | null;
    progress: number;
  };
}

interface HealthPanelProps {
  health: SystemHealth;
  alerts: ActiveAlerts;
  scanStats?: ScanStats;
  onNavigateToTab?: (tab: string) => void;
}

/**
 * HealthPanel Component
 * Panel que muestra el estado de salud del sistema y alertas activas
 */
export function HealthPanel({ health, alerts, scanStats, onNavigateToTab }: HealthPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'idle':
        return <CheckCircle2 size={16} className={styles.iconHealthy} />;
      case 'degraded':
      case 'warning':
      case 'running':
        return <AlertCircle size={16} className={styles.iconWarning} />;
      case 'down':
      case 'error':
      case 'critical':
        return <XCircle size={16} className={styles.iconError} />;
      default:
        return <AlertCircle size={16} className={styles.iconWarning} />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      healthy: 'Saludable',
      degraded: 'Degradado',
      down: 'Inactivo',
      idle: 'Inactivo',
      running: 'En ejecución',
      error: 'Error',
      warning: 'Advertencia',
      critical: 'Crítico',
    };
    return labels[status] || status;
  };

  const totalAlerts =
    alerts.orphanedFiles +
    alerts.pendingConflicts +
    (alerts.storageWarning ? 1 : 0) +
    alerts.scanErrors;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Activity size={20} />
        <h3 className={styles.title}>Estado del Sistema</h3>
      </div>

      <div className={styles.grid}>
        {/* Database */}
        <div className={styles.healthItem}>
          <div className={styles.healthHeader}>
            <Database size={18} />
            <span className={styles.healthLabel}>Base de Datos</span>
          </div>
          <div className={styles.healthStatus}>
            {getStatusIcon(health.database)}
            <span>{getStatusLabel(health.database)}</span>
          </div>
        </div>

        {/* Redis */}
        <div className={styles.healthItem}>
          <div className={styles.healthHeader}>
            <Zap size={18} />
            <span className={styles.healthLabel}>Caché (Redis)</span>
          </div>
          <div className={styles.healthStatus}>
            {getStatusIcon(health.redis)}
            <span>{getStatusLabel(health.redis)}</span>
          </div>
        </div>

        {/* Scanner */}
        <div className={styles.healthItem}>
          <div className={styles.healthHeader}>
            <Radio size={18} />
            <span className={styles.healthLabel}>Escáner</span>
          </div>
          <div className={styles.healthStatus}>
            {getStatusIcon(health.scanner)}
            <span>{getStatusLabel(health.scanner)}</span>
            {scanStats?.currentScan.isRunning && (
              <span className={styles.scanProgress}>
                {scanStats.currentScan.progress}%
              </span>
            )}
          </div>
          {scanStats?.currentScan.isRunning && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${scanStats.currentScan.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Storage */}
        <div className={styles.healthItem}>
          <div className={styles.healthHeader}>
            <HardDrive size={18} />
            <span className={styles.healthLabel}>Almacenamiento</span>
          </div>
          <div className={styles.healthStatus}>
            {getStatusIcon(health.storage)}
            <span>{getStatusLabel(health.storage)}</span>
          </div>
        </div>

        {/* Last.fm */}
        <div className={styles.healthItem}>
          <div className={styles.healthHeader}>
            <Radio size={18} />
            <span className={styles.healthLabel}>Last.fm API</span>
          </div>
          <div className={styles.healthStatus}>
            {getStatusIcon(health.metadataApis.lastfm)}
            <span>{getStatusLabel(health.metadataApis.lastfm)}</span>
          </div>
        </div>

        {/* Fanart.tv */}
        <div className={styles.healthItem}>
          <div className={styles.healthHeader}>
            <Radio size={18} />
            <span className={styles.healthLabel}>Fanart.tv API</span>
          </div>
          <div className={styles.healthStatus}>
            {getStatusIcon(health.metadataApis.fanart)}
            <span>{getStatusLabel(health.metadataApis.fanart)}</span>
          </div>
        </div>

        {/* MusicBrainz */}
        <div className={styles.healthItem}>
          <div className={styles.healthHeader}>
            <Radio size={18} />
            <span className={styles.healthLabel}>MusicBrainz API</span>
          </div>
          <div className={styles.healthStatus}>
            {getStatusIcon(health.metadataApis.musicbrainz)}
            <span>{getStatusLabel(health.metadataApis.musicbrainz)}</span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {totalAlerts > 0 && (
        <div className={styles.alertsSection}>
          <div className={styles.alertsHeader}>
            <AlertTriangle size={18} />
            <h4 className={styles.alertsTitle}>
              Alertas Activas ({totalAlerts})
            </h4>
          </div>
          <div className={styles.alertsList}>
            {alerts.orphanedFiles > 0 && (
              <button
                className={styles.alertButton}
                onClick={() => onNavigateToTab?.('maintenance')}
                title="Click para ir a Mantenimiento y resolver"
              >
                <div className={styles.alertContent}>
                  <AlertCircle size={14} />
                  <span>{alerts.orphanedFiles} archivos huérfanos</span>
                </div>
                <ChevronRight size={14} className={styles.alertChevron} />
              </button>
            )}
            {alerts.pendingConflicts > 0 && (
              <button
                className={styles.alertButton}
                onClick={() => onNavigateToTab?.('metadata')}
                title="Click para ir a Metadata y resolver conflictos"
              >
                <div className={styles.alertContent}>
                  <AlertCircle size={14} />
                  <span>{alerts.pendingConflicts} conflictos pendientes en Metadata</span>
                </div>
                <ChevronRight size={14} className={styles.alertChevron} />
              </button>
            )}
            {alerts.storageWarning && (
              <button
                className={styles.alertButton}
                onClick={() => onNavigateToTab?.('maintenance')}
                title="Click para ir a Mantenimiento"
              >
                <div className={styles.alertContent}>
                  <AlertCircle size={14} />
                  <span>
                    {alerts.storageDetails
                      ? `Almacenamiento de metadata al ${alerts.storageDetails.percentUsed}% (${alerts.storageDetails.currentMB}MB / ${alerts.storageDetails.limitMB}MB)`
                      : 'Almacenamiento cerca del límite'}
                  </span>
                </div>
                <ChevronRight size={14} className={styles.alertChevron} />
              </button>
            )}
            {alerts.scanErrors > 0 && (
              <button
                className={styles.alertButton}
                onClick={() => onNavigateToTab?.('logs')}
                title="Click para ver logs de errores"
              >
                <div className={styles.alertContent}>
                  <AlertCircle size={14} />
                  <span>{alerts.scanErrors} errores en escaneos recientes</span>
                </div>
                <ChevronRight size={14} className={styles.alertChevron} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
