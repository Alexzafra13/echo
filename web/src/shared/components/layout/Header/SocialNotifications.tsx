import { useLocation } from 'wouter';
import { Users } from 'lucide-react';
import { usePendingRequests } from '@features/social/hooks';
import styles from './SocialNotifications.module.css';

/**
 * SocialNotifications Component
 * Shows a badge with pending friend request count
 * Available for all authenticated users
 */
export function SocialNotifications() {
  const [, setLocation] = useLocation();
  const { data: pendingRequests } = usePendingRequests();

  const count = pendingRequests?.count || 0;

  return (
    <button
      className={styles.socialNotifications}
      onClick={() => setLocation('/social')}
      aria-label={`Social${count > 0 ? ` (${count} solicitudes pendientes)` : ''}`}
      title={count > 0 ? `${count} solicitudes de amistad` : 'Social'}
    >
      <Users size={20} />
      {count > 0 && (
        <span className={styles.socialNotifications__badge}>{count}</span>
      )}
    </button>
  );
}
