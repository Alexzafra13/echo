import { useState, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useClickOutside } from '@shared/hooks';
import { useSystemHealth } from '@shared/hooks/useSystemHealth';
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
export function MetadataNotifications({ isAdmin }: MetadataNotificationsProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Derive system alerts from shared health data
  const { data: healthData } = useSystemHealth();

  const systemAlerts = useMemo(() => {
    if (!isAdmin || !healthData) return [];

    const alerts: SystemAlert[] = [];
    const { systemHealth, activeAlerts } = healthData;

    if (systemHealth?.storage === 'critical' && activeAlerts?.storageDetails) {
      alerts.push({
        id: 'storage-critical',
        type: 'error',
        category: 'storage',
        message: t('notifications.storageCritical', {
          percent: activeAlerts.storageDetails.percentUsed,
        }),
        timestamp: new Date().toISOString(),
      });
    }

    if (systemHealth?.database === 'down') {
      alerts.push({
        id: 'db-down',
        type: 'error',
        category: 'database',
        message: t('notifications.databaseDown'),
        timestamp: new Date().toISOString(),
      });
    }

    if (systemHealth?.redis === 'down') {
      alerts.push({
        id: 'redis-down',
        type: 'error',
        category: 'database',
        message: t('notifications.redisDown'),
        timestamp: new Date().toISOString(),
      });
    }

    if (activeAlerts?.scanErrors && activeAlerts.scanErrors > 20) {
      alerts.push({
        id: 'scan-errors',
        type: 'warning',
        category: 'scanner',
        message: t('notifications.scanErrors', { count: activeAlerts.scanErrors }),
        timestamp: new Date().toISOString(),
      });
    }

    if (activeAlerts?.missingFiles && activeAlerts.missingFiles > 0) {
      alerts.push({
        id: 'missing-files',
        type: 'warning',
        category: 'missing',
        message: t('notifications.missingFiles', { count: activeAlerts.missingFiles }),
        timestamp: new Date().toISOString(),
        link: '/admin?tab=maintenance',
      });
    }

    return alerts;
  }, [healthData, isAdmin, t]);

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
      case 'session_invite':
        return <Music size={16} />;
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

    if (diffMins < 1) return t('notifications.timeNow');
    if (diffMins < 60) return t('notifications.timeMinutes', { count: diffMins });

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('notifications.timeHours', { count: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    return t('notifications.timeDays', { count: diffDays });
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
      } else if (
        (item.type === 'session_invite' || item.type === 'new_content') &&
        item.data?.inviteCode
      ) {
        close(() => setLocation(`/join/${item.data!.inviteCode}`));
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
        aria-label={t('notifications.bellAriaLabel', { count: totalBadge })}
        title={t('notifications.bellTitle', { count: totalBadge })}
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
            <h3 className={styles.notifications__title}>{t('notifications.title')}</h3>
            {allItems.length > 0 && (
              <div className={styles.notifications__actions}>
                {unreadCount > 0 && (
                  <button
                    className={styles.notifications__action}
                    onClick={handleMarkAllRead}
                    title={t('notifications.markAllRead')}
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  className={styles.notifications__action}
                  onClick={handleClearAll}
                  title={t('notifications.clearAll')}
                >
                  <X size={16} />
                </button>
                <button
                  className={styles.notifications__action}
                  onClick={() => {
                    close(() => setLocation('/settings?tab=notifications'));
                  }}
                  title={t('notifications.preferences')}
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
                <p className={styles.notifications__emptyText}>{t('notifications.empty')}</p>
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
