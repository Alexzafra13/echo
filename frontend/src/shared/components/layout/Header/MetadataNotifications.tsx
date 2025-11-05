import { useState, useRef, useEffect } from 'react';
import { Bell, Music, Disc, Check, X } from 'lucide-react';
import { useMetadataEnrichment } from '@shared/hooks';
import type { EnrichmentNotification } from '@shared/hooks';
import styles from './MetadataNotifications.module.css';

interface MetadataNotificationsProps {
  token: string | null;
  isAdmin: boolean;
}

/**
 * MetadataNotifications Component
 * Muestra notificaciones de enriquecimiento de metadatos en el header
 * Solo visible para usuarios admin
 */
export function MetadataNotifications({ token, isAdmin }: MetadataNotificationsProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useMetadataEnrichment(token, isAdmin);

  // Solo mostrar para admin
  if (!isAdmin) {
    return null;
  }

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

  /**
   * Obtener ícono según el tipo de entidad
   */
  const getEntityIcon = (type: 'artist' | 'album') => {
    return type === 'artist' ? <Music size={16} /> : <Disc size={16} />;
  };

  /**
   * Formatear mensaje de actualizaciones
   */
  const getUpdateMessage = (notification: EnrichmentNotification): string => {
    const updates: string[] = [];
    if (notification.bioUpdated) updates.push('biografía');
    if (notification.imagesUpdated) updates.push('imágenes');
    if (notification.coverUpdated) updates.push('portada');

    return updates.length > 0 ? updates.join(', ') : 'metadata';
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

  return (
    <div className={styles.notifications} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className={styles.notifications__button}
        onClick={() => setShowNotifications(!showNotifications)}
        aria-label={`Notifications (${unreadCount} unread)`}
        title={`${unreadCount} notificaciones sin leer`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.notifications__badge}>{unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {showNotifications && (
        <div className={styles.notifications__dropdown}>
          {/* Header */}
          <div className={styles.notifications__header}>
            <h3 className={styles.notifications__title}>Metadata Updates</h3>
            {notifications.length > 0 && (
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
                <Bell size={32} className={styles.notifications__emptyIcon} />
                <p className={styles.notifications__emptyText}>
                  No hay notificaciones nuevas
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notifications__item} ${
                    !notification.read ? styles['notifications__item--unread'] : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  {/* Entity icon */}
                  <div className={styles.notifications__itemIcon}>
                    {getEntityIcon(notification.entityType)}
                  </div>

                  {/* Content */}
                  <div className={styles.notifications__itemContent}>
                    <p className={styles.notifications__itemTitle}>
                      {notification.entityName}
                    </p>
                    <p className={styles.notifications__itemMessage}>
                      {getUpdateMessage(notification)} actualizado
                    </p>
                    <p className={styles.notifications__itemTime}>
                      {getRelativeTime(notification.timestamp)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className={styles.notifications__itemUnreadDot} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
