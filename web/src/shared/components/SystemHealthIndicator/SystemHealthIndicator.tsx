import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiClient } from '@shared/services/api';
import { useAuth, useClickOutside } from '@shared/hooks';
import { logger } from '@shared/utils/logger';
import styles from './SystemHealthIndicator.module.css';

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

type OverallStatus = 'healthy' | 'warning' | 'critical';

/**
 * SystemHealthIndicator Component
 * Muestra un indicador de estado del sistema en el header (estilo Navidrome)
 */
export function SystemHealthIndicator() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<ActiveAlerts | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const isAdmin = user?.isAdmin ?? false;

  // Use hook for click outside and scroll close
  const { ref: containerRef, isClosing, close } = useClickOutside<HTMLDivElement>(
    () => setShowTooltip(false),
    { enabled: showTooltip && isAdmin, animationDuration: 200 }
  );

  const loadHealth = async () => {
    try {
      const response = await apiClient.get('/admin/dashboard/health');
      setHealth(response.data.systemHealth);
      setAlerts(response.data.activeAlerts);
    } catch (err) {
      if (import.meta.env.DEV) {
        logger.error('Error loading system health:', err);
      }
      // Si falla, asumir estado degradado
      setHealth(null);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    loadHealth();

    // Poll every 60 seconds
    const interval = setInterval(loadHealth, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);


  // Solo mostrar para admins
  if (!isAdmin) {
    return null;
  }

  const getOverallStatus = (): OverallStatus => {
    // Mientras se carga, asumir healthy (evita parpadeo rojo)
    if (!health) return 'healthy';

    // Critical if anything is down, critical, or error
    if (
      health.database === 'down' ||
      health.storage === 'critical' ||
      health.scanner === 'error'
    ) {
      return 'critical';
    }

    // Warning if anything is degraded, warning, or running
    if (
      health.database === 'degraded' ||
      health.redis === 'degraded' ||
      health.storage === 'warning' ||
      health.scanner === 'running' ||
      (alerts && (alerts.orphanedFiles > 0 || alerts.pendingConflicts > 0 || alerts.scanErrors > 0))
    ) {
      return 'warning';
    }

    return 'healthy';
  };

  const status = getOverallStatus();

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 size={18} className={styles.iconHealthy} />;
      case 'warning':
        return <AlertCircle size={18} className={styles.iconWarning} />;
      case 'critical':
        return <XCircle size={18} className={styles.iconCritical} />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'healthy':
        return 'Sistema saludable';
      case 'warning':
        return 'Sistema con advertencias';
      case 'critical':
        return 'Sistema con errores críticos';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
    }
  };

  const handleToggleTooltip = () => {
    if (showTooltip) {
      close();
    } else {
      setShowTooltip(true);
    }
  };

  const handleNavigateToDashboard = () => {
    close(() => setLocation('/admin'));
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={styles.indicator}
        style={{ backgroundColor: getStatusColor() }}
        onClick={handleToggleTooltip}
      >
        <Activity size={12} />
      </div>

      {showTooltip && health && (
        <div className={`${styles.tooltip} ${isClosing ? styles['tooltip--closing'] : ''}`}>
          <div className={styles.tooltipHeader}>
            {getStatusIcon()}
            <span className={styles.tooltipTitle}>{getStatusLabel()}</span>
          </div>

          <div className={styles.tooltipContent}>
            <div className={styles.tooltipSection}>
              <span className={styles.tooltipLabel}>Base de Datos:</span>
              <span className={styles[`status-${health.database}`]}>
                {health.database === 'healthy' ? 'Activa' : health.database === 'degraded' ? 'Degradada' : 'Inactiva'}
              </span>
            </div>

            <div className={styles.tooltipSection}>
              <span className={styles.tooltipLabel}>Caché:</span>
              <span className={styles[`status-${health.redis}`]}>
                {health.redis === 'healthy' ? 'Activo' : health.redis === 'degraded' ? 'Degradado' : 'Inactivo'}
              </span>
            </div>

            <div className={styles.tooltipSection}>
              <span className={styles.tooltipLabel}>Escáner:</span>
              <span className={styles[`status-${health.scanner}`]}>
                {health.scanner === 'idle' ? 'Inactivo' : health.scanner === 'running' ? 'En ejecución' : 'Error'}
              </span>
            </div>

            <div className={styles.tooltipSection}>
              <span className={styles.tooltipLabel}>Almacenamiento:</span>
              <span className={styles[`status-${health.storage}`]}>
                {health.storage === 'healthy' ? 'Normal' : health.storage === 'warning' ? 'Advertencia' : 'Crítico'}
              </span>
            </div>

            {alerts && (alerts.orphanedFiles > 0 || alerts.pendingConflicts > 0 || alerts.storageWarning || alerts.scanErrors > 0) && (
              <>
                <div className={styles.tooltipDivider} />
                <div className={styles.tooltipAlerts}>
                  {alerts.orphanedFiles > 0 && (
                    <div className={styles.tooltipAlert}>
                      • {alerts.orphanedFiles} archivos huérfanos
                    </div>
                  )}
                  {alerts.pendingConflicts > 0 && (
                    <div className={styles.tooltipAlert}>
                      • {alerts.pendingConflicts} conflictos pendientes
                    </div>
                  )}
                  {alerts.storageWarning && (
                    <div className={styles.tooltipAlert}>
                      • {alerts.storageDetails
                          ? `Metadata al ${alerts.storageDetails.percentUsed}% (${alerts.storageDetails.currentMB}MB / ${alerts.storageDetails.limitMB}MB)`
                          : 'Almacenamiento cerca del límite'}
                    </div>
                  )}
                  {alerts.scanErrors > 0 && (
                    <div className={styles.tooltipAlert}>
                      • {alerts.scanErrors} errores de escaneo
                    </div>
                  )}
                </div>
              </>
            )}

            <button className={styles.tooltipFooter} onClick={handleNavigateToDashboard}>
              Ver detalles en Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
