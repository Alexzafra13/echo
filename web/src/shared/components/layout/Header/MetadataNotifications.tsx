import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Bell, Music, Disc, Check, X, AlertTriangle, Database, HardDrive, UserPlus, FileX } from 'lucide-react';
import { useMetadataEnrichment } from '@shared/hooks';
import { useSystemHealthSSE } from '@shared/hooks/useSystemHealthSSE';
import { usePendingRequests } from '@features/social/hooks';
import type { EnrichmentNotification } from '@shared/hooks';
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
 * - Solo admin: alertas del sistema (via SSE) + enriquecimiento de metadatos
 */
export function MetadataNotifications({ token, isAdmin }: MetadataNotificationsProps) {
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Metadata enrichment notifications (admin only)
  const {
    notifications: metadataNotifications,
    unreadCount: metadataUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useMetadataEnrichment(token, isAdmin);

  // System health via SSE (admin only)
  const { systemHealth, activeAlerts } = useSystemHealthSSE(token, isAdmin);

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
      timestamp: new Date().toISOString(),
    })) || [];

  // Convert system health to alerts (computed from SSE data)
  const systemAlerts = useMemo<SystemAlert[]>(() => {
    if (!systemHealth || !activeAlerts) return [];

    const alerts: SystemAlert[] = [];
    const now = new Date().toISOString();

    // Solo storage CRÍTICO (>90%)
    if (systemHealth.storage === 'critical' && activeAlerts.storageDetails) {
      alerts.push({
        id: 'storage-critical',
        type: 'error',
        category: 'storage',
        message: `Almacenamiento crítico: ${activeAlerts.storageDetails.percentUsed}% usado`,
        timestamp: now,
      });
    }

    // Database/Redis down (crítico)
    if (systemHealth.database === 'down') {
      alerts.push({
        id: 'db-down',
        type: 'error',
        category: 'database',
        message: 'Base de datos no disponible',
        timestamp: now,
      });
    }

    if (systemHealth.redis === 'down') {
      alerts.push({
        id: 'redis-down',
        type: 'error',
        category: 'database',
        message: 'Redis no disponible',
        timestamp: now,
      });
    }

    // Muchos errores de escaneo (>20 errores)
    if (activeAlerts.scanErrors && activeAlerts.scanErrors > 20) {
      alerts.push({
        id: 'scan-errors',
        type: 'warning',
        category: 'scanner',
        message: `${activeAlerts.scanErrors} errores de escaneo críticos`,
        timestamp: now,
      });
    }

    // Archivos desaparecidos
    if (activeAlerts.missingFiles && activeAlerts.missingFiles > 0) {
      alerts.push({
        id: 'missing-files',
        type: 'warning',
        category: 'missing',
        message: `${activeAlerts.missingFiles} archivo${activeAlerts.missingFiles > 1 ? 's' : ''} desaparecido${activeAlerts.missingFiles > 1 ? 's' : ''}`,
        timestamp: now,
        link: '/admin?tab=maintenance',
      });
    }

    return alerts;
  }, [systemHealth, activeAlerts]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsClosing(true);
        closeTimeoutRef.current = setTimeout(() => {
          setShowNotifications(false);
          setIsClosing(false);
        }, 200);
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
      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        setShowNotifications(false);
        setIsClosing(false);
        setLocation('/social');
      }, 200);
    } else if ('link' in item && item.link) {
      // Navigate to linked page (e.g., missing files)
      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        setShowNotifications(false);
        setIsClosing(false);
        setLocation(item.link!);
      }, 200);
    } else if ('entityType' in item && 'read' in item && !item.read) {
      markAsRead(item.id);
    }
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
            setIsClosing(true);
            closeTimeoutRef.current = setTimeout(() => {
              setShowNotifications(false);
              setIsClosing(false);
            }, 200);
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
