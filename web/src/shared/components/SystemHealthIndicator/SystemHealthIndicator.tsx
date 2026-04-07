import { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useAuth, useClickOutside } from '@shared/hooks';
import { useSystemHealth } from '@shared/hooks/useSystemHealth';
import type { SystemHealth, ActiveAlerts } from '@shared/hooks/useSystemHealth';
import styles from './SystemHealthIndicator.module.css';

type OverallStatus = 'healthy' | 'warning' | 'critical';

/**
 * SystemHealthIndicator Component
 * Muestra un indicador de estado del sistema en el header (estilo Navidrome)
 */
export function SystemHealthIndicator() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showTooltip, setShowTooltip] = useState(false);

  const isAdmin = user?.isAdmin ?? false;

  const { data } = useSystemHealth();
  const health: SystemHealth | null = data?.systemHealth ?? null;
  const alerts: ActiveAlerts | null = data?.activeAlerts ?? null;

  // Use hook for click outside and scroll close
  const {
    ref: containerRef,
    isClosing,
    close,
  } = useClickOutside<HTMLDivElement>(() => setShowTooltip(false), {
    enabled: showTooltip && isAdmin,
    animationDuration: 200,
  });

  // Solo mostrar para admins
  if (!isAdmin) {
    return null;
  }

  const getOverallStatus = (): OverallStatus => {
    // Mientras se carga, asumir healthy (evita parpadeo rojo)
    if (!health) return 'healthy';

    // Critical if anything is down, critical, or error
    if (health.database === 'down' || health.storage === 'critical' || health.scanner === 'error') {
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
        return t('systemHealth.healthy');
      case 'warning':
        return t('systemHealth.warning');
      case 'critical':
        return t('systemHealth.critical');
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
              <span className={styles.tooltipLabel}>{t('systemHealth.database')}</span>
              <span className={styles[`status-${health.database}`]}>
                {health.database === 'healthy'
                  ? t('systemHealth.dbHealthy')
                  : health.database === 'degraded'
                    ? t('systemHealth.dbDegraded')
                    : t('systemHealth.dbDown')}
              </span>
            </div>

            <div className={styles.tooltipSection}>
              <span className={styles.tooltipLabel}>{t('systemHealth.cache')}</span>
              <span className={styles[`status-${health.redis}`]}>
                {health.redis === 'healthy'
                  ? t('systemHealth.cacheHealthy')
                  : health.redis === 'degraded'
                    ? t('systemHealth.cacheDegraded')
                    : t('systemHealth.cacheDown')}
              </span>
            </div>

            <div className={styles.tooltipSection}>
              <span className={styles.tooltipLabel}>{t('systemHealth.scanner')}</span>
              <span className={styles[`status-${health.scanner}`]}>
                {health.scanner === 'idle'
                  ? t('systemHealth.scannerIdle')
                  : health.scanner === 'running'
                    ? t('systemHealth.scannerRunning')
                    : t('systemHealth.scannerError')}
              </span>
            </div>

            <div className={styles.tooltipSection}>
              <span className={styles.tooltipLabel}>{t('systemHealth.storage')}</span>
              <span className={styles[`status-${health.storage}`]}>
                {health.storage === 'healthy'
                  ? t('systemHealth.storageHealthy')
                  : health.storage === 'warning'
                    ? t('systemHealth.storageWarning')
                    : t('systemHealth.storageCritical')}
              </span>
            </div>

            {alerts &&
              (alerts.orphanedFiles > 0 ||
                alerts.pendingConflicts > 0 ||
                alerts.storageWarning ||
                alerts.scanErrors > 0) && (
                <>
                  <div className={styles.tooltipDivider} />
                  <div className={styles.tooltipAlerts}>
                    {alerts.orphanedFiles > 0 && (
                      <div className={styles.tooltipAlert}>
                        • {t('systemHealth.orphanedFiles', { count: alerts.orphanedFiles })}
                      </div>
                    )}
                    {alerts.pendingConflicts > 0 && (
                      <div className={styles.tooltipAlert}>
                        • {t('systemHealth.pendingConflicts', { count: alerts.pendingConflicts })}
                      </div>
                    )}
                    {alerts.storageWarning && (
                      <div className={styles.tooltipAlert}>
                        •{' '}
                        {alerts.storageDetails
                          ? t('systemHealth.storagePercent', {
                              percent: alerts.storageDetails.percentUsed,
                              current: alerts.storageDetails.currentMB,
                              limit: alerts.storageDetails.limitMB,
                            })
                          : t('systemHealth.storageNearLimit')}
                      </div>
                    )}
                    {alerts.scanErrors > 0 && (
                      <div className={styles.tooltipAlert}>
                        • {t('systemHealth.scanErrors', { count: alerts.scanErrors })}
                      </div>
                    )}
                  </div>
                </>
              )}

            <button className={styles.tooltipFooter} onClick={handleNavigateToDashboard}>
              {t('systemHealth.viewDashboard')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
