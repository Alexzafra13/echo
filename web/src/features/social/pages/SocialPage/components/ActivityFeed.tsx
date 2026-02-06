import { memo, useMemo } from 'react';
import { Activity } from 'lucide-react';
import { getUserAvatarUrl, handleAvatarError } from '@shared/utils/avatar.utils';
import { formatTimeAgo } from '@shared/utils/date.utils';
import { getActionText, getActionIcon, getTargetUrl } from '../../../utils/socialFormatters';
import type { ActivityItem } from '../../../services/social.service';
import styles from '../SocialPage.module.css';

interface ActivityFeedProps {
  activities: ActivityItem[];
  onUserClick: (userId: string) => void;
  onTargetClick: (url: string) => void;
}

interface GroupedActivities {
  label: string;
  items: ActivityItem[];
}

function groupByTime(activities: ActivityItem[]): GroupedActivities[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, ActivityItem[]> = {
    'Hoy': [],
    'Ayer': [],
    'Esta semana': [],
    'Anterior': [],
  };

  for (const activity of activities) {
    const date = new Date(activity.createdAt);
    if (date >= today) {
      groups['Hoy'].push(activity);
    } else if (date >= yesterday) {
      groups['Ayer'].push(activity);
    } else if (date >= weekAgo) {
      groups['Esta semana'].push(activity);
    } else {
      groups['Anterior'].push(activity);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export const ActivityFeed = memo(function ActivityFeed({ activities, onUserClick, onTargetClick }: ActivityFeedProps) {
  const grouped = useMemo(() => groupByTime(activities), [activities]);

  return (
    <section className={styles.feedSection}>
      <h2 className={styles.feedSection__title}>
        <div className={styles.feedSection__titleIcon}>
          <Activity size={18} />
        </div>
        Actividad reciente
      </h2>
      {activities.length > 0 ? (
        <div className={styles.activityList}>
          {grouped.map((group) => (
            <div key={group.label}>
              <div className={styles.activityList__divider}>
                <span>{group.label}</span>
              </div>
              {group.items.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  {/* Left side: Avatar + Content */}
                  <div className={styles.activityItem__left}>
                    <div
                      className={styles.activityItem__avatarWrapper}
                      onClick={() => onUserClick(activity.user.id)}
                    >
                      <img
                        src={activity.user.avatarUrl || getUserAvatarUrl(activity.user.id, false)}
                        alt={activity.user.username}
                        className={styles.activityItem__avatar}
                        loading="lazy"
                        decoding="async"
                        onError={handleAvatarError}
                      />
                      <span className={styles.activityItem__icon}>
                        {getActionIcon(activity.actionType)}
                      </span>
                    </div>
                    <div className={styles.activityItem__content}>
                      {/* Line 1: User + action text */}
                      <div className={styles.activityItem__actionLine}>
                        <span
                          className={styles.activityItem__userLink}
                          onClick={() => onUserClick(activity.user.id)}
                        >
                          {activity.user.name || activity.user.username}
                        </span>
                        {' '}
                        {getActionText(activity.actionType)}
                        {/* For became_friends, show friend inline */}
                        {activity.actionType === 'became_friends' && activity.secondUser && (
                          <>
                            {' '}
                            <span
                              className={styles.activityItem__friendLink}
                              onClick={() => onUserClick(activity.secondUser!.id)}
                            >
                              <img
                                src={activity.secondUser.avatarUrl || getUserAvatarUrl(activity.secondUser.id, false)}
                                alt={activity.secondUser.username}
                                className={styles.activityItem__inlineAvatar}
                                loading="lazy"
                                decoding="async"
                                onError={handleAvatarError}
                              />
                              <span>{activity.secondUser.name || activity.secondUser.username}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Line 2: Target name (for non-friend activities) */}
                      {activity.actionType !== 'became_friends' && (
                        <span
                          className={styles.activityItem__targetLink}
                          onClick={() => {
                            const url = getTargetUrl(activity.targetType, activity.targetId, activity.targetAlbumId);
                            if (url) onTargetClick(url);
                          }}
                        >
                          {activity.targetName}
                        </span>
                      )}

                      {/* Line 3: Timestamp */}
                      <span className={styles.activityItem__time}>
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Cover (for non-friend activities) */}
                  {activity.actionType !== 'became_friends' && (
                    <div
                      className={styles.activityItem__coverWrapper}
                      onClick={() => {
                        const url = getTargetUrl(activity.targetType, activity.targetId, activity.targetAlbumId);
                        if (url) onTargetClick(url);
                      }}
                    >
                      {activity.targetAlbumIds && activity.targetAlbumIds.length > 0 ? (
                        <span className={`${styles.activityItem__cover} ${styles.activityItem__mosaic} ${
                          activity.targetAlbumIds.length === 1 ? styles['activityItem__mosaic--single'] :
                          activity.targetAlbumIds.length === 2 ? styles['activityItem__mosaic--2'] :
                          activity.targetAlbumIds.length === 3 ? styles['activityItem__mosaic--3'] :
                          styles['activityItem__mosaic--4']
                        }`}>
                          {activity.targetAlbumIds.slice(0, 4).map((albumId) => (
                            <img
                              key={albumId}
                              src={`/api/albums/${albumId}/cover`}
                              alt=""
                              className={styles.activityItem__mosaicImg}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ))}
                        </span>
                      ) : activity.targetCoverUrl ? (
                        <img
                          src={activity.targetCoverUrl}
                          alt={activity.targetName}
                          className={styles.activityItem__cover}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.feedSection__empty}>
          <Activity size={36} />
          <p>No hay actividad reciente</p>
          <span>La actividad de tus amigos aparecerá aquí</span>
        </div>
      )}
    </section>
  );
});
