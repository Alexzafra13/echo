import { Music, Disc, Users, Tag, Clock, HardDrive, Film, TrendingUp } from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon: 'music' | 'disc' | 'users' | 'tag' | 'clock' | 'hard-drive' | 'film';
}

const iconMap = {
  music: Music,
  disc: Disc,
  users: Users,
  tag: Tag,
  clock: Clock,
  'hard-drive': HardDrive,
  film: Film,
};

/**
 * StatCard Component
 * Tarjeta para mostrar una estadística individual del dashboard
 */
export function StatCard({ title, value, subtitle, change, changeLabel, icon }: StatCardProps) {
  const Icon = iconMap[icon];

  return (
    <div className={styles.card} data-variant={icon}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <div className={styles.iconContainer}>
          <Icon size={20} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.value}>{value}</div>

        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}

        {change !== undefined && change > 0 && (
          <div className={styles.change}>
            <TrendingUp size={14} />
            <span>
              +{change} {changeLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
