import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Bell, Music, Disc, Check, X, AlertTriangle, Database, HardDrive, UserPlus, UserCheck, FileX, Download } from 'lucide-react';
import { useMetadataEnrichment, useClickOutside } from '@shared/hooks';
import { useSystemHealthSSE } from '@shared/hooks/useSystemHealthSSE';
import { usePendingRequests, useSocialNotificationsSSE, SocialNotification } from '@features/social/hooks';
import { useAlbumImportSSE, AlbumImportProgressEvent } from '@features/federation/hooks/useAlbumImportSSE';
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

interface FriendRequestAcceptedNotification {
  id: string;
  type: 'friend_request_accepted';
  friendshipId: string;
  userId: string;
  username: string;
  name: string | null;
  timestamp: string;
}

interface AlbumImportNotification {
  id: string;
  type: 'album_import';
  importId: string;
  albumName: string;
  artistName: string;
  status: 'downloading' | 'completed' | 'failed';
  progress: number;
  currentTrack: number;
  totalTracks: number;
  error?: string;
  timestamp: string;
}

type NotificationItem = EnrichmentNotification | SystemAlert | FriendRequestNotification | FriendRequestAcceptedNotification | AlbumImportNotification;

/**
 * MetadataNotifications Component
 * Muestra notificaciones:
 * - Para todos: solicitudes de amistad (via SSE en tiempo real)
 * - Solo admin: alertas del sistema (via SSE) + enriquecimiento de metadatos
 */
export function MetadataNotifications({ token, isAdmin }: MetadataNotificationsProps) {
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [acceptedNotifications, setAcceptedNotifications] = useState<FriendRequestAcceptedNotification[]>([]);

  // Click outside handler with scroll support
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

  // System health via SSE (admin only)
  const { systemHealth, activeAlerts } = useSystemHealthSSE(token, isAdmin);

  // Friend request notifications (all users) - for initial data
  const { data: pendingRequests } = usePendingRequests();

  // Real-time social notifications via SSE
  const handleSocialNotification = useCallback((notification: SocialNotification) => {
    if (notification.type === 'friend_request:accepted') {
      // Add "friend request accepted" notification
      const newNotification: FriendRequestAcceptedNotification = {
        id: `accepted-${notification.data.friendshipId}-${Date.now()}`,
        type: 'friend_request_accepted',
        friendshipId: notification.data.friendshipId,
        userId: notification.data.acceptedByUserId,
        username: notification.data.acceptedByUsername,
        name: notification.data.acceptedByName,
        timestamp: notification.data.timestamp,
      };
      setAcceptedNotifications((prev) => [newNotification, ...prev].slice(0, 5));
    }
    // friend_request:received is handled by usePendingRequests invalidation (automatic via SSE hook)
  }, []);

  useSocialNotificationsSSE(handleSocialNotification);

  // Album import notifications via SSE (all users)
  const [importNotifications, setImportNotifications] = useState<AlbumImportNotification[]>([]);

  const handleImportNotification = useCallback((event: { type: string; data: AlbumImportProgressEvent }) => {
    const importNotif: AlbumImportNotification = {
      id: `import-${event.data.importId}`,
      type: 'album_import',
      importId: event.data.importId,
      albumName: event.data.albumName,
      artistName: event.data.artistName,
      status: event.data.status,
      progress: event.data.progress,
      currentTrack: event.data.currentTrack,
      totalTracks: event.data.totalTracks,
      error: event.data.error,
      timestamp: new Date().toISOString(),
    };

    setImportNotifications((prev) => {
      // Update existing or add new
      const existing = prev.findIndex((n) => n.importId === event.data.importId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = importNotif;
        // Remove completed/failed after 10 seconds
        if (importNotif.status === 'completed' || importNotif.status === 'failed') {
          setTimeout(() => {
            setImportNotifications((current) =>
              current.filter((n) => n.importId !== event.data.importId)
            );
          }, 10000);
        }
        return updated;
      }
      return [importNotif, ...prev].slice(0, 5);
    });
  }, []);

  useAlbumImportSSE(handleImportNotification);

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

  /**
   * Obtener ícono según el tipo
   */
  const getIcon = (item: NotificationItem) => {
    if ('type' in item && item.type === 'friend_request') {
      return <UserPlus size={16} />;
    }
    if ('type' in item && item.type === 'friend_request_accepted') {
      return <UserCheck size={16} />;
    }
    if ('type' in item && item.type === 'album_import') {
      if (item.status === 'completed') {
        return <Check size={16} />;
      }
      if (item.status === 'failed') {
        return <AlertTriangle size={16} />;
      }
      return <Download size={16} />;
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
    if ('type' in item && item.type === 'friend_request_accepted') {
      return {
        title: item.name || item.username,
        message: 'ha aceptado tu solicitud de amistad',
      };
    }
    if ('type' in item && item.type === 'album_import') {
      const statusMessages = {
        downloading: `Descargando... ${item.currentTrack}/${item.totalTracks} tracks (${item.progress}%)`,
        completed: 'Importación completada',
        failed: item.error || 'Error en la importación',
      };
      return {
        title: `${item.artistName} - ${item.albumName}`,
        message: statusMessages[item.status],
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
    if ('type' in item && (item.type === 'friend_request' || item.type === 'friend_request_accepted')) {
      // Navigate to social page
      close(() => setLocation('/social'));
      // Clear accepted notification if clicked
      if (item.type === 'friend_request_accepted') {
        setAcceptedNotifications((prev) => prev.filter((n) => n.id !== item.id));
      }
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

  // Combinar notificaciones: importaciones primero, aceptadas, solicitudes, alertas del sistema, metadata
  const allNotifications: NotificationItem[] = [
    ...importNotifications,
    ...acceptedNotifications,
    ...friendRequestNotifications,
    ...(isAdmin ? systemAlerts : []),
    ...(isAdmin ? metadataNotifications : []),
  ];

  // Contar total de notificaciones importantes
  const importNotificationCount = importNotifications.length;
  const socialNotificationCount = friendRequestNotifications.length + acceptedNotifications.length;
  const adminNotificationCount = isAdmin ? (systemAlerts.length + metadataUnreadCount) : 0;
  const totalCount = importNotificationCount + socialNotificationCount + adminNotificationCount;

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
                const isFriendAccepted = 'type' in item && item.type === 'friend_request_accepted';
                const isSocialNotification = isFriendRequest || isFriendAccepted;
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
                      isSocialNotification ? styles['notifications__item--friendRequest'] : ''
                    }`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    {/* Icon */}
                    <div className={`${styles.notifications__itemIcon} ${
                      isSocialNotification ? styles['notifications__itemIcon--friendRequest'] : ''
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
