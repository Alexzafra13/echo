import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Bell,
  Music,
  Disc,
  Check,
  X,
  AlertTriangle,
  Database,
  HardDrive,
  UserPlus,
  UserCheck,
  FileX,
  Radio,
  Settings,
} from 'lucide-react';
import { useClickOutside } from '@shared/hooks';
import { apiClient } from '@shared/services/api';
import { logger } from '@shared/utils/logger';
import {
  useNotificationsList,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteAllNotifications,
  useNotificationSSE,
} from '@features/notifications';
import type { PersistentNotification } from '@features/notifications';
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

/**
 * MetadataNotifications Component
 * Persistent notification bell with dropdown.
 * Uses DB-backed notifications + real-time SSE updates.
 * System alerts (health checks) remain as transient polling.
 */
export function MetadataNotifications({ token, isAdmin }: MetadataNotificationsProps) {
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);

  // Click outside to close
  const {
    ref: dropdownRef,
    isClosing,
    close,
  } = useClickOutside<HTMLDivElement>(() => setShowNotifications(false), {
    enabled: showNotifications,
    animationDuration: 200,
    scrollCloseDelay: 0,
  });

  // Persistent notifications from DB
  const { data: notificationsData } = useNotificationsList({ take: 30 });
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteAll = useDeleteAllNotifications();

  // SSE for real-time updates (invalidates React Query caches)
  useNotificationSSE();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.count || 0;

  // Fetch system health alerts (admin only, transient)
  useEffect(() => {
    if (!isAdmin || !token) return;

    const fetchSystemAlerts = async () => {
      try {
        const response = await apiClient.get('/admin/dashboard/health');
        const data = response.data;
        const alerts: SystemAlert[] = [];

        if (data.systemHealth?.storage === 'critical' && data.activeAlerts?.storageDetails) {
          alerts.push({
            id: 'storage-critical',
            type: 'error',
            category: 'storage',
            message: `Almacenamiento critico: ${data.activeAlerts.storageDetails.percentUsed}% usado`,
            timestamp: new Date().toISOString(),
          });
        }

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

        if (data.activeAlerts?.scanErrors && data.activeAlerts.scanErrors > 20) {
          alerts.push({
            id: 'scan-errors',
            type: 'warning',
            category: 'scanner',
            message: `${data.activeAlerts.scanErrors} errores de escaneo`,
            timestamp: new Date().toISOString(),
          });
        }

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

    fetchSystemAlerts();
    const interval = setInterval(fetchSystemAlerts, 60000);
    return () => clearInterval(interval);
  }, [token, isAdmin]);

  // ============================================
  // Helpers
  // ============================================

  const getIcon = (item: PersistentNotification | SystemAlert) => {
    if ('category' in item) {
      // System alert
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

    // Persistent notification
    switch (item.type) {
      case 'friend_request_received':
        return <UserPlus size={16} />;
      case 'friend_request_accepted':
        return <UserCheck size={16} />;
      case 'scan_completed':
        return <Radio size={16} />;
      case 'enrichment_completed':
        return <Music size={16} />;
      case 'system_alert':
        return <AlertTriangle size={16} />;
      case 'new_content':
        return <Disc size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  const getItemClasses = (item: PersistentNotification | SystemAlert) => {
    const classes = [styles.notifications__item];

    if ('category' in item) {
      // System alert
      if (item.type === 'error') classes.push(styles['notifications__item--error']);
      return classes.join(' ');
    }

    // Persistent notification
    if (!item.isRead) classes.push(styles['notifications__item--unread']);
    if (item.type === 'friend_request_received')
      classes.push(styles['notifications__item--friendRequest']);

    return classes.join(' ');
  };

  const getIconClasses = (item: PersistentNotification | SystemAlert) => {
    const classes = [styles.notifications__itemIcon];
    if (!('category' in item) && item.type === 'friend_request_received') {
      classes.push(styles['notifications__itemIcon--friendRequest']);
    }
    return classes.join(' ');
  };

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

  const handleItemClick = (item: PersistentNotification | SystemAlert) => {
    if ('category' in item && 'link' in item && item.link) {
      const link = item.link;
      close(() => setLocation(link));
      return;
    }

    if (!('category' in item)) {
      // Mark as read on click
      if (!item.isRead) {
        markAsRead.mutate(item.id);
      }

      // Navigate based on type
      if (item.type === 'friend_request_received' || item.type === 'friend_request_accepted') {
        close(() => setLocation('/social'));
      } else if (item.type === 'scan_completed') {
        close(() => setLocation('/admin?tab=scanner'));
      } else if (item.type === 'enrichment_completed') {
        close(() => setLocation('/admin/metadata'));
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  const handleClearAll = () => {
    deleteAll.mutate();
    close();
  };

  // Combine: system alerts (transient) first, then persistent notifications
  const allItems: (PersistentNotification | SystemAlert)[] = [
    ...(isAdmin ? systemAlerts : []),
    ...notifications,
  ];

  const totalBadge = systemAlerts.length + unreadCount;

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
        aria-label={`Notificaciones (${totalBadge})`}
        title={`${totalBadge} notificaciones`}
      >
        <Bell size={20} />
        {totalBadge > 0 && <span className={styles.notifications__badge}>{totalBadge}</span>}
      </button>

      {/* Dropdown */}
      {showNotifications && (
        <div
          className={`${styles.notifications__dropdown} ${isClosing ? styles['notifications__dropdown--closing'] : ''}`}
        >
          {/* Header */}
          <div className={styles.notifications__header}>
            <h3 className={styles.notifications__title}>Notificaciones</h3>
            {allItems.length > 0 && (
              <div className={styles.notifications__actions}>
                {unreadCount > 0 && (
                  <button
                    className={styles.notifications__action}
                    onClick={handleMarkAllRead}
                    title="Marcar todas como leidas"
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
                <button
                  className={styles.notifications__action}
                  onClick={() => {
                    close(() => setLocation('/settings?tab=notifications'));
                  }}
                  title="Preferencias"
                >
                  <Settings size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Notification list */}
          <div className={styles.notifications__list}>
            {allItems.length === 0 ? (
              <div className={styles.notifications__empty}>
                <Bell size={32} className={styles.notifications__emptyIcon} />
                <p className={styles.notifications__emptyText}>No hay notificaciones</p>
              </div>
            ) : (
              allItems.map((item) => {
                const isSystemAlert = 'category' in item;
                const isUnread = isSystemAlert || ('isRead' in item && !item.isRead);

                return (
                  <div
                    key={item.id}
                    className={getItemClasses(item)}
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Icon */}
                    <div className={getIconClasses(item)}>{getIcon(item)}</div>

                    {/* Content */}
                    <div className={styles.notifications__itemContent}>
                      <p className={styles.notifications__itemTitle}>
                        {isSystemAlert ? item.category.toUpperCase() : item.title}
                      </p>
                      <p className={styles.notifications__itemMessage}>{item.message}</p>
                      <p className={styles.notifications__itemTime}>
                        {getRelativeTime(isSystemAlert ? item.timestamp : item.createdAt)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && <div className={styles.notifications__itemUnreadDot} />}
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
