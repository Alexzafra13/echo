import { useTranslation } from 'react-i18next';
import { Users, Clock, Headphones, Activity } from 'lucide-react';
import styles from '../SocialPage.module.css';

interface StatsBarProps {
  friendsCount: number;
  pendingCount: number;
  listeningCount: number;
  activityCount: number;
}

export function StatsBar({
  friendsCount,
  pendingCount,
  listeningCount,
  activityCount,
}: StatsBarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.statsBar}>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon}>
          <Users size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{friendsCount}</span>
          <span className={styles.statItem__label}>{t('social.friends')}</span>
        </div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon} data-active={pendingCount > 0}>
          <Clock size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{pendingCount}</span>
          <span className={styles.statItem__label}>{t('social.pending')}</span>
        </div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon} data-listening={listeningCount > 0}>
          <Headphones size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{listeningCount}</span>
          <span className={styles.statItem__label}>{t('social.listening')}</span>
        </div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon}>
          <Activity size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{activityCount}</span>
          <span className={styles.statItem__label}>{t('social.activity')}</span>
        </div>
      </div>
    </div>
  );
}
