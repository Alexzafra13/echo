import { useMemo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { getRandomGradient } from '@shared/constants';
import styles from './ActionCard.module.css';

export interface ActionCardProps {
  icon: ReactNode;
  loadingIcon?: ReactNode;
  title: string;
  loadingTitle?: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  useGradient?: boolean;
  customGradient?: [string, string];
  backgroundCoverUrl?: string;
  className?: string;
}

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
      {/* Imagen de fondo con degradado diagonal */}
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
