import { Clock, Radio, Music2, User, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import styles from './RecentActivityFeed.module.css';

interface RecentActivity {
  id: string;
  type: 'scan' | 'enrichment' | 'user' | 'system';
  action: string;
  details: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

interface RecentActivityFeedProps {
  activities: RecentActivity[];
}

/**
 * RecentActivityFeed Component
 * Muestra un feed de las actividades recientes del sistema
 */
export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'scan':
        return <Radio size={16} />;
      case 'enrichment':
        return <Music2 size={16} />;
      case 'user':
        return <User size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={14} className={styles.iconSuccess} />;
      case 'warning':
        return <AlertCircle size={14} className={styles.iconWarning} />;
      case 'error':
        return <XCircle size={14} className={styles.iconError} />;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins}min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (activities.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Clock size={20} />
          <div>
            <h3 className={styles.title}>Actividad Reciente</h3>
            <p className={styles.subtitle}>Últimas acciones del sistema</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>No hay actividad reciente</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Clock size={20} />
        <div>
          <h3 className={styles.title}>Actividad Reciente</h3>
          <p className={styles.subtitle}>Últimas acciones del sistema</p>
        </div>
      </div>

      <div className={styles.feed}>
        {activities.map((activity) => (
          <div key={activity.id} className={styles.activityItem} data-type={activity.type}>
            <div className={styles.activityIcon}>
              {getIcon(activity.type)}
            </div>

            <div className={styles.activityContent}>
              <div className={styles.activityHeader}>
                <span className={styles.activityAction}>{activity.action}</span>
                <div className={styles.activityStatus}>
                  {getStatusIcon(activity.status)}
                </div>
              </div>
              <p className={styles.activityDetails}>{activity.details}</p>
              <span className={styles.activityTime}>{formatTimestamp(activity.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
