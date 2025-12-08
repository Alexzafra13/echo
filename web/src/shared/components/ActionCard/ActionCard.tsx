import { useMemo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { getRandomGradient } from '@shared/constants';
import styles from './ActionCard.module.css';

export interface ActionCardProps {
  /** Icon to display */
  icon: ReactNode;
  /** Loading icon (defaults to spinning RefreshCw) */
  loadingIcon?: ReactNode;
  /** Title text */
  title: string;
  /** Loading title text */
  loadingTitle?: string;
  /** Click handler */
  onClick: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Use random gradient background (defaults to true) */
  useGradient?: boolean;
  /** Custom gradient colors [from, to] */
  customGradient?: [string, string];
  /** Background cover image URL (appears faded on the right) */
  backgroundCoverUrl?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * ActionCard Component
 * A reusable action button card with gradient background
 * Used for quick actions like shuffle, daily recommendations, social features
 */
export function ActionCard({
  icon,
  loadingIcon,
  title,
  loadingTitle = 'Cargando...',
  onClick,
  isLoading = false,
  disabled = false,
  useGradient = true,
  customGradient,
  backgroundCoverUrl,
  className,
}: ActionCardProps) {
  // Generate gradient on mount
  const gradientStyle = useMemo(() => {
    if (!useGradient) return {};
    if (customGradient) {
      return {
        background: `linear-gradient(135deg, ${customGradient[0]} 0%, ${customGradient[1]} 100%)`,
      };
    }
    return getRandomGradient();
  }, [useGradient, customGradient]);

  const displayIcon = isLoading
    ? (loadingIcon || <RefreshCw size={24} className={styles.actionCard__spinning} />)
    : icon;

  return (
    <button
      className={`${styles.actionCard} ${className || ''}`}
      onClick={onClick}
      disabled={isLoading || disabled}
      style={gradientStyle}
    >
      {/* Background cover image with diagonal fade */}
      {backgroundCoverUrl && (
        <div
          className={styles.actionCard__backgroundCover}
          style={{ backgroundImage: `url(${backgroundCoverUrl})` }}
        />
      )}
      <div className={styles.actionCard__content}>
        <div className={styles.actionCard__icon}>
          {displayIcon}
        </div>
        <div className={styles.actionCard__text}>
          <h3 className={styles.actionCard__title}>
            {isLoading ? loadingTitle : title}
          </h3>
        </div>
      </div>
    </button>
  );
}

export default ActionCard;
