import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Database, HardDrive, AlertCircle, FileWarning, X } from 'lucide-react';
import styles from './SystemNotifications.module.css';

interface SystemNotificationsProps {
  token: string | null;
  isAdmin: boolean;
}

interface MetadataApisHealth {
  lastfm: 'healthy' | 'degraded' | 'down';
  fanart: 'healthy' | 'degraded' | 'down';
  musicbrainz: 'healthy' | 'degraded' | 'down';
}

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  scanner: 'idle' | 'running' | 'error';
  metadataApis: MetadataApisHealth;
  storage: 'healthy' | 'warning' | 'critical';
}

interface StorageDetails {
  currentMB: number;
  limitMB: number;
  percentUsed: number;
}

interface ActiveAlerts {
  orphanedFiles: number;
  pendingConflicts: number;
  storageWarning: boolean;
  storageDetails?: StorageDetails;
  scanErrors: number;
}

interface SystemNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  timestamp: string;
}

/**
 * SystemNotifications Component
 * Muestra notificaciones importantes del sistema en el header
 * Solo visible para usuarios admin
 */
export function SystemNotifications({ token, isAdmin }: SystemNotificationsProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlerts>({});
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Fetch system notifications
  const fetchNotifications = async () => {
    if (!token || !isAdmin) return;

    try {
      const response = await fetch('/api/admin/dashboard/notifications', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setSystemHealth(data.systemHealth);
      setActiveAlerts(data.activeAlerts || {});

      // Construir lista de notificaciones a partir de las alertas
      const newNotifications: SystemNotification[] = [];

      // Storage warnings
      if (data.systemHealth?.storage === 'critical' && data.activeAlerts?.storageDetails) {
        newNotifications.push({
          id: 'storage-critical',
          type: 'error',
          category: 'storage',
          message: `Almacenamiento crítico: ${data.activeAlerts.storageDetails.percentUsed}% usado`,
          timestamp: new Date().toISOString(),
        });
      } else if (data.systemHealth?.storage === 'warning' && data.activeAlerts?.storageDetails) {
        newNotifications.push({
          id: 'storage-warning',
          type: 'warning',
          category: 'storage',
          message: `Almacenamiento alto: ${data.activeAlerts.storageDetails.percentUsed}% usado`,
          timestamp: new Date().toISOString(),
        });
      }

      // Scan errors
      if (data.activeAlerts?.scanErrors && data.activeAlerts.scanErrors > 0) {
        newNotifications.push({
          id: 'scan-errors',
          type: 'error',
          category: 'scanner',
          message: `${data.activeAlerts.scanErrors} errores de escaneo (últimos 7 días)`,
          timestamp: new Date().toISOString(),
        });
      }

      // Pending conflicts
      if (data.activeAlerts?.pendingConflicts && data.activeAlerts.pendingConflicts > 0) {
        newNotifications.push({
          id: 'pending-conflicts',
          type: 'warning',
          category: 'metadata',
          message: `${data.activeAlerts.pendingConflicts} conflictos de metadata pendientes`,
          timestamp: new Date().toISOString(),
        });
      }

      // Orphaned files (solo si son muchos)
      if (data.activeAlerts?.orphanedFiles && data.activeAlerts.orphanedFiles > 50) {
        newNotifications.push({
          id: 'orphaned-files',
          type: 'info',
          category: 'storage',
          message: `${data.activeAlerts.orphanedFiles} archivos huérfanos detectados`,
          timestamp: new Date().toISOString(),
        });
      }

      // Database status
      if (data.systemHealth?.database === 'down') {
        newNotifications.push({
          id: 'db-down',
          type: 'error',
          category: 'database',
          message: 'Base de datos no disponible',
          timestamp: new Date().toISOString(),
        });
      } else if (data.systemHealth?.database === 'degraded') {
        newNotifications.push({
          id: 'db-degraded',
          type: 'warning',
          category: 'database',
          message: 'Base de datos con rendimiento degradado',
          timestamp: new Date().toISOString(),
        });
      }

      // Redis status
      if (data.systemHealth?.redis === 'down') {
        newNotifications.push({
          id: 'redis-down',
          type: 'error',
          category: 'cache',
          message: 'Redis no disponible',
          timestamp: new Date().toISOString(),
        });
      }

      // Scanner status
      if (data.systemHealth?.scanner === 'error') {
        newNotifications.push({
          id: 'scanner-error',
          type: 'error',
          category: 'scanner',
          message: 'Scanner en estado de error',
          timestamp: new Date().toISOString(),
        });
      }

      // Metadata APIs
      if (data.systemHealth?.metadataApis) {
        const apis = data.systemHealth.metadataApis;
        if (apis.lastfm === 'down' || apis.fanart === 'down' || apis.musicbrainz === 'down') {
          const downApis = [];
          if (apis.lastfm === 'down') downApis.push('Last.fm');
          if (apis.fanart === 'down') downApis.push('Fanart.tv');
          if (apis.musicbrainz === 'down') downApis.push('MusicBrainz');

          newNotifications.push({
            id: 'metadata-apis-down',
            type: 'warning',
            category: 'external',
            message: `APIs externas no disponibles: ${downApis.join(', ')}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching system notifications:', error);
    }
  };

  // Initial fetch y polling cada 30 segundos
  useEffect(() => {
    if (!isAdmin) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  /**
   * Obtener ícono según la categoría
   */
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'storage':
        return <HardDrive size={16} />;
      case 'database':
      case 'cache':
        return <Database size={16} />;
      case 'scanner':
      case 'metadata':
        return <FileWarning size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  /**
   * Obtener color según el tipo
   */
  const getTypeColor = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return styles['notifications__item--error'];
      case 'warning':
        return styles['notifications__item--warning'];
      case 'info':
        return styles['notifications__item--info'];
      default:
        return '';
    }
  };

  /**
   * Formatear timestamp relativo
   */
  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  };

  /**
   * Limpiar todas las notificaciones
   */
  const clearAll = () => {
    setNotifications([]);
  };

  // Solo mostrar para admin
  if (!isAdmin) {
    return null;
  }

  const alertCount = notifications.length;

  return (
    <div className={styles.notifications} ref={dropdownRef}>
      {/* Alert Button */}
      <button
        className={styles.notifications__button}
        onClick={() => setShowNotifications(!showNotifications)}
        aria-label={`System notifications (${alertCount} active)`}
        title={`${alertCount} alertas del sistema`}
      >
        <AlertTriangle size={20} />
        {alertCount > 0 && (
          <span className={styles.notifications__badge}>{alertCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {showNotifications && (
        <div className={styles.notifications__dropdown}>
          {/* Header */}
          <div className={styles.notifications__header}>
            <h3 className={styles.notifications__title}>Alertas del Sistema</h3>
            {notifications.length > 0 && (
              <div className={styles.notifications__actions}>
                <button
                  className={styles.notifications__action}
                  onClick={clearAll}
                  title="Limpiar todas"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className={styles.notifications__list}>
            {notifications.length === 0 ? (
              <div className={styles.notifications__empty}>
                <AlertTriangle size={32} className={styles.notifications__emptyIcon} />
                <p className={styles.notifications__emptyText}>
                  Todo funcionando correctamente
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notifications__item} ${getTypeColor(notification.type)}`}
                >
                  {/* Category icon */}
                  <div className={styles.notifications__itemIcon}>
                    {getCategoryIcon(notification.category)}
                  </div>

                  {/* Content */}
                  <div className={styles.notifications__itemContent}>
                    <p className={styles.notifications__itemTitle}>
                      {notification.category.toUpperCase()}
                    </p>
                    <p className={styles.notifications__itemMessage}>
                      {notification.message}
                    </p>
                    <p className={styles.notifications__itemTime}>
                      {getRelativeTime(notification.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
