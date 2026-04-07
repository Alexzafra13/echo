import { Clock, Radio, Music2, User, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();

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

    if (diffMins < 1) return t('admin.dashboard.justNow');
    if (diffMins < 60) return t('admin.dashboard.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('admin.dashboard.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('admin.dashboard.daysAgo', { count: diffDays });

    return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      album: t('admin.dashboard.entityAlbum'),
      artist: t('admin.dashboard.entityArtist'),
      radio: t('admin.dashboard.entityRadio'),
    };
    return labels[entityType] || entityType;
  };

  const getMetadataTypeLabel = (metadataType: string) => {
    const labels: Record<string, string> = {
      cover: t('admin.dashboard.metaCover'),
      avatar: t('admin.dashboard.metaAvatar'),
      banner: t('admin.dashboard.metaBanner'),
      favicon: t('admin.dashboard.metaFavicon'),
    };
    return labels[metadataType] || t('admin.dashboard.metaDefault');
  };

  const formatAction = (activity: RecentActivity): string => {
    switch (activity.action) {
      case 'scan':
        return t('admin.dashboard.activityScan');
      case 'login':
        return t('admin.dashboard.activityLogin');
      case 'enrichment': {
        try {
          const data = JSON.parse(activity.details);
          return t('admin.dashboard.activityEnrichment', {
            entityType: getEntityTypeLabel(data.entityType),
          });
        } catch {
          return activity.action;
        }
      }
      default:
        return activity.action;
    }
  };

  const formatDetails = (activity: RecentActivity): string => {
    try {
      const data = JSON.parse(activity.details);
      switch (activity.action) {
        case 'scan':
          return t('admin.dashboard.activityScanDetails', {
            added: data.added,
            updated: data.updated,
            deleted: data.deleted,
          });
        case 'login':
          return t('admin.dashboard.activityLoginDetails', { username: data.username });
        case 'enrichment':
          return t('admin.dashboard.activityEnrichmentDetails', {
            metadataType: getMetadataTypeLabel(data.metadataType),
            entityName: data.entityName,
            provider: data.provider,
          });
        default:
          return activity.details;
      }
    } catch {
      // Fallback for old format (plain text from before the change)
      return activity.details;
    }
  };

  if (activities.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Clock size={20} />
          <div>
            <h3 className={styles.title}>{t('admin.dashboard.recentActivity')}</h3>
            <p className={styles.subtitle}>{t('admin.dashboard.recentActivitySubtitle')}</p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <p>{t('admin.dashboard.noRecentActivity')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Clock size={20} />
        <div>
          <h3 className={styles.title}>{t('admin.dashboard.recentActivity')}</h3>
          <p className={styles.subtitle}>{t('admin.dashboard.recentActivitySubtitle')}</p>
        </div>
      </div>

      <div className={styles.feed}>
        {activities.map((activity) => (
          <div key={activity.id} className={styles.activityItem} data-type={activity.type}>
            <div className={styles.activityIcon}>{getIcon(activity.type)}</div>

            <div className={styles.activityContent}>
              <div className={styles.activityHeader}>
                <span className={styles.activityAction}>{formatAction(activity)}</span>
                <div className={styles.activityStatus}>{getStatusIcon(activity.status)}</div>
              </div>
              <p className={styles.activityDetails}>{formatDetails(activity)}</p>
              <span className={styles.activityTime}>{formatTimestamp(activity.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
