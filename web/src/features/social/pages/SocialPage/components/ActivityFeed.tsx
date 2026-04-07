import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';
import { UserAvatar } from '@shared/components/ui';
import { formatTimeAgo } from '@shared/utils/date.utils';
import { getActionText, getActionIcon, getTargetUrl } from '../../../utils/socialFormatters';
import type { ActivityItem } from '../../../services/social.service';
import styles from './ActivityFeed.module.css';

interface ActivityFeedProps {
  activities: ActivityItem[];
  onUserClick: (userId: string) => void;
  onTargetClick: (url: string) => void;
}

type GroupKey = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

function groupByTime(activities: ActivityItem[]): { key: GroupKey; items: ActivityItem[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<GroupKey, ActivityItem[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  for (const activity of activities) {
    const date = new Date(activity.createdAt);
    if (date >= today) {
      groups.today.push(activity);
    } else if (date >= yesterday) {
      groups.yesterday.push(activity);
    } else if (date >= weekAgo) {
      groups.thisWeek.push(activity);
    } else {
      groups.earlier.push(activity);
    }
  }

  return (Object.entries(groups) as [GroupKey, ActivityItem[]][])
    .filter(([, items]) => items.length > 0)
    .map(([key, items]) => ({ key, items }));
}

export const ActivityFeed = memo(function ActivityFeed({
  activities,
  onUserClick,
  onTargetClick,
}: ActivityFeedProps) {
  const { t } = useTranslation();
  const grouped = useMemo(() => groupByTime(activities), [activities]);

  return (
    <section className={styles.feedSection}>
      <h2 className={styles.feedSection__title}>
        <span className={styles.feedSection__titleIcon}>
          <Activity size={16} />
        </span>
        {t('social.recentActivity')}
      </h2>
      {activities.length > 0 ? (
        <div className={styles.activityList}>
          {grouped.map((group) => (
            <div key={group.key}>
              <div className={styles.activityList__divider}>
                <span>{t(`social.${group.key}`)}</span>
              </div>
              {group.items.map((activity) => {
                const isFriendActivity =
                  activity.actionType === 'became_friends' && activity.secondUser;

                return (
                  <div
                    key={activity.id}
                    className={`${styles.activityItem} ${isFriendActivity ? styles['activityItem--friend'] : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={styles.activityItem__avatarWrapper}
                      onClick={() => onUserClick(activity.user.id)}
                    >
                      <UserAvatar
                        userId={activity.user.id}
                        avatarUrl={activity.user.avatarUrl}
                        username={activity.user.username}
                        className={styles.activityItem__avatar}
                      />
                      <span className={styles.activityItem__icon}>
                        {getActionIcon(activity.actionType)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className={styles.activityItem__content}>
                      <div className={styles.activityItem__actionLine}>
                        <span
                          className={styles.activityItem__userLink}
                          onClick={() => onUserClick(activity.user.id)}
                        >
                          {activity.user.name || activity.user.username}
                        </span>{' '}
                        {getActionText(activity.actionType)}
                        {isFriendActivity && (
                          <>
                            {' '}
                            <span
                              className={styles.activityItem__friendLink}
                              onClick={() => onUserClick(activity.secondUser!.id)}
                            >
                              {activity.secondUser!.name || activity.secondUser!.username}
                            </span>
                          </>
                        )}
                      </div>

                      {!isFriendActivity && activity.targetName && (
                        <span
                          className={styles.activityItem__targetLink}
                          onClick={() => {
                            const url = getTargetUrl(
                              activity.targetType,
                              activity.targetId,
                              activity.targetAlbumId
                            );
                            if (url) onTargetClick(url);
                          }}
                        >
                          {activity.targetName}
                        </span>
                      )}

                      <span className={styles.activityItem__time}>
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>

                    {/* Right side: cover art or friend icon */}
                    {isFriendActivity ? (
                      <div
                        className={styles.activityItem__friendBadge}
                        onClick={() => onUserClick(activity.secondUser!.id)}
                      >
                        <UserAvatar
                          userId={activity.secondUser!.id}
                          avatarUrl={activity.secondUser!.avatarUrl}
                          username={activity.secondUser!.username}
                          className={styles.activityItem__friendAvatar}
                        />
                      </div>
                    ) : (
                      <div
                        className={styles.activityItem__coverWrapper}
                        onClick={() => {
                          const url = getTargetUrl(
                            activity.targetType,
                            activity.targetId,
                            activity.targetAlbumId
                          );
                          if (url) onTargetClick(url);
                        }}
                      >
                        {activity.targetAlbumIds && activity.targetAlbumIds.length > 0 ? (
                          <span
                            className={`${styles.activityItem__cover} ${styles.activityItem__mosaic} ${
                              activity.targetAlbumIds.length === 1
                                ? styles['activityItem__mosaic--single']
                                : activity.targetAlbumIds.length === 2
                                  ? styles['activityItem__mosaic--2']
                                  : activity.targetAlbumIds.length === 3
                                    ? styles['activityItem__mosaic--3']
                                    : styles['activityItem__mosaic--4']
                            }`}
                          >
                            {activity.targetAlbumIds.slice(0, 4).map((albumId) => (
                              <img
                                key={albumId}
                                src={`/api/albums/${albumId}/cover`}
                                alt=""
                                className={styles.activityItem__mosaicImg}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
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
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.feedSection__empty}>
          <Activity size={36} />
          <p>{t('social.noActivity')}</p>
          <span>{t('social.noActivityHint')}</span>
        </div>
      )}
    </section>
  );
});
