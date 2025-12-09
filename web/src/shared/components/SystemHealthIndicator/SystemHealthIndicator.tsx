import { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@shared/hooks/useAuth';
import { useClickOutside } from '@shared/hooks/useClickOutside';
import { useSystemHealthSSE } from '@shared/hooks/useSystemHealthSSE';
import styles from './SystemHealthIndicator.module.css';

type OverallStatus = 'healthy' | 'warning' | 'critical';

/**
 * SystemHealthIndicator Component
 * Muestra un indicador de estado del sistema en el header (estilo Navidrome)
 * Usa SSE para actualizaciones en tiempo real
 */
export function SystemHealthIndicator() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [showTooltip, setShowTooltip] = useState(false);

  const isAdmin = user?.isAdmin ?? false;

  // Click outside handler with touch and scroll support
  const { ref: containerRef, isClosing, close } = useClickOutside<HTMLDivElement>(
    () => setShowTooltip(false),
    { enabled: isAdmin && showTooltip, animationDuration: 200 }
  );

  // Use SSE for real-time health updates
  const { systemHealth: health, activeAlerts: alerts } = useSystemHealthSSE(token, isAdmin);

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
      (alerts && alerts.scanErrors > 0)
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

            {alerts && (alerts.scanErrors > 0 || alerts.missingFiles > 0 || alerts.storageDetails) && (
              <>
                <div className={styles.tooltipDivider} />
                <div className={styles.tooltipAlerts}>
                  {alerts.storageDetails && (
                    <div className={styles.tooltipAlert}>
                      • Metadata al {alerts.storageDetails.percentUsed}% ({alerts.storageDetails.currentMB}MB / {alerts.storageDetails.limitMB}MB)
                    </div>
                  )}
                  {alerts.scanErrors > 0 && (
                    <div className={styles.tooltipAlert}>
                      • {alerts.scanErrors} errores de escaneo
                    </div>
                  )}
                  {alerts.missingFiles > 0 && (
                    <div className={styles.tooltipAlert}>
                      • {alerts.missingFiles} archivos desaparecidos
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
