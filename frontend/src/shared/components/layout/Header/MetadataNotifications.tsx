import { useState, useRef, useEffect } from 'react';
import { Bell, Music, Disc, Check, X, AlertTriangle, Database, HardDrive } from 'lucide-react';
import { useMetadataEnrichment } from '@shared/hooks';
import type { EnrichmentNotification } from '@shared/hooks';
import styles from './MetadataNotifications.module.css';

interface MetadataNotificationsProps {
  token: string | null;
  isAdmin: boolean;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning';
  category: 'storage' | 'database' | 'scanner';
  message: string;
  timestamp: string;
}

/**
 * MetadataNotifications Component
 * Muestra notificaciones de enriquecimiento de metadatos + alertas críticas del sistema
 * Solo visible para usuarios admin
 */
export function MetadataNotifications({ token, isAdmin }: MetadataNotificationsProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useMetadataEnrichment(token, isAdmin);

  // Fetch alertas críticas del sistema
  const fetchSystemAlerts = async () => {
    if (!token || !isAdmin) return;

    try {
      const response = await fetch('/api/admin/dashboard/health', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      const alerts: SystemAlert[] = [];

      // Solo storage CRÍTICO (>90%)
      if (data.systemHealth?.storage === 'critical' && data.activeAlerts?.storageDetails) {
        alerts.push({
          id: 'storage-critical',
          type: 'error',
          category: 'storage',
          message: `Almacenamiento crítico: ${data.activeAlerts.storageDetails.percentUsed}% usado`,
          timestamp: new Date().toISOString(),
        });
      }

      // Database/Redis down (crítico)
      if (data.systemHealth?.database === 'down') {
        alerts.push({
          id: 'db-down',
          type: 'error',
          category: 'database',
          message: 'Base de datos no disponible',
          timestamp: new Date().toISOString(),
        });
      }

      if (data.systemHealth?.redis === 'down') {
        alerts.push({
          id: 'redis-down',
          type: 'error',
          category: 'database',
          message: 'Redis no disponible',
          timestamp: new Date().toISOString(),
        });
      }

      // Muchos errores de escaneo (>20 errores)
      if (data.activeAlerts?.scanErrors && data.activeAlerts.scanErrors > 20) {
        alerts.push({
          id: 'scan-errors',
          type: 'warning',
          category: 'scanner',
          message: `${data.activeAlerts.scanErrors} errores de escaneo críticos`,
          timestamp: new Date().toISOString(),
        });
      }

      setSystemAlerts(alerts);
    } catch (error) {
      console.error('Error fetching system alerts:', error);
    }
  };

  // Fetch inicial y polling cada 60 segundos (no tan frecuente)
  useEffect(() => {
    if (!isAdmin) return;

    fetchSystemAlerts();
    const interval = setInterval(fetchSystemAlerts, 60000); // 60s

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Trigger closing animation
        setIsClosing(true);
        closeTimeoutRef.current = setTimeout(() => {
          setShowNotifications(false);
          setIsClosing(false);
        }, 200); // Match animation duration
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [showNotifications]);

  /**
   * Obtener ícono según el tipo
   */
  const getIcon = (item: EnrichmentNotification | SystemAlert) => {
    if ('entityType' in item) {
      // Es EnrichmentNotification
      return item.entityType === 'artist' ? <Music size={16} /> : <Disc size={16} />;
    } else {
      // Es SystemAlert
      switch (item.category) {
        case 'storage':
          return <HardDrive size={16} />;
        case 'database':
          return <Database size={16} />;
        case 'scanner':
          return <AlertTriangle size={16} />;
        default:
          return <AlertTriangle size={16} />;
      }
    }
  };

  /**
   * Obtener título y mensaje según el tipo de notificación
   */
  const getNotificationInfo = (item: EnrichmentNotification | SystemAlert) => {
    if ('entityType' in item) {
      // EnrichmentNotification
      const updates: string[] = [];
      if (item.bioUpdated) updates.push('biografía');
      if (item.imagesUpdated) updates.push('imágenes');
      if (item.coverUpdated) updates.push('portada');

      return {
        title: item.entityName,
        message: `${updates.length > 0 ? updates.join(', ') : 'metadata'} actualizado`,
      };
    } else {
      // SystemAlert
      return {
        title: item.category.toUpperCase(),
        message: item.message,
      };
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
   * Cerrar notificaciones con animación y limpiar
   */
  const handleClearAll = () => {
    clearAll();
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setShowNotifications(false);
      setIsClosing(false);
    }, 200);
  };

  // Solo mostrar para admin (después de todos los hooks)
  if (!isAdmin) {
    return null;
  }

  // Combinar notificaciones: alertas del sistema primero, luego metadata
  const allNotifications = [
    ...systemAlerts,
    ...notifications,
  ];

  // Contar total de notificaciones importantes
  const totalCount = systemAlerts.length + unreadCount;

  return (
    <div className={styles.notifications} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className={styles.notifications__button}
        onClick={() => {
          if (showNotifications) {
            // Si está abierto, cerrar con animación
            setIsClosing(true);
            closeTimeoutRef.current = setTimeout(() => {
              setShowNotifications(false);
              setIsClosing(false);
            }, 200);
          } else {
            // Si está cerrado, abrir
            setShowNotifications(true);
          }
        }}
        aria-label={`Notificaciones (${totalCount})`}
        title={`${totalCount} notificaciones`}
      >
        <Bell size={20} />
        {totalCount > 0 && (
          <span className={styles.notifications__badge}>{totalCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {showNotifications && (
        <div className={`${styles.notifications__dropdown} ${isClosing ? styles['notifications__dropdown--closing'] : ''}`}>
          {/* Header */}
          <div className={styles.notifications__header}>
            <h3 className={styles.notifications__title}>Notificaciones</h3>
            {allNotifications.length > 0 && (
              <div className={styles.notifications__actions}>
                {unreadCount > 0 && (
                  <button
                    className={styles.notifications__action}
                    onClick={markAllAsRead}
                    title="Marcar todas como leídas"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  className={styles.notifications__action}
                  onClick={handleClearAll}
                  title="Limpiar todas"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className={styles.notifications__list}>
            {allNotifications.length === 0 ? (
              <div className={styles.notifications__empty}>
                <Bell size={32} className={styles.notifications__emptyIcon} />
                <p className={styles.notifications__emptyText}>
                  No hay notificaciones
                </p>
              </div>
            ) : (
              allNotifications.map((item) => {
                const info = getNotificationInfo(item);
                const isSystemAlert = 'category' in item;
                const isUnread = 'read' in item ? !item.read : true;

                return (
                  <div
                    key={item.id}
                    className={`${styles.notifications__item} ${
                      isUnread ? styles['notifications__item--unread'] : ''
                    } ${
                      isSystemAlert && item.type === 'error'
                        ? styles['notifications__item--error']
                        : ''
                    }`}
                    onClick={() => !isSystemAlert && isUnread && markAsRead(item.id)}
                  >
                    {/* Icon */}
                    <div className={styles.notifications__itemIcon}>
                      {getIcon(item)}
                    </div>

                    {/* Content */}
                    <div className={styles.notifications__itemContent}>
                      <p className={styles.notifications__itemTitle}>
                        {info.title}
                      </p>
                      <p className={styles.notifications__itemMessage}>
                        {info.message}
                      </p>
                      <p className={styles.notifications__itemTime}>
                        {getRelativeTime(item.timestamp)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {isUnread && (
                      <div className={styles.notifications__itemUnreadDot} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
