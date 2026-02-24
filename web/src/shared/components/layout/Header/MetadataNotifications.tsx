import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Bell, Music, Disc, Check, X, AlertTriangle, Database, HardDrive, UserPlus, FileX } from 'lucide-react';
import { useMetadataEnrichment, useClickOutside } from '@shared/hooks';
import { usePendingRequests } from '@features/social/hooks';
import { apiClient } from '@shared/services/api';
import type { EnrichmentNotification } from '@shared/hooks';
import { logger } from '@shared/utils/logger';
import styles from './MetadataNotifications.module.css';

interface MetadataNotificationsProps {
  token: string | null;
  isAdmin: boolean;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning';
  category: 'storage' | 'database' | 'scanner' | 'missing';
  message: string;
  timestamp: string;
  link?: string;
}

interface FriendRequestNotification {
  id: string;
  type: 'friend_request';
  friendshipId: string;
  userId: string;
  username: string;
  name: string | null;
  timestamp: string;
}

type NotificationItem = EnrichmentNotification | SystemAlert | FriendRequestNotification;

/**
 * MetadataNotifications Component
 * Muestra notificaciones:
 * - Para todos: solicitudes de amistad
 * - Solo admin: alertas del sistema + enriquecimiento de metadatos
 */
export function MetadataNotifications({ token, isAdmin }: MetadataNotificationsProps) {
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);

  // Use hook for click outside and scroll close
  const { ref: dropdownRef, isClosing, close } = useClickOutside<HTMLDivElement>(
    () => setShowNotifications(false),
    { enabled: showNotifications, animationDuration: 200 }
  );

  // Metadata enrichment notifications (admin only)
  const {
    notifications: metadataNotifications,
    unreadCount: metadataUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useMetadataEnrichment(token, isAdmin);

  // Friend request notifications (all users)
  const { data: pendingRequests } = usePendingRequests();

  // Convert pending requests to notifications
  const friendRequestNotifications: FriendRequestNotification[] =
    pendingRequests?.received.map((request) => ({
      id: `friend-request-${request.friendshipId}`,
      type: 'friend_request' as const,
      friendshipId: request.friendshipId,
      userId: request.id,
      username: request.username,
      name: request.name,
      timestamp: request.friendsSince || new Date().toISOString(),
    })) || [];

  // Fetch alertas críticas del sistema (admin only)
  const fetchSystemAlerts = async () => {
    if (!token || !isAdmin) return;

    try {
      const response = await apiClient.get('/admin/dashboard/health');
      const data = response.data;
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

      // Archivos desaparecidos
      if (data.activeAlerts?.missingFiles && data.activeAlerts.missingFiles > 0) {
        alerts.push({
          id: 'missing-files',
          type: 'warning',
          category: 'missing',
          message: `${data.activeAlerts.missingFiles} archivo${data.activeAlerts.missingFiles > 1 ? 's' : ''} desaparecido${data.activeAlerts.missingFiles > 1 ? 's' : ''}`,
          timestamp: new Date().toISOString(),
          link: '/admin?tab=maintenance',
        });
      }

      setSystemAlerts(alerts);
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error fetching system alerts:', error);
      }
    }
  };

  // Fetch inicial y polling cada 60 segundos (admin only)
  useEffect(() => {
    if (!isAdmin) return;

    fetchSystemAlerts();
    const interval = setInterval(fetchSystemAlerts, 60000); // 60s

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);


  /**
   * Obtener ícono según el tipo
   */
  const getIcon = (item: NotificationItem) => {
    if ('type' in item && item.type === 'friend_request') {
      return <UserPlus size={16} />;
    }
    if ('entityType' in item) {
      return item.entityType === 'artist' ? <Music size={16} /> : <Disc size={16} />;
    }
    if ('category' in item) {
      switch (item.category) {
        case 'storage':
          return <HardDrive size={16} />;
        case 'database':
          return <Database size={16} />;
        case 'scanner':
          return <AlertTriangle size={16} />;
        case 'missing':
          return <FileX size={16} />;
        default:
          return <AlertTriangle size={16} />;
      }
    }
    return <Bell size={16} />;
  };

  /**
   * Obtener título y mensaje según el tipo de notificación
   */
  const getNotificationInfo = (item: NotificationItem) => {
    if ('type' in item && item.type === 'friend_request') {
      return {
        title: item.name || item.username,
        message: 'te ha enviado una solicitud de amistad',
      };
    }
    if ('entityType' in item) {
      const updates: string[] = [];
      if (item.bioUpdated) updates.push('biografía');
      if (item.imagesUpdated) updates.push('imágenes');
      if (item.coverUpdated) updates.push('portada');

      return {
        title: item.entityName,
        message: `${updates.length > 0 ? updates.join(', ') : 'metadata'} actualizado`,
      };
    }
    if ('category' in item) {
      return {
        title: item.category.toUpperCase(),
        message: item.message,
      };
    }
    return { title: '', message: '' };
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
   * Manejar click en notificación
   */
  const handleNotificationClick = (item: NotificationItem) => {
    if ('type' in item && item.type === 'friend_request') {
      // Navigate to social page
      close(() => setLocation('/social'));
    } else if ('link' in item && item.link) {
      // Navigate to linked page (e.g., missing files)
      const link = item.link;
      close(() => setLocation(link));
    } else if ('entityType' in item && 'read' in item && !item.read) {
      markAsRead(item.id);
    }
  };

  /**
   * Cerrar notificaciones con animación y limpiar
   */
  const handleClearAll = () => {
    clearAll();
    close();
  };

  // Combinar notificaciones: solicitudes de amistad primero, luego alertas del sistema, luego metadata
  const allNotifications: NotificationItem[] = [
    ...friendRequestNotifications,
    ...(isAdmin ? systemAlerts : []),
    ...(isAdmin ? metadataNotifications : []),
  ];

  // Contar total de notificaciones importantes
  const friendRequestCount = friendRequestNotifications.length;
  const adminNotificationCount = isAdmin ? (systemAlerts.length + metadataUnreadCount) : 0;
  const totalCount = friendRequestCount + adminNotificationCount;

  return (
    <div className={styles.notifications} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className={styles.notifications__button}
        onClick={() => {
          if (showNotifications) {
            close();
          } else {
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
            {allNotifications.length > 0 && isAdmin && (
              <div className={styles.notifications__actions}>
                {metadataUnreadCount > 0 && (
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
                const isFriendRequest = 'type' in item && item.type === 'friend_request';
                const isSystemAlert = 'category' in item;
                const isUnread = 'read' in item ? !item.read : true;

                return (
                  <div
                    key={item.id}
                    className={`${styles.notifications__item} ${
                      isUnread ? styles['notifications__item--unread'] : ''
                    } ${
                      isSystemAlert && 'type' in item && item.type === 'error'
                        ? styles['notifications__item--error']
                        : ''
                    } ${
                      isFriendRequest ? styles['notifications__item--friendRequest'] : ''
                    }`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    {/* Icon */}
                    <div className={`${styles.notifications__itemIcon} ${
                      isFriendRequest ? styles['notifications__itemIcon--friendRequest'] : ''
                    }`}>
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
