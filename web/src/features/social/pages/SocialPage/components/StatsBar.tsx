import { Users, Clock, Headphones, Activity } from 'lucide-react';
import styles from '../SocialPage.module.css';

interface StatsBarProps {
  friendsCount: number;
  pendingCount: number;
  listeningCount: number;
  activityCount: number;
}

export function StatsBar({ friendsCount, pendingCount, listeningCount, activityCount }: StatsBarProps) {
  return (
    <div className={styles.statsBar}>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon}>
          <Users size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{friendsCount}</span>
          <span className={styles.statItem__label}>Amigos</span>
        </div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon} data-active={pendingCount > 0}>
          <Clock size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{pendingCount}</span>
          <span className={styles.statItem__label}>Pendientes</span>
        </div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon} data-listening={listeningCount > 0}>
          <Headphones size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{listeningCount}</span>
          <span className={styles.statItem__label}>Escuchando</span>
        </div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statItem__icon}>
          <Activity size={20} />
        </div>
        <div className={styles.statItem__info}>
          <span className={styles.statItem__value}>{activityCount}</span>
          <span className={styles.statItem__label}>Actividad</span>
        </div>
      </div>
    </div>
  );
}
